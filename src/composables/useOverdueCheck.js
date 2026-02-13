import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'

export function useOverdueCheck() {
  const processing = ref(false)
  const updatedCount = ref(0)

  /**
   * Check and update overdue rentals
   * Only updates rentals with status 'approved' that have passed their due date
   * Idempotent - won't update already marked as overdue
   */
  const checkAndUpdateOverdue = async () => {
    if (processing.value) return // Prevent concurrent executions
    
    processing.value = true
    updatedCount.value = 0

    try {
      const now = new Date().toISOString()
      
      // Fetch only approved rentals that are past due date
      const { data: overdueRentals, error: fetchError } = await supabase
        .from('rental_requests')
        .select('id, due_date, user_id')
        .eq('status', 'approved')
        .lt('due_date', now)
        .is('return_date', null)
      
      if (fetchError) {
        console.error('Error fetching overdue rentals:', fetchError)
        return { success: false, error: fetchError }
      }

      if (!overdueRentals || overdueRentals.length === 0) {
        return { success: true, updated: 0 }
      }

      // Update each overdue rental
      const updates = overdueRentals.map(rental => 
        supabase
          .from('rental_requests')
          .update({
            status: 'overdue',
            updated_at: now
          })
          .eq('id', rental.id)
          .eq('status', 'approved') // Double-check status hasn't changed
      )

      const results = await Promise.all(updates)
      
      // Count successful updates
      updatedCount.value = results.filter(result => !result.error).length
      
      return {
        success: true,
        updated: updatedCount.value,
        total: overdueRentals.length
      }
    } catch (error) {
      console.error('Error in checkAndUpdateOverdue:', error)
      return { success: false, error }
    } finally {
      processing.value = false
    }
  }

  /**
   * Get count of overdue rentals without updating
   */
  const getOverdueCount = async (userId = null) => {
    try {
      const now = new Date().toISOString()
      
      let query = supabase
        .from('rental_requests')
        .select('id', { count: 'exact', head: true })
        .or('status.eq.overdue,status.eq.approved')
        .lt('due_date', now)
        .is('return_date', null)
      
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      const { count, error } = await query
      
      if (error) {
        console.error('Error getting overdue count:', error)
        return 0
      }
      
      return count || 0
    } catch (error) {
      console.error('Error in getOverdueCount:', error)
      return 0
    }
  }

  /**
   * Calculate overdue penalty fee
   */
  const calculateOverdueFee = (dueDate, itemCount = 1) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = now - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 0) return 0
    
    // $20 per day per item
    return diffDays * 20 * itemCount
  }

  /**
   * Get overdue days
   */
  const getOverdueDays = (dueDate) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = now - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays > 0 ? diffDays : 0
  }

  return {
    processing,
    updatedCount,
    checkAndUpdateOverdue,
    getOverdueCount,
    calculateOverdueFee,
    getOverdueDays
  }
}

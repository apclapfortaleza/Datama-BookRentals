import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'

const STORAGE_KEY = 'rental_notifications_read'

export function useNotifications() {
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)
  
  let realtimeSubscription = null

  const getReadNotifications = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const saveReadNotification = (notificationId) => {
    try {
      const readIds = getReadNotifications()
      if (!readIds.includes(notificationId)) {
        readIds.push(notificationId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds))
      }
    } catch (error) {
      console.error('Error saving read state:', error)
    }
  }

  const fetchNotifications = async (userId) => {
    if (!userId) return
    
    loading.value = true
    try {
      const readIds = getReadNotifications()
      
      // Fetch user's rental requests with status changes and full details
      const { data: rentals } = await supabase
        .from('rental_requests')
        .select(`
          id, 
          status, 
          created_at, 
          updated_at, 
          total_price, 
          due_date,
          rental_items (
            book_id,
            quantity,
            days_count
          )
        `)
        .eq('user_id', userId)
        .in('status', ['approved', 'rejected', 'overdue'])
        .order('updated_at', { ascending: false })
        .limit(20)
      
      if (rentals && rentals.length > 0) {
        // Fetch book details for all rentals
        const allItems = rentals.flatMap(r => r.rental_items || [])
        const bookIds = [...new Set(allItems.map(i => i.book_id).filter(Boolean))]
        
        let booksMap = {}
        if (bookIds.length > 0) {
          const { data: books } = await supabase
            .from('books')
            .select('id, title, author')
            .in('id', bookIds)
          
          if (books) {
            booksMap = books.reduce((acc, book) => {
              acc[book.id] = book
              return acc
            }, {})
          }
        }
        
        notifications.value = rentals.map(rental => {
          const items = rental.rental_items || []
          const booksInfo = items.map(item => ({
            ...item,
            book: booksMap[item.book_id]
          }))
          
          return {
            id: rental.id,
            type: rental.status,
            message: getNotificationMessage(rental.status, booksInfo, rental),
            timestamp: rental.updated_at || rental.created_at,
            rentalId: rental.id,
            read: readIds.includes(rental.id),
            books: booksInfo,
            totalPrice: rental.total_price,
            dueDate: rental.due_date
          }
        }).filter(n => !n.read) // Only show unread notifications
        
        unreadCount.value = notifications.value.length
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      loading.value = false
    }
  }

  const getNotificationMessage = (status, booksInfo = [], rental = {}) => {
    const bookCount = booksInfo.length
    const firstBook = booksInfo[0]?.book?.title || 'book'
    const totalPrice = rental.totalPrice || 0
    const dueDate = rental.dueDate ? new Date(rental.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    
    const messages = {
      approved: `✓ Rental approved - $${totalPrice.toFixed(2)} • Due ${dueDate}`,
      rejected: bookCount === 1
        ? `✗ Rental rejected: "${firstBook}"`
        : `✗ Rental rejected: ${bookCount} books`,
      overdue: bookCount === 1
        ? `⚠ Overdue: "${firstBook}" - Please return soon`
        : `⚠ ${bookCount} books overdue - Please return soon`
    }
    return messages[status] || 'Status update'
  }

  const getSimpleNotificationMessage = (status) => {
    const messages = {
      approved: '✓ Your rental request has been approved!',
      rejected: '✗ Your rental request was rejected',
      overdue: '⚠ Your rental is overdue. Please return the books.'
    }
    return messages[status] || 'Status update'
  }

  const markAsRead = (notificationId) => {
    const notification = notifications.value.find(n => n.id === notificationId)
    if (notification && !notification.read) {
      notification.read = true
      saveReadNotification(notificationId)
      
      // Remove from notifications list after marking as read
      const index = notifications.value.findIndex(n => n.id === notificationId)
      if (index > -1) {
        notifications.value.splice(index, 1)
      }
      
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  const markAllAsRead = () => {
    notifications.value.forEach(n => {
      if (!n.read) {
        saveReadNotification(n.id)
      }
    })
    notifications.value = []
    unreadCount.value = 0
  }

  const clearNotifications = () => {
    notifications.value = []
    unreadCount.value = 0
  }

  // Setup realtime subscription for status changes
  const subscribeToUpdates = (userId) => {
    if (!userId) return
    
    realtimeSubscription = supabase
      .channel('rental_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rental_requests',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const newStatus = payload.new.status
          if (['approved', 'rejected', 'overdue'].includes(newStatus)) {
            const readIds = getReadNotifications()
            
            // Skip if already read
            if (readIds.includes(payload.new.id)) {
              return
            }
            
            // Fetch full rental data with books
            const { data: rental } = await supabase
              .from('rental_requests')
              .select(`
                id,
                status,
                updated_at,
                total_price,
                due_date,
                rental_items (
                  book_id,
                  quantity,
                  days_count
                )
              `)
              .eq('id', payload.new.id)
              .single()
            
            if (rental) {
              // Fetch book details
              const bookIds = rental.rental_items.map(item => item.book_id)
              const { data: books } = await supabase
                .from('books')
                .select('id, title, author')
                .in('id', bookIds)
              
              const booksMap = books ? books.reduce((acc, book) => {
                acc[book.id] = book
                return acc
              }, {}) : {}
              
              const booksInfo = rental.rental_items.map(item => ({
                ...item,
                book: booksMap[item.book_id]
              }))
              
              const notification = {
                id: rental.id,
                type: rental.status,
                message: getNotificationMessage(rental.status, booksInfo, rental),
                timestamp: rental.updated_at || new Date().toISOString(),
                rentalId: rental.id,
                read: false,
                books: booksInfo,
                totalPrice: rental.total_price,
                dueDate: rental.due_date
              }
              
              // Remove old notification for same rental if exists
              const existingIndex = notifications.value.findIndex(n => n.rentalId === rental.id)
              if (existingIndex > -1) {
                notifications.value.splice(existingIndex, 1)
              }
              
              notifications.value.unshift(notification)
              unreadCount.value++
            }
          }
        }
      )
      .subscribe()
  }

  const unsubscribe = () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription)
      realtimeSubscription = null
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    subscribeToUpdates,
    unsubscribe
  }
}

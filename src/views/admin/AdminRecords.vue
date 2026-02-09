<template>
  <Navbar />
  <div class="records-page">
    <div class="header">
      <h2>Admin Records</h2>
      <div class="controls">
        <div class="tabs">
          <button @click="activeTab = 'rentals'" :class="{ active: activeTab === 'rentals' }">Rentals</button>
          <button @click="activeTab = 'accounts'" :class="{ active: activeTab === 'accounts' }">Accounts</button>
        </div>
        <div class="search-box">
          <input v-model="searchQuery" placeholder="Search Email, Name, or UID..." />
        </div>
      </div>
    </div>

    <!-- Rentals Tab -->
    <div v-if="activeTab === 'rentals'" class="tab-content">
        <div class="filter-group">
          <select v-model="statusFilter">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="returned">Returned</option>
            <option value="rejected">Rejected</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Book / Items</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Overdue</th>
            <th>Fee</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rental in filteredRentals" :key="rental.id">
            <td>
              <div class="user-info">
                <strong>{{ rental.user_profile?.first_name }} {{ rental.user_profile?.last_name }}</strong>
                <small>{{ rental.user_profile?.email }}</small>
              </div>
            </td>
            <td>
              <ul class="item-list">
                <li v-for="item in rental.rental_items" :key="item.id">
                  {{ item.book?.title }} ({{ item.days_count }} days)
                </li>
              </ul>
            </td>
            <td>{{ rental.due_date ? formatDate(rental.due_date) : formatDate(rental.created_at, getRentalDuration(rental)) }}</td>
            <td>
              <select v-model="rental.status" @change="updateRentalStatus(rental)">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="returned">Returned</option>
                <option value="rejected">Rejected</option>
                <option value="overdue">Overdue</option>
              </select>
            </td>
            <td :class="{ 'text-danger': getOverdueDays(rental) > 0 }">
              {{ getOverdueDays(rental) > 0 ? getOverdueDays(rental) + ' days' : '-' }}
            </td>
            <td>
              <span v-if="rental.penalty_fee > 0" class="text-danger">₱{{ rental.penalty_fee }} (Paid)</span>
              <span v-else-if="getOverdueFee(rental) > 0" class="text-danger">₱{{ getOverdueFee(rental) }} (Est)</span>
              <span v-else>-</span>
            </td>
            <td>
              <button @click="saveRental(rental)" class="btn-sm">Save</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Accounts Tab -->
    <div v-if="activeTab === 'accounts'" class="tab-content">
      <table class="data-table">
        <thead>
          <tr>
            <th>UID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="acc in filteredAccounts" :key="acc.id">
            <td><small>{{ acc.id }}</small></td>
            <td>{{ acc.first_name }} {{ acc.last_name }}</td>
            <td>{{ acc.email }}</td>
            <td>{{ acc.contact_number }}</td>
            <td>
              <select v-model="acc.status" @change="updateAccountStatus(acc)">
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </td>
            <td>
              <button @click="saveAccount(acc)" class="btn-sm">Save</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../services/supabaseClient'
import Navbar from '../../components/Navbar.vue'

const activeTab = ref('rentals')
const searchQuery = ref('')
const statusFilter = ref('all') // Default: 'all'

const rentals = ref([])
const accounts = ref([])

onMounted(async () => {
  await fetchRentals()
  await fetchAccounts()
})

const fetchRentals = async () => {
    // 1. Fetch Rentals with Items
    const { data: rentalData, error } = await supabase
        .from('rental_requests')
        .select(`
            *,
            rental_items (*)
        `)
        .order('created_at', { ascending: false })
        
    if (!rentalData || rentalData.length === 0) {
        rentals.value = []
        return
    }

    // 2. Fetch User Profiles
    const userIds = [...new Set(rentalData.map(r => r.user_id).filter(Boolean))]
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)
        
    // 3. Fetch Books (for titles)
    const allItems = rentalData.flatMap(r => r.rental_items || [])
    const bookIds = [...new Set(allItems.map(i => i.book_id).filter(Boolean))]
    
    let books = []
    if (bookIds.length > 0) {
        const { data: bookData } = await supabase
            .from('books')
            .select('id, title')
            .in('id', bookIds)
        books = bookData || []
    }

    // 4. Map everything together
    rentals.value = rentalData.map(r => {
        const user = profiles?.find(p => p.id === r.user_id)
        
        const itemsWithBooks = (r.rental_items || []).map(item => {
            const book = books.find(b => b.id === item.book_id)
            return { ...item, book } 
        })
        
        return {
            ...r,
            user_profile: user,
            rental_items: itemsWithBooks
        }
    })
}

const fetchAccounts = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        
    if (error) console.error('Error fetching accounts:', error)
    else accounts.value = data
}

// Filtering Logic
const filteredRentals = computed(() => {
    return rentals.value.filter(r => {
        const matchesSearch = 
            r.user_id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            r.user_profile?.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            (r.user_profile?.first_name + ' ' + r.user_profile?.last_name).toLowerCase().includes(searchQuery.value.toLowerCase())
            
        let matchesStatus = true
        if (statusFilter.value === 'overdue') {
            matchesStatus = getOverdueDays(r) > 0
        } else if (statusFilter.value !== 'all') {
            matchesStatus = r.status === statusFilter.value
        }
        
        return matchesSearch && matchesStatus
    })
})

const filteredAccounts = computed(() => {
    return accounts.value.filter(a => {
        return (
            a.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            a.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            (a.first_name + ' ' + a.last_name).toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    })
})

// Overdue Logic
const getRentalDuration = (rental) => {
    if (!rental.rental_items || rental.rental_items.length === 0) return 0
    return Math.max(...rental.rental_items.map(i => i.days_count || 0), 0)
}

const getOverdueDays = (rental) => {
    if (rental.status === 'returned' || rental.status === 'rejected') return 0
    
    let due;
    if (rental.due_date) {
        due = new Date(rental.due_date);
    } else {
        // Fallback for old records
        const maxDays = getRentalDuration(rental)
        const created = new Date(rental.created_at)
        due = new Date(created)
        due.setDate(created.getDate() + maxDays)
    }
    
    const today = new Date()
    const diffTime = today - due
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
    
    return diffDays > 0 ? diffDays : 0
}

const getOverdueFee = (rental) => {
    const days = getOverdueDays(rental)
    let itemCount = 0
    if (rental.rental_items) {
        itemCount = rental.rental_items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    }
    return days * 20 * itemCount
}



const formatDate = (dateStr, addDays = 0) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    d.setDate(d.getDate() + addDays)
    return d.toLocaleDateString()
}

// Updating Logic
const updateRentalStatus = async (rental) => {
    // Note: If status becomes 'returned', we should technically increment stock.
    // However, tracking previous status client-side is tricky without storing it.
    // Ideally, do this server-side or with a dedicated 'Return' button action.
}

const saveRental = async (rental) => {
    // 1. Fetch current status from DB to compare
    const { data: dbRental, error: fetchError } = await supabase
        .from('rental_requests')
        .select('status')
        .eq('id', rental.id)
        .single()
    
    if (fetchError) {
        alert('Error fetching original status: ' + fetchError.message)
        return
    }

    const oldStatus = dbRental.status
    const newStatus = rental.status

    const isRented = (status) => ['approved', 'overdue'].includes(status)
    const wasRented = isRented(oldStatus)
    const willBeRented = isRented(newStatus)

    let stockChange = 0
    
    // If moving TO a rented state from a non-rented state -> Deduct Stock
    if (willBeRented && !wasRented) {
        stockChange = -1 
    } 
    // If moving FROM a rented state to a non-rented state -> Return Stock
    else if (!willBeRented && wasRented) {
        stockChange = 1
    }

    // 3. Update Stock if needed
    if (stockChange !== 0) {
        // Fetch all books involved to check stock first
        const bookIds = rental.rental_items.map(i => i.book_id)
        const { data: books, error: bookError } = await supabase
            .from('books')
            .select('id, available_stock, currently_rented, title')
            .in('id', bookIds)
            
        if (bookError) {
             alert('Error checking stock: ' + bookError.message)
             return
        }

        // Map quantities
        const bookQtys = {}
        rental.rental_items.forEach(item => {
            const qty = item.quantity || 1
            bookQtys[item.book_id] = (bookQtys[item.book_id] || 0) + qty
        })

        // Validation Phase (only if approving/deducting)
        if (stockChange === -1) {
            for (const book of books) {
                const requiredQty = bookQtys[book.id]
                if (book.available_stock < requiredQty) {
                    alert(`Cannot approve: Book "${book.title}" needs ${requiredQty} copies but only ${book.available_stock} available!`)
                    return
                }
            }
        }

        // Execution Phase
        for (const book of books) {
             const qty = bookQtys[book.id]
             const change = stockChange * qty
             
             await supabase.from('books').update({
                 available_stock: book.available_stock + change,
                 currently_rented: Math.max(0, (book.currently_rented || 0) - change)
             }).eq('id', book.id)
        }
    }

    // 4. Update Rental Status & Return Details
    const updates = { 
        status: rental.status,
        updated_at: new Date().toISOString()
    }

    // If marking as RETURNED, calculate finals
    if (rental.status === 'returned') {
        const now = new Date();
        updates.return_date = now.toISOString();

        // Calculate Overdue
        const dueDate = new Date(rental.due_date);
        const diffTime = now - dueDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            updates.is_overdue = true;
            const itemCount = rental.rental_items ? rental.rental_items.length : 1;
            updates.penalty_fee = diffDays * 20 * itemCount;
        } else {
            updates.is_overdue = false;
            updates.penalty_fee = 0;
        }
    }

    const { error } = await supabase
        .from('rental_requests')
        .update(updates)
        .eq('id', rental.id)
        
    if (error) alert('Error updating rental: ' + error.message)
    else {
        alert('Rental updated!')
        fetchRentals() // Refresh data
    }
}

const updateAccountStatus = async (acc) => {
    // Local update
}

const saveAccount = async (acc) => {
    const { error } = await supabase
        .from('profiles')
        .update({ status: acc.status })
        .eq('id', acc.id)
        
    if (error) alert('Error updating account: ' + error.message)
    else alert('Account updated!')
}
</script>

<style scoped>
.records-page { max-width: 1200px; margin: 0 auto; padding: 20px; }

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header h2 { color: #0047ab; margin: 0; }

.controls { display: flex; gap: 20px; align-items: center; }

.tabs button {
  background: white;
  border: 1px solid #ccc;
  padding: 8px 16px;
  cursor: pointer;
  margin-right: -1px;
}
.tabs button:first-child { border-radius: 4px 0 0 4px; }
.tabs button:last-child { border-radius: 0 4px 4px 0; }
.tabs button.active { background: #0047ab; color: white; border-color: #0047ab; }

.search-box input { padding: 8px; width: 250px; border-radius: 4px; border: 1px solid #ccc; margin: 0; }

.data-table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden; }
.data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
.data-table th { background: #f8f9fa; font-weight: 600; color: #555; }

.user-info { display: flex; flex-direction: column; }
.user-info small { color: #777; }

.item-list { padding-left: 15px; margin: 0; font-size: 0.9rem; }
.checkbox-label { user-select: none; cursor: pointer; display: flex; align-items: center; gap: 5px; margin-bottom: 10px; font-weight: 600; }

.text-danger { color: #d32f2f; font-weight: bold; }
.btn-sm { padding: 4px 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; }

select { padding: 4px; border-radius: 4px; border: 1px solid #ccc; }
</style>

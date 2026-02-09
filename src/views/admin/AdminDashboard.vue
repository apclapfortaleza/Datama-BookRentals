<template>
  <Navbar />
  <div class="admin-panel">

    <!-- Floating Toggles -->
    <button class="floating-toggle left-toggle" @click="toggleView('accounts')" :class="{ collapsed: !showAccounts }">
      {{ showAccounts ? '◀ Accounts' : 'Accounts ▶' }}
    </button>
    <button class="floating-toggle right-toggle" @click="toggleView('rentals')" :class="{ collapsed: !showRentals }">
      {{ showRentals ? 'Rentals ▶' : '◀ Rentals' }}
    </button>

    <div class="dashboard-grid" :class="{ 'single-view': !showAccounts || !showRentals }">
      <!-- Accounts Column -->
      <div v-if="showAccounts" class="dashboard-col accounts-col">
        <h2>Pending Account Requests</h2>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="acc in pendingAccounts" :key="acc.id">
                <td>{{ acc.email }}</td>
                <td>{{ acc.first_name }} {{ acc.last_name }}</td>
                <td>{{ acc.contact_number }}</td>
                <td>{{ acc.user_type }}</td>
                <td>
                  <div class="action-buttons">
                    <button @click="approveAccount(acc.id)" class="btn-sm">Approve</button>
                    <button @click="rejectAccount(acc.id)" class="reject btn-sm">Reject</button>
                  </div>
                </td>
              </tr>
              <tr v-if="pendingAccounts.length === 0">
                <td colspan="5" class="empty-msg">No pending accounts.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Rentals Column -->
      <div v-if="showRentals" class="dashboard-col rentals-col">
        <h2>Pending Rental Requests</h2>
        <div class="requests-list">
          <div v-for="req in requests" :key="req.id" class="request-card">
            <div class="req-header">
              <div class="user-details">
                <strong>{{ req.user_profile?.first_name }} {{ req.user_profile?.last_name }}</strong>
                <small>{{ req.user_profile?.email }}</small>
              </div>
              <span class="status-badge">{{ req.status }}</span>
            </div>
            <div class="req-items">
              <ul>
                <li v-for="item in req.rental_items" :key="item.id">
                  {{ item.book?.title }} ({{ item.days_count }} days) - ₱{{ item.price }}
                </li>
              </ul>
              <div class="req-total">Total: ₱{{ req.total_price }}</div>
            </div>
            <div class="req-actions">
              <button @click="approveRequest(req.id)">Approve</button>
              <button @click="rejectRequest(req.id)" class="reject">Reject</button>
            </div>
          </div>
          <div v-if="requests.length === 0" class="empty-msg">No pending rentals.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabaseClient'
import Navbar from '../../components/Navbar.vue'

const requests = ref([])
const pendingAccounts = ref([])
const showAccounts = ref(true)
const showRentals = ref(true)

const toggleView = (view) => {
  if (view === 'accounts') showAccounts.value = !showAccounts.value
  if (view === 'rentals') showRentals.value = !showRentals.value
  // Prevent both being hidden? optional.
  if (!showAccounts.value && !showRentals.value) {
     if (view === 'accounts') showRentals.value = true
     else showAccounts.value = true
  }
}

const fetchData = async () => {
  // 1. Fetch requests with items
  const { data: rentals } = await supabase
    .from('rental_requests')
    .select(`
      *,
      rental_items (
        days_count,
        price,
        book_id
      )
    `)
    .eq('status', 'pending');
    
  if (rentals && rentals.length > 0) {
      // 2. Fetch User Profiles
      const userIds = [...new Set(rentals.map(r => r.user_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds)

      // 3. Fetch Books
      const allItems = rentals.flatMap(r => r.rental_items || [])
      const bookIds = [...new Set(allItems.map(i => i.book_id).filter(Boolean))]
      
      let books = []
      if (bookIds.length > 0) {
          const { data: bookData } = await supabase
            .from('books')
            .select('id, title')
            .in('id', bookIds)
          books = bookData || []
      }

      // 4. Map Data
      requests.value = rentals.map(r => {
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
  } else {
      requests.value = []
  }

  const { data: accounts, error: accError } = await supabase
    .from('profiles')
    .select('*')
    .or('status.eq.pending,status.is.null')
    
  if (accError) {
      console.error('Error fetching accounts:', accError)
  }
  
  pendingAccounts.value = accounts || []
}

const approveRequest = async (id) => {
  // 1. Fetch Rental Items to get Book IDs
  const { data: requestItems, error: itemsError } = await supabase
    .from('rental_items')
    .select('book_id')
    .eq('rental_request_id', id)
    
  if (itemsError) {
    alert('Error fetching items: ' + itemsError.message)
    return
  }

  // Count quantities per book (in case of multiple copies)
  const bookCounts = {}
  for (const item of requestItems) {
      bookCounts[item.book_id] = (bookCounts[item.book_id] || 0) + 1
  }
  const bookIds = Object.keys(bookCounts)

  // 2. Fetch Books to check and update stock
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, available_stock, currently_rented, title')
    .in('id', bookIds)
    
  if (booksError) {
    alert('Error checking stock: ' + booksError.message)
    return
  }

  // 3. Validate Stock
  for (const book of books) {
    const requiredQty = bookCounts[book.id]
    if (book.available_stock < requiredQty) {
      alert(`Cannot approve: Book "${book.title}" has only ${book.available_stock} available, but request needs ${requiredQty}.`)
      return
    }
  }

  // 4. Update Stock
  for (const book of books) {
    const qty = bookCounts[book.id]
    const newAvailable = Number(book.available_stock) - qty
    const newRented = Number(book.currently_rented || 0) + qty

    const { error: stockError } = await supabase.from('books').update({
       available_stock: newAvailable,
       currently_rented: newRented
    }).eq('id', book.id)
    
    if (stockError) {
        alert('Failed to update stock for ' + book.title + ': ' + stockError.message)
        return // Stop processing
    }
  }

  // 5. Update Request Status
  const { data: { user } } = await supabase.auth.getUser()
  const { error: updateError } = await supabase.from('rental_requests')
    .update({ 
      status: 'approved',
      approved_by: user.id 
    })
    .eq('id', id)
 
  if (updateError) {
    alert('Error approving request: ' + updateError.message)
  } else {
    fetchData()
  }
}

const rejectRequest = async (id) => {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('rental_requests')
    .update({ 
      status: 'rejected',
      approved_by: user.id 
    })
    .eq('id', id)
  fetchData()
}

const approveAccount = async (id) => {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('profiles')
    .update({ 
      status: 'approved',
      approved_by: user.id 
    })
    .eq('id', id)
  fetchData()
}

const rejectAccount = async (id) => {
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('profiles')
    .update({ 
      status: 'rejected',
      approved_by: user.id 
    })
    .eq('id', id)
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.admin-panel { max-width: 1400px; margin: 0 auto; padding: 20px; position: relative; }

/* Floating Toggles */
.floating-toggle {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 71, 171, 0.6); /* Translucent Primary */
  color: white;
  border: none;
  padding: 15px 10px;
  cursor: pointer;
  z-index: 100;
  border-radius: 0;
  font-size: 0.9rem;
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
  width: 40px;
  white-space: nowrap;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

.floating-toggle:hover {
  background: rgba(0, 71, 171, 0.9);
  width: 50px;
}

.left-toggle { left: 0; border-radius: 0 8px 8px 0; }
.right-toggle { right: 0; border-radius: 8px 0 0 8px; }

.floating-toggle.collapsed {
  background: rgba(108, 117, 125, 0.6); /* Grey when collapsed */
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  align-items: flex-start;
  transition: all 0.5s ease;
  margin-top: 20px;
}

.dashboard-grid.single-view {
  grid-template-columns: 1fr;
  max-width: 900px;
  margin: 0 auto;
}
/* ... rest of existing styles ... */
.dashboard-col {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #eee;
  /* Smooth enter/leave */
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

h2 { 
  color: #0047ab; 
  margin-top: 0; 
  margin-bottom: 20px; 
  font-size: 1.25rem; 
  border-bottom: 2px solid #e9ecef; 
  padding-bottom: 10px; 
}

/* Table Styles */
.table-container { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; }
th { background-color: #eef2f7; color: #333; font-weight: 600; }
tr:last-child td { border-bottom: none; }
.empty-msg { text-align: center; color: #888; padding: 20px; font-style: italic; }

.action-buttons { display: flex; gap: 5px; }
.btn-sm { padding: 4px 8px; font-size: 0.8rem; margin: 0; }

/* Card Styles */
.request-card {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border: 1px solid #eee;
}

.req-header { display: flex; justify-content: space-between; margin-bottom: 15px; align-items: flex-start; }
.user-details { display: flex; flex-direction: column; }
.user-details strong { font-size: 1rem; color: #0047ab; }
.user-details small { color: #666; font-size: 0.85rem; }
.status-badge { background: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; align-self: flex-start; }

.req-items { background: #fcfcfc; padding: 10px; border-radius: 6px; border: 1px dashed #eee; }
.req-items ul { margin: 0; padding-left: 20px; font-size: 0.9rem; color: #555; }
.req-total { margin-top: 8px; font-weight: bold; color: #d32f2f; text-align: right; }

.req-actions { margin-top: 15px; text-align: right; }

button:not(.floating-toggle) {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

button:not(.reject):not(.floating-toggle) { background-color: #28a745; color: white; }
button.reject { background-color: #fff; color: #d32f2f; border: 1px solid #ffcdd2; }
button.reject:hover { background-color: #ffebee; }
</style>
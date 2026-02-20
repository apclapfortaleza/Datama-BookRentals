<template>
  <div>
    <Navbar />
    <PageLayout>
      <SectionHeader 
        title="Admin Dashboard"
        description="Manage pending account requests and rental approvals"
      />
      
      <!-- Overdue Alert -->
      <div v-if="overdueCount > 0" class="overdue-alert">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <strong>{{ overdueCount }} Overdue Rental{{ overdueCount > 1 ? 's' : '' }}</strong>
          <p>Review overdue rentals in the Records section</p>
        </div>
        <AppButton size="sm" variant="danger" @click="$router.push('/admin/records')">
          View Overdue
        </AppButton>
      </div>
      
      <div class="view-toggles">
        <AppButton 
          :variant="showAccounts ? 'primary' : 'ghost'" 
          size="sm"
          @click="toggleView('accounts')"
        >
          {{ showAccounts ? '✓ ' : '' }}Accounts
        </AppButton>
        <AppButton 
          :variant="showRentals ? 'primary' : 'ghost'" 
          size="sm"
          @click="toggleView('rentals')"
        >
          {{ showRentals ? '✓ ' : '' }}Rentals
        </AppButton>
      </div>

      <div :class="['dashboard-grid', { 'single-view': !showAccounts || !showRentals }]">
        <!-- Accounts Section -->
        <div v-if="showAccounts" class="dashboard-section">
          <AppCard>
            <template #header>
              <h3>Pending Account Requests</h3>
            </template>
            
            <div v-if="pendingAccounts.length > 0" class="table-wrapper">
              <table class="data-table">
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
                    <td>
                      <span class="badge">{{ formatUserType(acc.user_type) }}</span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <AppButton size="sm" variant="success" @click="approveAccount(acc.id)">
                          Approve
                        </AppButton>
                        <AppButton size="sm" variant="error" @click="rejectAccount(acc.id)">
                          Reject
                        </AppButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <EmptyState 
              v-else
              icon="✓"
              title="No Pending Accounts"
              description="All account requests have been processed"
            />
          </AppCard>
        </div>

        <!-- Rentals Section -->
        <div v-if="showRentals" class="dashboard-section">
          <AppCard>
            <template #header>
              <h3>Pending Rental Requests</h3>
            </template>
            
            <div v-if="requests.length > 0" class="requests-grid">
              <AppCard v-for="req in requests" :key="req.id" hoverable>
                <div class="request-header">
                  <div class="user-info">
                    <strong>{{ req.user_profile?.first_name }} {{ req.user_profile?.last_name }}</strong>
                    <span class="user-email">{{ req.user_profile?.email }}</span>
                    <span v-if="req.user_profile?.user_type" class="badge badge-sm">
                      {{ formatUserType(req.user_profile.user_type) }}
                    </span>
                  </div>
                  <span class="status-badge">{{ req.status }}</span>
                </div>
                
                <div class="request-items">
                  <ul>
                    <li v-for="item in req.rental_items" :key="item.id">
                      <span class="book-title">{{ item.book?.title }}</span>
                      <span class="book-details">{{ item.days_count }} days · ₱{{ item.price }}</span>
                    </li>
                  </ul>
                  <div class="request-total">
                    <strong>Total: ₱{{ req.total_price }}</strong>
                  </div>
                </div>
                
                <template #footer>
                  <div class="request-actions">
                    <AppButton variant="success" @click="approveRequest(req.id)">
                      Approve
                    </AppButton>
                    <AppButton variant="error" @click="rejectRequest(req.id)">
                      Reject
                    </AppButton>
                  </div>
                </template>
              </AppCard>
            </div>
            
            <EmptyState 
              v-else
              icon="✓"
              title="No Pending Rentals"
              description="All rental requests have been processed"
            />
          </AppCard>
        </div>
      </div>
    </PageLayout>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../services/supabaseClient'
import { useOverdueCheck } from '../../composables/useOverdueCheck'
import Navbar from '../../components/Navbar.vue'
import PageLayout from '../../components/layout/PageLayout.vue'
import SectionHeader from '../../components/layout/SectionHeader.vue'
import EmptyState from '../../components/layout/EmptyState.vue'
import AppCard from '../../components/ui/AppCard.vue'
import AppButton from '../../components/ui/AppButton.vue'

const { checkAndUpdateOverdue, getOverdueCount } = useOverdueCheck()

const requests = ref([])
const pendingAccounts = ref([])
const overdueCount = ref(0)
const showAccounts = ref(true)
const showRentals = ref(true)
let realtimeChannel = null

const formatUserType = (userType) => {
  const type = (userType || '').toLowerCase()
  if (!type) return '-'
  if (type === 'pwd') return 'PWD'
  if (type === 'senior') return 'Senior'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

const toggleView = (view) => {
  if (view === 'accounts') showAccounts.value = !showAccounts.value
  if (view === 'rentals') showRentals.value = !showRentals.value
  
  if (!showAccounts.value && !showRentals.value) {
     if (view === 'accounts') showRentals.value = true
     else showAccounts.value = true
  }
}

const fetchData = async () => {
  // Check and update overdue rentals first
  await checkAndUpdateOverdue()
  
  // Get overdue count for alert
  overdueCount.value = await getOverdueCount()
  const { data: rentals } = await supabase
    .from('rental_requests')
    .select(`
      *,
      rental_items (
        days_count,
        price,
        book_id,
        quantity
      )
    `)
    .eq('status', 'pending')
    
  if (rentals && rentals.length > 0) {
      const userIds = [...new Set(rentals.map(r => r.user_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, user_type')
        .in('id', userIds)

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

  const { data: accounts } = await supabase
    .from('profiles')
    .select('*')
    .or('status.eq.pending,status.is.null')
    
  pendingAccounts.value = accounts || []
}

const approveRequest = async (id) => {
  const { data: requestItems, error: itemsError } = await supabase
    .from('rental_items')
    .select('book_id, quantity')
    .eq('rental_request_id', id)
    
  if (itemsError) {
    alert('Error fetching items: ' + itemsError.message)
    return
  }

  const bookCounts = {}
  for (const item of requestItems) {
      const qty = item.quantity || 1
      bookCounts[item.book_id] = (bookCounts[item.book_id] || 0) + qty
  }
  const bookIds = Object.keys(bookCounts)

  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, available_stock, currently_rented, title')
    .in('id', bookIds)
    
  if (booksError) {
    alert('Error checking stock: ' + booksError.message)
    return
  }

  for (const book of books) {
    const requiredQty = bookCounts[book.id]
    if (book.available_stock < requiredQty) {
      alert(`Cannot approve: Book "${book.title}" has only ${book.available_stock} available, but request needs ${requiredQty}.`)
      return
    }
  }

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
        return
    }
  }

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
.view-toggles {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.overdue-alert {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.alert-icon {
  font-size: 2rem;
  line-height: 1;
}

.alert-content {
  flex: 1;
}

.alert-content strong {
  display: block;
  color: var(--color-error);
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-1);
}

.alert-content p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-8);
  transition: all var(--transition-base);
}

.dashboard-grid.single-view {
  grid-template-columns: 1fr;
}

.dashboard-section {
  min-width: 0;
}

/* Table Styles */
.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  text-align: left;
  padding: var(--space-3);
  background-color: var(--color-bg-tertiary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.data-table td {
  padding: var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.action-buttons {
  display: flex;
  gap: var(--space-2);
}

.badge {
  display: inline-block;
  padding: var(--space-1) var(--space-3);
  background-color: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}

.badge-sm {
  padding: var(--space-1) var(--space-2);
  font-size: 0.7rem;
}

/* Request Cards */
.requests-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
  gap: var(--space-4);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
}

.user-info strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
}

.user-email {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.status-badge {
  padding: var(--space-1) var(--space-3);
  background-color: var(--color-warning);
  color: white;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: capitalize;
  white-space: nowrap;
}

.request-items {
  background-color: var(--color-bg-secondary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.request-items ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.request-items li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.book-title {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  flex: 1;
}

.book-details {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.request-total {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
  text-align: right;
  color: var(--color-error);
}

.request-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .request-header {
    flex-direction: column;
  }
  
  .request-items li {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .action-buttons,
  .request-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .data-table {
    font-size: var(--font-size-xs);
  }
  
  .data-table th,
  .data-table td {
    padding: var(--space-2);
  }
}
</style>

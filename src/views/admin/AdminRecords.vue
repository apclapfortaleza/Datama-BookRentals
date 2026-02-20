<template>
  <div>
    <Navbar />
    <PageLayout>
      <SectionHeader 
        title="Admin Records"
        description="View and manage all rental and account records"
      />
      
      <div class="controls-section">
        <div class="tab-buttons">
          <AppButton 
            :variant="activeTab === 'rentals' ? 'primary' : 'ghost'"
            @click="activeTab = 'rentals'"
          >
            Rentals
          </AppButton>
          <AppButton 
            :variant="activeTab === 'accounts' ? 'primary' : 'ghost'"
            @click="activeTab = 'accounts'"
          >
            Accounts
          </AppButton>
        </div>
        
        <div class="search-section">
          <AppInput
            v-model="searchQuery"
            placeholder="Search by email, name, or ID..."
          />
          <AppSelect
            v-if="activeTab === 'rentals'"
            v-model="statusFilter"
            :options="statusOptions"
            placeholder="Filter by status"
          />
        </div>
      </div>

      <!-- Rentals Tab -->
      <AppCard v-if="activeTab === 'rentals'">
        <template #header>
          <h3>Rental Records</h3>
        </template>
        
        <div v-if="filteredRentals.length > 0" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Books</th>
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
                <td>{{ formatDate(rental.due_date || rental.created_at) }}</td>
                <td>
                  <AppSelect
                    v-model="rental.status"
                    :options="rentalStatusOptions"
                  />
                </td>
                <td>
                  <span :class="{ 'text-danger': getOverdueDays(rental) > 0 }">
                    {{ getOverdueDays(rental) > 0 ? getOverdueDays(rental) + ' days' : '-' }}
                  </span>
                </td>
                <td>
                  <span v-if="rental.penalty_fee > 0" class="text-danger">
                    ₱{{ rental.penalty_fee }}
                  </span>
                  <span v-else-if="getOverdueFee(rental) > 0" class="text-warning">
                    ₱{{ getOverdueFee(rental) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>
                  <AppButton size="sm" @click="saveRental(rental)">
                    Save
                  </AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <EmptyState 
          v-else
          icon="📋"
          title="No Rental Records"
          description="No rentals match your search criteria"
        />
      </AppCard>

      <!-- Accounts Tab -->
      <AppCard v-if="activeTab === 'accounts'">
        <template #header>
          <h3>Account Records</h3>
        </template>
        
        <div v-if="filteredAccounts.length > 0" class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="acc in filteredAccounts" :key="acc.id">
                <td>{{ acc.first_name }} {{ acc.last_name }}</td>
                <td>{{ acc.email }}</td>
                <td>{{ acc.contact_number }}</td>
                <td>
                  <span class="badge">{{ formatUserType(acc.user_type) }}</span>
                </td>
                <td>
                  <AppSelect
                    v-model="acc.status"
                    :options="accountStatusOptions"
                  />
                </td>
                <td>
                  <AppButton size="sm" @click="saveAccount(acc)">
                    Save
                  </AppButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <EmptyState 
          v-else
          icon="👥"
          title="No Account Records"
          description="No accounts match your search criteria"
        />
      </AppCard>
    </PageLayout>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../../services/supabaseClient'
import { useOverdueCheck } from '../../composables/useOverdueCheck'
import Navbar from '../../components/Navbar.vue'
import PageLayout from '../../components/layout/PageLayout.vue'
import SectionHeader from '../../components/layout/SectionHeader.vue'
import EmptyState from '../../components/layout/EmptyState.vue'
import AppCard from '../../components/ui/AppCard.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppInput from '../../components/ui/AppInput.vue'
import AppSelect from '../../components/ui/AppSelect.vue'

const { checkAndUpdateOverdue, getOverdueDays: getOverdueDaysUtil } = useOverdueCheck()

const activeTab = ref('rentals')
const searchQuery = ref('')
const statusFilter = ref('all')

const rentals = ref([])
const accounts = ref([])
let realtimeChannel = null

const formatUserType = (userType) => {
  const type = (userType || '').toLowerCase()
  if (!type) return '-'
  if (type === 'pwd') return 'PWD'
  if (type === 'senior') return 'Senior'
  return type.charAt(0).toUpperCase() + type.slice(1)
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overdue', label: 'Overdue' }
]

const rentalStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'overdue', label: 'Overdue' }
]

const accountStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' }
]

onMounted(async () => {
  // Check and update overdue rentals first
  await checkAndUpdateOverdue()
  
  await fetchRentals()
  await fetchAccounts()
  
  // Setup realtime subscriptions
  realtimeChannel = supabase
    .channel('admin_records_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'rental_requests'
      },
      () => {
        fetchRentals()
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles'
      },
      () => {
        fetchAccounts()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

const fetchRentals = async () => {
  const { data: rentalData } = await supabase
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

  const userIds = [...new Set(rentalData.map(r => r.user_id).filter(Boolean))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email')
    .in('id', userIds)
    
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
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    
  accounts.value = data || []
}

const filteredRentals = computed(() => {
  return rentals.value.filter(r => {
    const matchesSearch = 
      r.user_id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      r.user_profile?.email?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (`${r.user_profile?.first_name} ${r.user_profile?.last_name}`).toLowerCase().includes(searchQuery.value.toLowerCase())
        
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
      (`${a.first_name} ${a.last_name}`).toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  })
})

const getOverdueDays = (rental) => {
  if (rental.status === 'returned' || rental.status === 'rejected') return 0
  
  const due = rental.due_date ? new Date(rental.due_date) : new Date(rental.created_at)
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

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

const saveRental = async (rental) => {
  const { data: dbRental } = await supabase
    .from('rental_requests')
    .select('status')
    .eq('id', rental.id)
    .single()
    
  if (!dbRental) return

  const oldStatus = dbRental.status
  const newStatus = rental.status

  const updates = { 
    status: rental.status,
    updated_at: new Date().toISOString()
  }

  if (rental.status === 'returned') {
    const now = new Date()
    updates.return_date = now.toISOString()

    const dueDate = new Date(rental.due_date)
    const diffTime = now - dueDate
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays > 0) {
      updates.is_overdue = true
      const itemCount = rental.rental_items ? rental.rental_items.length : 1
      updates.penalty_fee = diffDays * 20 * itemCount
    } else {
      updates.is_overdue = false
      updates.penalty_fee = 0
    }
  }

  const { error } = await supabase
    .from('rental_requests')
    .update(updates)
    .eq('id', rental.id)
    
  if (error) {
    alert('Error updating rental: ' + error.message)
  } else {
    alert('Rental updated successfully!')
    fetchRentals()
  }
}

const saveAccount = async (acc) => {
  const { error } = await supabase
    .from('profiles')
    .update({ status: acc.status })
    .eq('id', acc.id)
    
  if (error) {
    alert('Error updating account: ' + error.message)
  } else {
    alert('Account updated successfully!')
  }
}
</script>

<style scoped>
.controls-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
  gap: var(--space-4);
}

.tab-buttons {
  display: flex;
  gap: var(--space-2);
}

.search-section {
  display: flex;
  gap: var(--space-3);
  flex: 1;
  max-width: 600px;
}

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
  vertical-align: top;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

.data-table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.user-info strong {
  color: var(--color-text-primary);
}

.user-info small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
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

.text-danger {
  color: var(--color-error);
  font-weight: var(--font-weight-semibold);
}

.text-warning {
  color: var(--color-warning);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 768px) {
  .controls-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    flex-direction: column;
    max-width: 100%;
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

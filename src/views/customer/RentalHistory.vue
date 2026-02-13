<template>
  <div>
    <Navbar />
    <PageLayout>
      <SectionHeader 
        title="My Rental History"
        description="View your rental history, active rentals, and total spending"
      />

      <!-- Stats Summary -->
      <div class="stats-grid">
        <AppCard>
          <div class="stat-item">
            <div class="stat-icon">📚</div>
            <div class="stat-details">
              <div class="stat-value">{{ activeRentals }}</div>
              <div class="stat-label">Active Rentals</div>
            </div>
          </div>
        </AppCard>
        
        <AppCard>
          <div class="stat-item">
            <div class="stat-icon">⚠️</div>
            <div class="stat-details">
              <div class="stat-value overdue">{{ overdueRentals }}</div>
              <div class="stat-label">Overdue</div>
            </div>
          </div>
        </AppCard>
        
        <AppCard>
          <div class="stat-item">
            <div class="stat-icon">✓</div>
            <div class="stat-details">
              <div class="stat-value">{{ returnedRentals }}</div>
              <div class="stat-label">Returned</div>
            </div>
          </div>
        </AppCard>
        
        <AppCard>
          <div class="stat-item">
            <div class="stat-icon">💰</div>
            <div class="stat-details">
              <div class="stat-value">${{ totalSpent }}</div>
              <div class="stat-label">Total Spent</div>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Filters -->
      <div class="controls-section">
        <AppInput
          v-model="searchQuery"
          placeholder="Search by book title..."
          class="search-input"
        />
        
        <AppSelect
          v-model="statusFilter"
          :options="statusOptions"
        />
      </div>

      <!-- Rental History Table -->
      <AppCard>
        <AppLoading v-if="loading" />
        
        <div v-else-if="filteredRentals.length > 0" class="table-wrapper">
          <table class="rentals-table">
            <thead>
              <tr>
                <th>Books</th>
                <th>Rental Duration</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Returned On</th>
                <th>Amount</th>
                <th>Overdue Fee</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="rental in filteredRentals" 
                :key="rental.id"
                :class="{ 'overdue-row': isOverdue(rental) }"
              >
                <td>
                  <div class="book-list">
                    <div 
                      v-for="item in rental.rental_items" 
                      :key="item.book_id"
                      class="book-item"
                    >
                      <strong>{{ item.book?.title || 'Unknown Book' }}</strong>
                      <span class="quantity-badge">×{{ item.quantity }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="duration-text">{{ getRentalDuration(rental) }}</span>
                </td>
                <td>
                  <span :class="['status-badge', `status-${rental.status}`]">
                    {{ rental.status }}
                    <span v-if="isOverdue(rental)" class="overdue-indicator">
                      🔴 {{ getOverdueDays(rental) }} days overdue
                    </span>
                  </span>
                </td>
                <td>{{ formatDate(rental.due_date) }}</td>
                <td>
                  <span v-if="rental.return_date">{{ formatDate(rental.return_date) }}</span>
                  <span v-else-if="rental.status === 'approved' || rental.status === 'overdue'" class="expected-return">
                    Expected: {{ formatDate(rental.due_date) }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td>${{ rental.total_price?.toFixed(2) || '0.00' }}</td>
                <td>
                  <span v-if="isOverdue(rental)" class="overdue-fee">
                    ${{ calculateOverdueFee(rental) }}
                  </span>
                  <span v-else>-</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <EmptyState 
          v-else
          icon="📖"
          title="No Rentals Found"
          description="You haven't rented any books yet"
        >
          <template #action>
            <AppButton @click="$router.push('/rentbook')">
              Browse Books
            </AppButton>
          </template>
        </EmptyState>
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
import AppLoading from '../../components/ui/AppLoading.vue'

const { checkAndUpdateOverdue, getOverdueDays: getOverdueDaysUtil, calculateOverdueFee: calculateFeeUtil } = useOverdueCheck()

const rentals = ref([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('all')
let realtimeChannel = null

const statusOptions = [
  { value: 'all', label: 'All Rentals' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' }
]

onMounted(async () => {
  // Check and update overdue rentals first
  await checkAndUpdateOverdue()
  
  // Then fetch user's rentals
  await fetchRentals()
  
  // Setup realtime subscription
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    realtimeChannel = supabase
      .channel('rental_history_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_requests',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchRentals()
        }
      )
      .subscribe()
  }
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

const fetchRentals = async () => {
  loading.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data: rentalData } = await supabase
      .from('rental_requests')
      .select(`
        *,
        rental_items (
          *,
          book_id
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (!rentalData || rentalData.length === 0) {
      rentals.value = []
      return
    }
    
    // Fetch book details
    const allItems = rentalData.flatMap(r => r.rental_items || [])
    const bookIds = [...new Set(allItems.map(i => i.book_id).filter(Boolean))]
    
    let books = []
    if (bookIds.length > 0) {
      const { data: bookData } = await supabase
        .from('books')
        .select('id, title, author')
        .in('id', bookIds)
      books = bookData || []
    }
    
    rentals.value = rentalData.map(r => ({
      ...r,
      rental_items: (r.rental_items || []).map(item => ({
        ...item,
        book: books.find(b => b.id === item.book_id)
      }))
    }))
  } catch (error) {
    console.error('Error fetching rentals:', error)
  } finally {
    loading.value = false
  }
}

const filteredRentals = computed(() => {
  return rentals.value.filter(r => {
    const matchesSearch = r.rental_items.some(item => 
      item.book?.title?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    
    const matchesStatus = statusFilter.value === 'all' || r.status === statusFilter.value
    
    return matchesSearch && matchesStatus
  })
})

const activeRentals = computed(() => {
  return rentals.value.filter(r => r.status === 'approved').length
})

const overdueRentals = computed(() => {
  return rentals.value.filter(r => r.status === 'overdue' || isOverdue(r)).length
})

const returnedRentals = computed(() => {
  return rentals.value.filter(r => r.status === 'returned').length
})

const totalSpent = computed(() => {
  const total = rentals.value
    .filter(r => r.status === 'returned')
    .reduce((sum, r) => sum + (parseFloat(r.total_price) || 0), 0)
  return total.toFixed(2)
})

const isOverdue = (rental) => {
  if (rental.status === 'returned' || rental.status === 'rejected') return false
  if (rental.status === 'overdue') return true
  
  const due = new Date(rental.due_date)
  const now = new Date()
  return now > due && !rental.return_date
}

const getOverdueDays = (rental) => {
  if (!rental.due_date) return 0
  return getOverdueDaysUtil(rental.due_date)
}

const calculateOverdueFee = (rental) => {
  const days = getOverdueDays(rental)
  const itemCount = rental.rental_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1
  return (days * 20 * itemCount).toFixed(2)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getRentalDuration = (rental) => {
  if (!rental.rental_items || rental.rental_items.length === 0) return '-'
  const days = rental.rental_items[0].days_count || 0
  return `${days} day${days !== 1 ? 's' : ''}`
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2);
}

.stat-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.stat-details {
  flex: 1;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.stat-value.overdue {
  color: var(--color-error);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--space-1);
}

.controls-section {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 250px;
}

.table-wrapper {
  overflow-x: auto;
}

.rentals-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.rentals-table th {
  text-align: left;
  padding: var(--space-3);
  background: var(--color-background-secondary);
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid var(--color-border);
}

.rentals-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.rentals-table tr:hover {
  background: var(--color-background-hover);
}

.overdue-row {
  background: rgba(239, 68, 68, 0.05);
}

.overdue-row:hover {
  background: rgba(239, 68, 68, 0.1);
}

.book-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.book-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quantity-badge {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  background: var(--color-background-secondary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: capitalize;
}

.status-pending {
  background: var(--color-warning-bg);
  color: var(--color-warning-text);
}

.status-approved {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}

.status-overdue {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}

.status-returned {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}

.status-rejected {
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
}

.overdue-indicator {
  display: block;
  margin-top: var(--space-1);
  font-weight: 700;
}

.overdue-fee {
  color: var(--color-error);
  font-weight: 600;
}

.duration-text {
  font-weight: 600;
  color: var(--color-primary);
}

.expected-return {
  color: var(--color-text-secondary);
  font-style: italic;
  font-size: var(--font-size-xs);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .rentals-table {
    font-size: var(--font-size-xs);
  }
  
  .rentals-table th,
  .rentals-table td {
    padding: var(--space-2);
  }
}
</style>

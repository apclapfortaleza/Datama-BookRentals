<template>
  <div>
    <Navbar />
    <PageLayout>
      <SectionHeader 
        title="Book Inventory"
        description="Manage your book collection and stock levels"
      >
        <template #action>
          <AppButton @click="openAddModal">
            + Add Book
          </AppButton>
        </template>
      </SectionHeader>
      
      <div class="controls-section">
        <AppInput
          v-model="searchQuery"
          placeholder="Search by title, author, or serial code..."
          class="search-input"
        />
      </div>

      <AppCard>
        <div v-if="filteredBooks.length > 0" class="table-wrapper">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Book Details</th>
                <th>Serial Code</th>
                <th>Genre</th>
                <th>Daily Rate</th>
                <th>Total</th>
                <th>Available</th>
                <th>Rented</th>
                <th>Damaged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="book in filteredBooks" :key="book.id">
                <td>
                  <div class="book-info">
                    <strong>{{ book.title }}</strong>
                    <small>{{ book.author }}</small>
                  </div>
                </td>
                <td>{{ book.serial_code }}</td>
                <td>{{ book.genre }}</td>
                <td>₱{{ book.base_daily_rate }}</td>
                <td>{{ book.total_stock }}</td>
                <td>
                  <span :class="{ 'low-stock': book.available_stock < 3 }">
                    {{ book.available_stock }}
                  </span>
                </td>
                <td>{{ book.currently_rented || 0 }}</td>
                <td>{{ book.damaged_lost_count || 0 }}</td>
                <td>
                  <div class="action-buttons">
                    <AppButton size="sm" variant="secondary" @click="editBook(book)">
                      Edit
                    </AppButton>
                    <AppButton size="sm" variant="error" @click="deleteBook(book.id)">
                      Delete
                    </AppButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <EmptyState 
          v-else
          icon="📚"
          title="No Books Found"
          description="Start building your library by adding books"
        >
          <template #action>
            <AppButton @click="openAddModal">
              Add Your First Book
            </AppButton>
          </template>
        </EmptyState>
      </AppCard>

      <!-- Add/Edit Modal -->
      <AppModal v-model="showModal" :title="isEditing ? 'Edit Book' : 'Add New Book'" size="lg">
        <form @submit.prevent="saveBook" class="book-form">
          <div class="form-row">
            <AppInput
              v-model="form.title"
              label="Title"
              placeholder="Enter book title"
              required
            />
            <AppInput
              v-model="form.author"
              label="Author"
              placeholder="Enter author name"
              required
            />
          </div>
          
          <div class="form-row">
            <AppInput
              v-model="form.genre"
              label="Genre"
              placeholder="e.g., Fiction, Science, History"
              required
            />
            <div class="serial-input-group">
              <AppInput
                v-model="form.serial_code"
                label="Serial Code / ISBN"
                placeholder="Enter or generate code"
                required
              />
              <AppButton type="button" variant="secondary" size="sm" @click="generateSerial" class="generate-btn">
                Generate
              </AppButton>
            </div>
          </div>
          
          <AppInput
            v-model.number="form.base_daily_rate"
            type="number"
            label="Daily Rental Rate (₱)"
            placeholder="0"
            :min="0"
            required
          />
          
          <div class="form-row">
            <AppInput
              v-model.number="form.total_stock"
              type="number"
              label="Total Stock"
              :min="0"
              required
            />
            <AppInput
              v-model.number="form.available_stock"
              type="number"
              label="Available Stock"
              :min="0"
              required
            />
            <AppInput
              v-model.number="form.currently_rented"
              type="number"
              label="Currently Rented"
              :min="0"
            />
            <AppInput
              v-model.number="form.damaged_lost_count"
              type="number"
              label="Damaged/Lost"
              :min="0"
            />
          </div>
        </form>
        
        <template #footer>
          <AppButton variant="ghost" @click="closeModal">
            Cancel
          </AppButton>
          <AppButton @click="saveBook">
            {{ isEditing ? 'Update Book' : 'Add Book' }}
          </AppButton>
        </template>
      </AppModal>
    </PageLayout>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '../../services/supabaseClient'
import Navbar from '../../components/Navbar.vue'
import PageLayout from '../../components/layout/PageLayout.vue'
import SectionHeader from '../../components/layout/SectionHeader.vue'
import EmptyState from '../../components/layout/EmptyState.vue'
import AppCard from '../../components/ui/AppCard.vue'
import AppButton from '../../components/ui/AppButton.vue'
import AppInput from '../../components/ui/AppInput.vue'
import AppModal from '../../components/ui/AppModal.vue'

const books = ref([])
const searchQuery = ref('')
const showModal = ref(false)
const isEditing = ref(false)
let realtimeChannel = null

const form = ref({
  id: null,
  title: '',
  author: '',
  genre: '',
  serial_code: '',
  base_daily_rate: 0,
  total_stock: 1,
  available_stock: 1,
  currently_rented: 0,
  damaged_lost_count: 0
})

onMounted(() => {
  fetchBooks()
  
  // Setup realtime subscription
  realtimeChannel = supabase
    .channel('admin_inventory_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'books'
      },
      () => {
        fetchBooks()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }
})

watch(() => form.value.genre, (newGenre) => {
  if (!isEditing.value && (!form.value.serial_code || form.value.serial_code.trim() === '')) {
    generateSerial()
  }
})

function generateSerial() {
  const genrePrefix = form.value.genre 
    ? form.value.genre.substring(0, 3).toUpperCase() 
    : 'GEN'
    
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
  
  form.value.serial_code = `${genrePrefix}-${dateStr}-${randomSuffix}`
}

async function fetchBooks() {
  const { data } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
    
  books.value = data || []
}

const filteredBooks = computed(() => {
  return books.value.filter(b => 
    b.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    b.serial_code.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

function openAddModal() {
  isEditing.value = false
  form.value = { 
    title: '', 
    author: '', 
    genre: '', 
    serial_code: '', 
    base_daily_rate: 0, 
    total_stock: 1, 
    available_stock: 1, 
    currently_rented: 0, 
    damaged_lost_count: 0 
  }
  showModal.value = true
}

function editBook(book) {
  isEditing.value = true
  form.value = { ...book }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveBook() {
  const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  const title = (form.value.title || '').trim()
  const author = (form.value.author || '').trim()
  const genre = (form.value.genre || '').trim()
  const serialCode = (form.value.serial_code || '').trim()

  if (!title || !author || !genre || !serialCode) {
    alert('Title, author, genre, and serial code are required.')
    return
  }

  const baseDailyRate = Number(form.value.base_daily_rate)
  const totalStock = Number(form.value.total_stock)
  const availableStock = Number(form.value.available_stock)
  const currentlyRented = Number(form.value.currently_rented || 0)
  const damagedLostCount = Number(form.value.damaged_lost_count || 0)

  if (![baseDailyRate, totalStock, availableStock, currentlyRented, damagedLostCount].every(Number.isFinite)) {
    alert('Please enter valid numeric values for rates and stock counts.')
    return
  }

  if (!Number.isInteger(totalStock) || !Number.isInteger(availableStock) || !Number.isInteger(currentlyRented) || !Number.isInteger(damagedLostCount)) {
    alert('Stock counts must be whole numbers.')
    return
  }

  if (baseDailyRate <= 0) {
    alert('Daily rental rate must be greater than 0.')
    return
  }

  const bookData = {
    title: toTitleCase(title),
    author: toTitleCase(author),
    genre: toTitleCase(genre),
    serial_code: serialCode.toUpperCase(),
    base_daily_rate: baseDailyRate,
    total_stock: totalStock,
    available_stock: availableStock,
    currently_rented: currentlyRented,
    damaged_lost_count: damagedLostCount
  }

  if (bookData.total_stock < 0 || bookData.available_stock < 0 || bookData.currently_rented < 0 || bookData.damaged_lost_count < 0) {
    alert("Stock counts cannot be negative.")
    return
  }

  const calculatedTotal = (bookData.available_stock || 0) + (bookData.currently_rented || 0) + (bookData.damaged_lost_count || 0)
  
  if (calculatedTotal !== bookData.total_stock) {
    alert(`Stock mismatch! Available (${bookData.available_stock}) + Rented (${bookData.currently_rented}) + Damaged (${bookData.damaged_lost_count}) must equal Total Stock (${bookData.total_stock}).`)
    return
  }

  let error
  if (isEditing.value) {
    const { error: updateError } = await supabase
      .from('books')
      .update(bookData)
      .eq('id', form.value.id)
    error = updateError
  } else {
    const { error: insertError } = await supabase
      .from('books')
      .insert(bookData)
    error = insertError
  }

  if (error) {
    alert('Error saving book: ' + error.message)
  } else {
    closeModal()
    fetchBooks()
  }
}

async function deleteBook(id) {
  if (!confirm('Are you sure you want to delete this book?')) return
  
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) {
    alert('Error deleting book: ' + error.message)
  } else {
    fetchBooks()
  }
}
</script>

<style scoped>
.controls-section {
  margin-bottom: var(--space-6);
}

.search-input {
  max-width: 500px;
}

.table-wrapper {
  overflow-x: auto;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
}

.inventory-table th {
  text-align: left;
  padding: var(--space-3);
  background-color: var(--color-bg-tertiary);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-border);
}

.inventory-table td {
  padding: var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.inventory-table tbody tr:last-child td {
  border-bottom: none;
}

.inventory-table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.book-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.book-info strong {
  color: var(--color-text-primary);
}

.book-info small {
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.low-stock {
  color: var(--color-error);
  font-weight: var(--font-weight-semibold);
}

.action-buttons {
  display: flex;
  gap: var(--space-2);
}

/* Form Styles */
.book-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.serial-input-group {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.generate-btn {
  align-self: flex-start;
  margin-top: var(--space-1);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .inventory-table {
    font-size: var(--font-size-xs);
  }
  
  .inventory-table th,
  .inventory-table td {
    padding: var(--space-2);
  }
  
  .action-buttons {
    flex-direction: column;
  }
}
</style>

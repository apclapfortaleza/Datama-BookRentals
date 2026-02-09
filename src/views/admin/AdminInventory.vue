<template>
  <Navbar />
  <div class="inventory-page">
    <div class="header">
      <h2>Book Inventory</h2>
      <div class="actions">
         <input v-model="searchQuery" placeholder="Search Title or Author..." class="search-input" />
         <button @click="openAddModal" class="add-btn">+ Add Book</button>
      </div>
    </div>

      <!-- Table -->
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Title & Author</th>
          <th>Serial / ISBN</th>
          <th>Genre</th>
          <th>Rate</th>
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
            <span :class="{ 'low-stock': book.available_stock < 3 }">{{ book.available_stock }}</span>
          </td>
          <td>{{ book.currently_rented }}</td>
          <td>{{ book.damaged_lost_count }}</td>
          <td>
            <button @click="editBook(book)" class="edit-btn">Edit</button>
            <button @click="deleteBook(book.id)" class="delete-btn">Delete</button>
          </td>
        </tr>
        <tr v-if="filteredBooks.length === 0">
          <td colspan="9" class="empty-msg">No books found.</td>
        </tr>
      </tbody>
    </table>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <h3>{{ isEditing ? 'Edit Book' : 'Add New Book' }}</h3>
        <form @submit.prevent="saveBook">
          <div class="form-group">
            <label>Title</label>
            <input v-model="form.title" required />
          </div>
          <div class="form-group">
            <label>Author</label>
            <input v-model="form.author" required />
          </div>
          <div class="form-grid">
            <div class="form-group">
              <label>Genre</label>
              <input v-model="form.genre" required />
            </div>
            <div class="form-group">
              <label>Serial Code / ISBN</label>
              <div class="input-with-action">
                <input v-model="form.serial_code" required />
                <button type="button" @click="generateSerial" class="action-btn">Generate</button>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Daily Rate (₱)</label>
            <input v-model.number="form.base_daily_rate" type="number" min="0" required />
          </div>
          
          <div class="form-grid">
            <div class="form-group">
              <label>Total Stock</label>
              <input v-model.number="form.total_stock" type="number" min="0" required />
            </div>
            <div class="form-group">
              <label>Available Stock</label>
              <input v-model.number="form.available_stock" type="number" min="0" required />
            </div>
            <div class="form-group">
              <label>Rented</label>
              <input v-model.number="form.currently_rented" type="number" min="0" />
            </div>
            <div class="form-group">
              <label>Damaged/Lost</label>
              <input v-model.number="form.damaged_lost_count" type="number" min="0" />
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="cancel-btn">Cancel</button>
            <button type="submit" class="save-btn">{{ isEditing ? 'Update' : 'Create' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../../services/supabaseClient'
import Navbar from '../../components/Navbar.vue'

const books = ref([])
const searchQuery = ref('')
const showModal = ref(false)
const isEditing = ref(false)
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

onMounted(fetchBooks)

// Auto-generate serial if empty when genre changes
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
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase()
  
  form.value.serial_code = `${genrePrefix}-${dateStr}-${randomSuffix}`
}

async function fetchBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) console.error('Error fetching books:', error)
  else books.value = data
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
      title: '', author: '', genre: '', serial_code: '', 
      base_daily_rate: 0, 
      total_stock: 1, available_stock: 1, currently_rented: 0, damaged_lost_count: 0 
  }
  showModal.value = true
}

function editBook(book) {
  isEditing.value = true
  form.value = { ...book } // Copy book data
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveBook() {
  const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  const bookData = {
    title: toTitleCase(form.value.title),
    author: toTitleCase(form.value.author),
    genre: toTitleCase(form.value.genre),
    serial_code: form.value.serial_code.toUpperCase(),
    base_daily_rate: form.value.base_daily_rate,
    total_stock: form.value.total_stock,
    available_stock: form.value.available_stock,
    currently_rented: form.value.currently_rented,
    damaged_lost_count: form.value.damaged_lost_count
  }

  // Validation
  if (bookData.total_stock < 0 || bookData.available_stock < 0 || bookData.currently_rented < 0 || bookData.damaged_lost_count < 0) {
    alert("Stock counts cannot be negative.");
    return;
  }

  const calculatedTotal = (bookData.available_stock || 0) + (bookData.currently_rented || 0) + (bookData.damaged_lost_count || 0);
  
  if (calculatedTotal !== bookData.total_stock) {
    alert(`Stock mismatch! Available (${bookData.available_stock}) + Rented (${bookData.currently_rented}) + Damaged (${bookData.damaged_lost_count}) must equal Total Stock (${bookData.total_stock}).`);
    return;
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
  if (error) alert('Error deleting book: ' + error.message)
  else fetchBooks()
}
</script>

<style scoped>
.inventory-page { max-width: 1200px; margin: 40px auto; padding: 0 20px; }

.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header h2 { margin: 0; color: #0047ab; }

.actions { display: flex; gap: 15px; }
.search-input { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; width: 250px; }
.add-btn { background: #0047ab; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; }
.add-btn:hover { background: #003580; }

.inventory-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.inventory-table th, .inventory-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
.inventory-table th { background: #f8f9fa; font-weight: 600; color: #555; }

.book-info { display: flex; flex-direction: column; }
.book-info small { color: #777; }

.stock-control { display: flex; align-items: center; gap: 10px; }
.stock-btn { background: #f0f0f0; border: none; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-weight: bold; }
.stock-btn:hover { background: #e0e0e0; }

.edit-btn { background: #ffc107; color: #333; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 0.85rem; }
.delete-btn { background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }

.empty-msg { text-align: center; color: #888; padding: 20px; }

/* Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;
}
.modal-content { 
  background: white; 
  padding: 30px; 
  border-radius: 12px; 
  width: 500px; 
  max-width: 90%; 
  max-height: 90vh;
  overflow-y: auto;
}
.modal-content h3 { margin-top: 0; color: #0047ab; margin-bottom: 20px; }

.form-group { margin-bottom: 15px; }
.form-group label { display: block; margin-bottom: 5px; font-weight: 600; color: #555; }
.form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.cancel-btn { background: #f8f9fa; border: 1px solid #ccc; padding: 10px 20px; border-radius: 6px; cursor: pointer; }
.save-btn { background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; }

.input-with-action { display: flex; gap: 8px; }
.input-with-action input { flex: 1; }
.action-btn { background: #6c757d; color: white; border: none; padding: 0 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; }
.action-btn:hover { background: #5a6268; }
</style>

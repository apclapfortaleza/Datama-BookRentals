<template>
  <Navbar />
  <div class="rent-page-container">
    <div class="rent-grid">
      <!-- Left: Search & Form -->
      <div class="rent-card form-section">
        <div class="card-header">
          <h3>Rent a Book</h3>
          <p class="subtitle">Search to add books to your cart.</p>
        </div>
        
        <div class="form-body">
          <div class="input-group relative-group">
            <label>Book Serial Code, Title, or Author</label>
            <input 
              v-model="serialSearch" 
              @input="findBook" 
              placeholder="ISBN-1234..." 
              autocomplete="off"
              class="modern-input"
            />
            
            <ul v-if="suggestions.length" class="suggestions">
              <li v-for="b in suggestions" :key="b.id" @click="selectBook(b)">
                <span class="code">{{ b.serial_code }}</span>
                <span class="title">{{ b.title }}</span>
              </li>
            </ul>
          </div>

          <div class="input-group">
            <div v-if="selectedBook" class="preview-box">
             <BookDetail 
              :book="selectedBook" 
              :userType="currentUserType" 
            />
            <div class="qty-selection" style="margin-top: 15px; display: flex; align-items: center; gap: 10px;">
                <label>Quantity:</label>
                <input type="number" v-model="quantity" min="1" :max="selectedBook.available_stock" class="qty-input" style="width: 60px; padding: 5px;">
            </div>
            <button @click="addToCart" class="add-cart-btn">Add to Cart</button>
          </div>
          <div v-else class="placeholder-box">
            <p>Select a book to preview details</p>
          </div>
        </div>
      </div>
    </div>

      <!-- Right: Cart Summary -->
      <div class="rent-card cart-section">
        <div class="card-header">
          <h3>Your Cart</h3>
          <div class="header-badges">
             <span v-if="hasDiscount" class="discount-badge">20% Off Active</span>
             <span class="badge">{{ cart.length }} items</span>
          </div>
        </div>
        
        <div class="cart-body">
          <ul v-if="cart.length" class="cart-list">
            <li v-for="(item, index) in cart" :key="index" class="cart-item">
              <div class="item-details">
                <strong>{{ item.book.title }} <span v-if="item.quantity > 1">x{{ item.quantity }}</span></strong>
                <small>₱{{ item.book.base_daily_rate }}/day</small>
              </div>
              <button @click="removeFromCart(index)" class="remove-btn">
                &times;
              </button>
            </li>
          </ul>
          <div v-else class="empty-cart">
            <p>Your cart is empty.</p>
          </div>
        </div>
        
        <div class="cart-footer">
          <div class="duration-section">
            <label>Rental Duration (Days):</label>
            <div class="days-control">
              <button @click="days > 1 ? days-- : null" class="control-btn">-</button>
              <div class="days-display">{{ days }}</div>
              <button @click="days++" class="control-btn">+</button>
            </div>
          </div>
        
          <div class="total-row">
            <span>Total Estimated</span>
            <div class="price-display">
                <span v-if="hasDiscount" class="original-price">₱{{ originalTotal }}</span>
                <span class="total-price">₱{{ cartTotal }}</span>
            </div>
          </div>
          <button @click="checkout" class="checkout-btn" :disabled="cart.length === 0">
            Submit Rental Request
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Navbar from '../../components/Navbar.vue';
import BookDetail from '../../components/BookDetail.vue';
import { supabase } from '../../services/supabaseClient';
import { useRouter } from 'vue-router';

const router = useRouter();

// State Variables
const currentUserType = ref('regular');
const serialSearch = ref('');
const suggestions = ref([]);
const selectedBook = ref(null);
const days = ref(1);
const quantity = ref(1);

const selectBook = (book) => {
  selectedBook.value = book;
  serialSearch.value = book.serial_code; // Auto-complete with serial
  suggestions.value = []; // Hide suggestions
  days.value = 1; // Reset days
  quantity.value = 1; // Reset quantity
};

// Logic: Search for books via Supabase REST API
const findBook = async () => {
  if (serialSearch.value.length < 2) {
    suggestions.value = [];
    return;
  }
  const { data } = await supabase
    .from('books')
    .select('*')
    .or(`serial_code.ilike.%${serialSearch.value}%,title.ilike.%${serialSearch.value}%,author.ilike.%${serialSearch.value}%`);
  suggestions.value = data;
};

// Logic: Cart System
const cart = ref([]);

const addToCart = () => {
  if (!selectedBook.value) return;
  
  if (selectedBook.value.available_stock < quantity.value) {
    alert(`Only ${selectedBook.value.available_stock} copies available.`);
    return;
  }
  
  // Check if already in cart
  const exists = cart.value.find(item => item.book.id === selectedBook.value.id);
  if (exists) {
    alert('Book is already in your cart.');
    return;
  }
  
  cart.value.push({
    book: selectedBook.value,
    quantity: quantity.value
  });
  
  // Reset selection
  selectedBook.value = null;
  serialSearch.value = '';
};

const removeFromCart = (index) => {
  cart.value.splice(index, 1);
};

const hasDiscount = computed(() => {
  return ['student', 'pwd', 'senior'].includes(currentUserType.value);
});

const originalTotal = computed(() => {
  const totalBase = cart.value.reduce((sum, item) => sum + (item.book.base_daily_rate * item.quantity), 0);
  return (totalBase * days.value).toFixed(2);
});

const cartTotal = computed(() => {
  const totalBase = cart.value.reduce((sum, item) => sum + (item.book.base_daily_rate * item.quantity), 0);
  const totalWithDays = totalBase * days.value;
  
  return hasDiscount.value
      ? (totalWithDays * 0.8).toFixed(2) 
      : totalWithDays.toFixed(2);
});

// Logic: Checkout
const checkout = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    alert('You must be logged in to rent a book.');
    router.push('/');
    return;
  }
  
  if (cart.value.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  
  if (days.value < 1) {
    alert('Rental duration must be at least 1 day.');
    return;
  }

  // Calculate Financials
  const subtotal = cart.value.reduce((sum, item) => sum + (item.book.base_daily_rate * days.value * item.quantity), 0);
  const total = Number(cartTotal.value);
  const discountAmount = (subtotal - total).toFixed(2);
  let discountName = null;
  
  if (hasDiscount.value) {
      const type = currentUserType.value;
      // Capitalize first letter
      const typeName = type.charAt(0).toUpperCase() + type.slice(1); 
      discountName = `${typeName} 20%`;
  }

  // Calculate Due Date based on global days
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + days.value);
  
  // Create Rental Request Header
  const { data: request, error: reqError } = await supabase
    .from('rental_requests')
    .insert({
      user_id: user.id,
      status: 'pending',
      total_price: total,
      subtotal: subtotal.toFixed(2),
      discount_amount: discountAmount,
      discount_name: discountName,
      due_date: dueDate.toISOString()
    })
    .select()
    .single();

  if (reqError) {
    alert('Error creating request: ' + reqError.message);
    return;
  }

  // Create Rental Items
  const items = cart.value.map(item => ({
    rental_request_id: request.id,
    book_id: item.book.id,
    days_count: days.value,
    quantity: item.quantity,
    price: (item.book.base_daily_rate * days.value * item.quantity * (hasDiscount.value ? 0.8 : 1)).toFixed(2)
  }));

  const { error: itemError } = await supabase
    .from('rental_items')
    .insert(items);

  if (itemError) {
    alert('Error saving items: ' + itemError.message);
  } else {
    alert('Rental request submitted! Please wait for approval.');
    cart.value = [];
    days.value = 1; // Reset days
    quantity.value = 1; 
  }
};

// Logic: Get User Role on Load
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();
    if (data && data.user_type) currentUserType.value = data.user_type.toLowerCase();
  }
});
</script>

<style scoped>
.rent-page-container {
  max-width: 1200px;
  margin: 40px auto;
  padding: 0 20px;
}

.rent-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 30px;
  align-items: start;
}

/* Card Common */
.rent-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08); /* Slightly stronger shadow */
  border: 1px solid #f0f0f0;
  overflow: hidden;
}

.cart-section {
  position: sticky;
  top: 90px; /* Assuming navbar height */
}

.card-header {
  padding: 20px;
  background: #fff; /* Clean white header */
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 { margin: 0; color: #1a1a1a; font-size: 1.25rem; font-weight: 700; }
.subtitle { margin: 5px 0 0; color: #666; font-size: 0.9rem; }
.badge { background: #e3f2fd; color: #0047ab; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }

.form-body, .cart-body { padding: 25px; }

/* Inputs */
.input-group { margin-bottom: 25px; }
.input-group label { display: block; font-weight: 600; margin-bottom: 8px; color: #333; font-size: 0.95rem; }
.modern-input {
  width: 100%; padding: 14px; border: 1px solid #e0e0e0; border-radius: 8px;
  transition: all 0.2s; font-size: 1rem; background: #fafafa;
}
.modern-input:focus { border-color: #0047ab; background: white; box-shadow: 0 0 0 3px rgba(0, 71, 171, 0.1); outline: none; }

/* Suggestions */
.relative-group { position: relative; }
.suggestions {
  position: absolute; top: 100%; left: 0; right: 0; background: white;
  border: 1px solid #eee; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  z-index: 100; max-height: 300px; overflow-y: auto; list-style: none; padding: 0; margin-top: 5px;
}
.suggestions li { padding: 14px; cursor: pointer; border-bottom: 1px solid #f5f5f5; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
.suggestions li:hover { background: #f8f9fa; }
.suggestions .code { font-weight: 600; color: #0047ab; font-size: 0.9rem; background: #e3f2fd; padding: 2px 6px; border-radius: 4px; }
.suggestions .title { color: #333; font-weight: 500; }

/* Preview */
.preview-box { background: white; border: 1px solid #eee; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
.placeholder-box { 
  display: flex; align-items: center; justify-content: center; height: 200px; 
  background: #f8f9fa; border: 2px dashed #e0e0e0; border-radius: 12px; color: #999;
  font-weight: 500;
}

/* Actions */
.add-cart-btn {
  width: 100%; background: #10b981; /* Green */ color: white; border: none; padding: 14px;
  border-radius: 8px; font-weight: 600; margin-top: 20px; cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
}
.add-cart-btn:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }

/* Cart List */
.cart-list { list-style: none; padding: 0; margin: 0; }
.cart-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 0; border-bottom: 1px solid #f0f0f0;
}
.cart-item:last-child { border-bottom: none; }
.item-details strong { display: block; font-size: 1rem; color: #1a1a1a; margin-bottom: 4px; }
.item-details small { color: #666; font-size: 0.85rem; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }

.remove-btn { 
  background: #fee2e2; color: #ef4444; border: none; width: 32px; height: 32px; border-radius: 50%;
  font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.remove-btn:hover { background: #fca5a5; color: white; }

.empty-cart { text-align: center; color: #9ca3af; padding: 40px 20px; font-style: normal; }

.cart-footer { background: #fafafa; padding: 25px; border-top: 1px solid #eee; }

.duration-section {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
  background: white; padding: 10px 15px; border-radius: 8px; border: 1px solid #eee;
}
.duration-section label { margin: 0; font-weight: 600; color: #444; }

/* Updated Days Control */
.days-control { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
.control-btn { background: #f1f5f9; border: none; padding: 5px 12px; font-size: 1rem; cursor: pointer; color: #334155; transition: 0.2s; }
.control-btn:hover { background: #e2e8f0; }
.days-display { width: 40px; text-align: center; font-weight: 700; background: white; font-size: 1rem; line-height: 28px; }

.total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 1.1rem; }
.total-price { font-weight: 800; color: #0047ab; font-size: 1.5rem; }

.header-badges { display: flex; align-items: center; gap: 8px; }
.discount-badge {
  background: #dcfce7; color: #166534; font-size: 0.75rem; 
  font-weight: 700; padding: 4px 8px; border-radius: 4px;
}
.price-display { display: flex; flex-direction: column; align-items: flex-end; }
.original-price { 
  font-size: 0.9rem; color: #999; text-decoration: line-through; 
  margin-bottom: -4px; 
}

.checkout-btn {
  width: 100%; background: #0047ab; color: white; border: none; padding: 16px;
  border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 1.05rem;
  box-shadow: 0 4px 10px rgba(0, 71, 171, 0.2);
}
.checkout-btn:hover:not(:disabled) { background: #003580; transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0, 71, 171, 0.3); }
.checkout-btn:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; color: #64748b; }

@media (max-width: 768px) {
  .rent-grid { grid-template-columns: 1fr; }
  .cart-section { position: static; margin-top: 30px; }
}
</style>

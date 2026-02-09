<template>
  <div class="book-card">
    <div class="card-header">
      <h4>{{ book.title }}</h4>
      <span class="serial">#{{ book.serial_code }}</span>
    </div>
    <div class="card-body">
      <p><strong>Author:</strong> {{ book.author }}</p>
      <p><strong>Genre:</strong> {{ book.genre }}</p>
      <hr />
      <div class="pricing">
        <p class="rate">Base Rate: ₱{{ book.base_daily_rate }}/day</p>
        <p v-if="hasDiscount" class="discount-text">
          20% Discount Available ({{ userType }})
        </p>
        <p class="stock" :class="{ 'no-stock': book.available_stock <= 0 }">
          {{ book.available_stock > 0 ? `Stock Available: ${book.available_stock}` : 'Out of Stock' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  book: Object,
  userType: String
});

const hasDiscount = computed(() => {
  return ['student', 'pwd', 'senior'].includes(props.userType);
});
</script>

<style scoped>
.book-card {
  background: white;
  border: none;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: transform 0.2s;
}

.card-header {
  background: #0047ab;
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h4 { margin: 0; font-size: 1.1rem; }
.serial { background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; }

.card-body { padding: 20px; }
.card-body p { margin: 8px 0; color: #555; }

hr { border: 0; border-top: 1px solid #eee; margin: 15px 0; }

.discount-text { color: #2e7d32; background: #e8f5e9; padding: 5px 10px; border-radius: 4px; display: inline-block; font-size: 0.9rem; margin-top: 5px;}
.total { font-size: 1.4rem; color: #d32f2f; font-weight: 800; margin-top: 15px; }
.stock { font-weight: 600; color: #0047ab; margin-top: 5px; }
</style>
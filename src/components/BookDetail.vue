<template>
  <div class="book-detail">
    <div class="book-header">
      <h4 class="book-title">{{ book.title }}</h4>
      <span v-if="book.available_stock > 0" class="stock-badge stock-available">
        {{ book.available_stock }} Available
      </span>
      <span v-else class="stock-badge stock-unavailable">
        Out of Stock
      </span>
    </div>
    
    <div class="book-info">
      <div class="info-row">
        <span class="info-label">Serial Code</span>
        <span class="info-value">{{ book.serial_code }}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Author</span>
        <span class="info-value">{{ book.author || 'N/A' }}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Genre</span>
        <span class="info-value">{{ book.genre || 'N/A' }}</span>
      </div>
      
      <div class="info-row">
        <span class="info-label">Total Stock</span>
        <span class="info-value">{{ book.total_stock || 0 }}</span>
      </div>
      
      <div v-if="book.currently_rented > 0" class="info-row">
        <span class="info-label">Currently Rented</span>
        <span class="info-value">{{ book.currently_rented }}</span>
      </div>
    </div>
    
    <div class="pricing-section">
      <div class="price-row">
        <span class="price-label">Base Rate</span>
        <span class="price-value">₱{{ book.base_daily_rate }}/day</span>
      </div>
      
      <div v-if="hasDiscount" class="discount-info">
        <span class="discount-badge">
          {{ discountText }} - 20% Discount Applied
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  book: {
    type: Object,
    required: true
  },
  userType: {
    type: String,
    default: 'regular'
  }
})

const hasDiscount = computed(() => {
  return ['student', 'pwd', 'senior'].includes(props.userType.toLowerCase())
})

const discountText = computed(() => {
  const type = props.userType.toLowerCase()
  if (type === 'student') return 'Student'
  if (type === 'pwd') return 'PWD'
  if (type === 'senior') return 'Senior Citizen'
  return ''
})
</script>

<style scoped>
.book-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.book-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.book-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0;
  flex: 1;
}

.stock-badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.stock-available {
  background-color: var(--color-success);
  color: white;
}

.stock-unavailable {
  background-color: var(--color-error);
  color: white;
}

.book-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
}

.info-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.info-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-medium);
  text-align: right;
}

.pricing-section {
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.price-value {
  font-size: var(--font-size-lg);
  color: var(--color-primary);
  font-weight: var(--font-weight-bold);
}

.discount-info {
  display: flex;
  justify-content: center;
}

.discount-badge {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  background-color: #dcfce7;
  color: #166534;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}
</style>

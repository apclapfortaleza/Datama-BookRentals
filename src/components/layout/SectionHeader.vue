<template>
  <div class="section-header">
    <div class="section-title-wrapper">
      <h2 v-if="title" class="section-title">{{ title }}</h2>
      <p v-if="description" class="section-description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="section-action">
      <slot name="action"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.section-title-wrapper {
  flex: 1;
}

.section-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
}

.section-description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
}

.section-action {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
  }
  
  .section-action {
    width: 100%;
  }
}
</style>

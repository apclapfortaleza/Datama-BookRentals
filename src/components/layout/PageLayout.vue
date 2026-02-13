<template>
  <div class="page-layout">
    <slot></slot>
  </div>
</template>

<script setup>
// Simple container component for page layout
</script>

<style scoped>
.page-layout {
  min-height: calc(100vh - var(--navbar-height));
  padding: var(--space-8) var(--space-4);
  max-width: var(--container-max-width);
  margin: 0 auto;
}

@media (max-width: 768px) {
  .page-layout {
    padding: var(--space-4);
  }
}
</style>

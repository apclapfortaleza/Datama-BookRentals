<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <h1 class="not-found-title">404</h1>
      <h2 class="not-found-subtitle">Page Not Found</h2>
      <p class="not-found-description">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <AppButton size="lg" @click="() => $router.push('/')">
        Go to Homepage
      </AppButton>
    </div>
  </div>
</template>

<script setup>
import AppButton from '../components/ui/AppButton.vue'
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
}

.not-found-content {
  text-align: center;
  max-width: 500px;
}

.not-found-title {
  font-size: 8rem;
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
  line-height: 1;
  margin: 0;
}

.not-found-subtitle {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  margin: var(--space-4) 0;
}

.not-found-description {
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
}

@media (max-width: 768px) {
  .not-found-title {
    font-size: 6rem;
  }
  
  .not-found-subtitle {
    font-size: var(--font-size-2xl);
  }
}
</style>

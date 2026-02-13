<template>
  <header class="header">
    <nav class="nav-container">
      <div class="nav-brand">
        <a href="#" class="brand-link" @click.prevent>
          <span class="brand-text">{{ appName }}</span>
        </a>
      </div>
      
      <div :class="['nav-menu', { 'nav-menu-open': mobileMenuOpen }]">
        <div class="nav-links">
          <slot name="nav-links"></slot>
        </div>
        
        <div class="nav-actions">
          <slot name="nav-actions"></slot>
        </div>
      </div>
      
      <button 
        class="nav-toggle" 
        @click="toggleMobileMenu"
        aria-label="Toggle navigation menu"
      >
        <span class="nav-toggle-icon"></span>
      </button>
    </nav>
  </header>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  appName: {
    type: String,
    default: 'PH-BookRent'
  }
});

const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-dropdown);
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  height: var(--navbar-height);
}

.nav-container {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0 var(--space-4);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
}

.nav-brand {
  flex-shrink: 0;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-primary);
  text-decoration: none;
}

.brand-text {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary);
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  flex: 1;
  justify-content: space-between;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2);
  width: 40px;
  height: 40px;
  position: relative;
}

.nav-toggle-icon {
  display: block;
  width: 24px;
  height: 2px;
  background-color: var(--color-text-primary);
  position: relative;
  transition: background-color var(--transition-fast);
}

.nav-toggle-icon::before,
.nav-toggle-icon::after {
  content: '';
  display: block;
  width: 24px;
  height: 2px;
  background-color: var(--color-text-primary);
  position: absolute;
  left: 0;
  transition: all var(--transition-fast);
}

.nav-toggle-icon::before {
  top: -8px;
}

.nav-toggle-icon::after {
  bottom: -8px;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .nav-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .nav-menu {
    position: fixed;
    top: var(--navbar-height);
    left: 0;
    right: 0;
    background-color: var(--color-bg-primary);
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-4);
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-4);
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all var(--transition-base);
  }
  
  .nav-menu-open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
  
  .nav-links {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }
  
  .nav-actions {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }
}
</style>

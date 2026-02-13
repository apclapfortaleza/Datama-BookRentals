<template>
  <div class="home-page">
    <AppHeader :app-name="'PH-BookRent'">
      <template #nav-actions>
        <AppButton variant="ghost" @click="() => $router.push('/login')">
          Login
        </AppButton>
        <AppButton @click="() => $router.push('/register')">
          Register
        </AppButton>
      </template>
    </AppHeader>
    
    <main class="home-content">
      <div class="hero-section">
        <div class="hero-text">
          <h1 class="hero-title">Book Rental Made Simple</h1>
          <p class="hero-description">
            Browse, rent, and enjoy thousands of books with ease. Your next great read is just a click away.
          </p>
          <div class="hero-actions">
            <AppButton size="lg" @click="() => $router.push('/register')">
              Get Started
            </AppButton>
            <AppButton size="lg" variant="ghost" @click="() => $router.push('/login')">
              Sign In
            </AppButton>
          </div>
        </div>
      </div>
      
      <div class="features-section">
        <div class="container">
          <SectionHeader 
            title="Why Choose PH-BookRent?"
            description="Simple, affordable, and convenient book rental service"
          />
          
          <div class="grid grid-cols-3 gap-6">
            <AppCard hoverable>
              <div class="feature-icon">📚</div>
              <h3>Wide Selection</h3>
              <p class="text-secondary">Access to thousands of books across all genres</p>
            </AppCard>
            
            <AppCard hoverable>
              <div class="feature-icon">💰</div>
              <h3>Affordable Pricing</h3>
              <p class="text-secondary">Rent books at competitive rates that fit your budget</p>
            </AppCard>
            
            <AppCard hoverable>
              <div class="feature-icon">⚡</div>
              <h3>Quick & Easy</h3>
              <p class="text-secondary">Simple rental process with instant confirmation</p>
            </AppCard>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import AppHeader from '../components/layout/AppHeader.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppCard from '../components/ui/AppCard.vue'
import SectionHeader from '../components/layout/SectionHeader.vue'
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

.home-content {
  flex: 1;
}

.hero-section {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-4);
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg-secondary) 100%);
}

.hero-text {
  max-width: 700px;
  text-align: center;
}

.hero-title {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-4);
  line-height: 1.2;
}

.hero-description {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
  line-height: var(--line-height-relaxed);
}

.hero-actions {
  display: flex;
  gap: var(--space-4);
  justify-content: center;
  flex-wrap: wrap;
}

.features-section {
  padding: var(--space-16) var(--space-4);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: var(--space-4);
}

@media (max-width: 768px) {
  .hero-title {
    font-size: var(--font-size-3xl);
  }
  
  .hero-description {
    font-size: var(--font-size-lg);
  }
  
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }
}
</style>

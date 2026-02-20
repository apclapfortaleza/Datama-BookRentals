<template>
  <div class="auth-page">
    <div class="auth-container">
      <AppCard>
        <div class="auth-header">
          <h1>Welcome Back</h1>
          <p class="text-secondary">Sign in to your account to continue</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="auth-form">
          <AppInput
            v-model="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            required
            :error="errors.email"
          />
          
          <AppInput
            v-model="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            required
            :error="errors.password"
          />
          
          <AppButton 
            type="submit" 
            :loading="loading" 
            block
            size="lg"
          >
            Sign In
          </AppButton>
        </form>
        
        <div class="auth-footer">
          <p>Don't have an account? 
            <router-link to="/register" class="auth-link">Register here</router-link>
          </p>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from '../services/supabaseClient'
import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppButton from '../components/ui/AppButton.vue'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errors = ref({})

onMounted(() => {
  if (route.query.pending === '1') {
    errors.value.email = 'Account created. Please wait for admin approval before signing in.'
  } else if (route.query.approval === 'required') {
    errors.value.email = 'Your account is not approved yet. Please wait for admin approval.'
  }
})

const handleLogin = async () => {
  errors.value = {}
  loading.value = true
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (error) throw error
    
    // Check account status and role before redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, status')
      .eq('id', data.user.id)
      .single()

    if (profile?.status !== 'approved') {
      await supabase.auth.signOut()
      errors.value.email = 'Your account is pending admin approval.'
      return
    }
    
    if (profile?.user_type === 'admin') {
      router.push('/admin')
    } else {
      router.push('/rent')
    }
  } catch (error) {
    errors.value.email = error.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-bg-secondary) 100%);
}

.auth-container {
  width: 100%;
  max-width: 450px;
}

.auth-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.auth-header h1 {
  font-size: var(--font-size-3xl);
  margin-bottom: var(--space-2);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-footer {
  margin-top: var(--space-6);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.auth-link {
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
}

.auth-link:hover {
  text-decoration: underline;
}
</style>

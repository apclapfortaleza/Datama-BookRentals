<template>
  <div class="auth-page">
    <div class="auth-container">
      <AppCard>
        <div class="auth-header">
          <h1>Create Account</h1>
          <p class="text-secondary">Sign up to start renting books</p>
        </div>
        
        <form @submit.prevent="handleRegister" class="auth-form">
          <div class="form-row">
            <AppInput
              v-model="formData.firstName"
              label="First Name"
              placeholder="Enter first name"
              required
              :error="errors.firstName"
            />
            
            <AppInput
              v-model="formData.lastName"
              label="Last Name"
              placeholder="Enter last name"
              required
              :error="errors.lastName"
            />
          </div>
          
          <AppInput
            v-model="formData.email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            required
            :error="errors.email"
          />
          
          <AppInput
            v-model="formData.contactNumber"
            type="tel"
            label="Contact Number"
            placeholder="Enter contact number"
            required
            :error="errors.contactNumber"
          />

          <AppSelect
            v-model="formData.userType"
            label="User Type"
            placeholder="Select user type"
            :options="userTypeOptions"
            required
            :error="errors.userType"
          />
          
          <AppInput
            v-model="formData.password"
            type="password"
            label="Password"
            placeholder="Create a password"
            required
            :error="errors.password"
          />
          
          <AppInput
            v-model="formData.confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            required
            :error="errors.confirmPassword"
          />
          
          <AppButton 
            type="submit" 
            :loading="loading" 
            block
            size="lg"
          >
            Create Account
          </AppButton>
        </form>
        
        <div class="auth-footer">
          <p>Already have an account? 
            <router-link to="/login" class="auth-link">Sign in here</router-link>
          </p>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabaseClient'
import AppCard from '../components/ui/AppCard.vue'
import AppInput from '../components/ui/AppInput.vue'
import AppButton from '../components/ui/AppButton.vue'
import AppSelect from '../components/ui/AppSelect.vue'

const router = useRouter()

const formData = ref({
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  userType: '',
  password: '',
  confirmPassword: ''
})

const userTypeOptions = [
  { value: 'student', label: 'Student' },
  { value: 'regular', label: 'Regular' },
  { value: 'pwd', label: 'PWD' },
  { value: 'senior', label: 'Senior' }
]

const loading = ref(false)
const errors = ref({})

const validateForm = () => {
  errors.value = {}

  if (!formData.value.userType) {
    errors.value.userType = 'Please select a user type'
    return false
  }
  
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
    return false
  }
  
  if (formData.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    return false
  }
  
  return true
}

const handleRegister = async () => {
  if (!validateForm()) return
  
  loading.value = true
  const validUntil = new Date()
  validUntil.setFullYear(validUntil.getFullYear() + 1)
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.value.email,
      password: formData.value.password,
      options: {
        data: {
          first_name: formData.value.firstName,
          last_name: formData.value.lastName,
          contact_number: formData.value.contactNumber,
          user_type: formData.value.userType
        }
      }
    })
    
    if (error) throw error
    
    // Create profile in database
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: data.user.id,
        first_name: formData.value.firstName,
        last_name: formData.value.lastName,
        email: formData.value.email,
        contact_number: formData.value.contactNumber,
        user_type: formData.value.userType,
        valid_until: validUntil.toISOString(),
        status: 'pending'
      }])
    
    if (profileError) throw profileError
    
    await supabase.auth.signOut()
    router.push({
      name: 'Login',
      query: { pending: '1' }
    })
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
  max-width: 600px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }
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

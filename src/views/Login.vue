<template>
  <div class="page-wrapper">
    <div class="auth-container">
      <h2>Login</h2>
      <form @submit.prevent="handleLogin">
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" required />
        <button type="submit" class="btn-primary">Login</button>
      </form>
      <p style="margin-top: 20px;">
        Don't have an account? <router-link to="/register">Register here</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()

const handleLogin = async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  if (error) {
    alert(error.message)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check if user is a clerk/admin
    const { data: clerk } = await supabase.from('clerks').select('*').eq('id', user.id).single()
    
    if (clerk) {
      router.push('/admin')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('status').eq('id', user.id).single()
    
    if (profile?.status === 'approved') {
       router.push('/rent')
    } else {
       alert('Your account is pending approval.')
       await supabase.auth.signOut()
    }
  }
}
</script>

<style scoped>
.page-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}
.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
input {
  display: block;
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.5rem;
}
button {
  width: 100%;
  padding: 0.5rem;
  background-color: #0047ab;
  color: white;
  border: none;
  cursor: pointer;
}
</style>

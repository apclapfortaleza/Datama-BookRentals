<template>
  <div class="auth-container">
    <h2>Register Account</h2>
    <form @submit.prevent="handleRegister">
      <input v-model="firstName" type="text" placeholder="First Name" required />
      <input v-model="lastName" type="text" placeholder="Last Name" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="contactNumber" type="text" placeholder="Contact Number (e.g. 09959314172)" maxlength="11" required />
      <input v-model="password" type="password" placeholder="Password" required />
      <select v-model="userType">
        <option value="regular">Regular</option>
        <option value="student">Student (20% Off)</option>
        <option value="senior">Senior Citizen (20% Off)</option>
        <option value="pwd">PWD (20% Off)</option>
      </select>
      <button type="submit" class="btn-primary">Create Account</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabaseClient'

const router = useRouter()
const email = ref('')
const contactNumber = ref('')
const password = ref('')
const firstName = ref('')
const lastName = ref('')
const userType = ref('regular')

const handleRegister = async () => {
  const contactPattern = /^09\d{9}$/
  if (!contactPattern.test(contactNumber.value)) {
    alert('Invalid Contact Number. Format must be: 09XXXXXXXXX')
    return
  }

  try {
    const formattedEmail = email.value.trim().toLowerCase();
    const toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    
    const { data, error } = await supabase.auth.signUp({ email: formattedEmail, password: password.value })
    if (error) throw error
  if (data.user) {
    // Set renewal date to 1 year from now
    const renewalDate = new Date()
    renewalDate.setFullYear(renewalDate.getFullYear() + 1)

    await supabase.from('profiles').insert({
      id: data.user.id,
      user_type: userType.value,
      first_name: toTitleCase(firstName.value.trim()),
      last_name: toTitleCase(lastName.value.trim()),
      email: formattedEmail,
      contact_number: contactNumber.value.trim(),
      valid_until: renewalDate.toISOString(),
      status: 'pending'
    })
    alert('Registration successful! Please wait for admin approval.')
    router.push('/')
  }
  } catch (error) {
    alert(error.message)
  }
}
</script>
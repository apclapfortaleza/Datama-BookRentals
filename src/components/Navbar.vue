<template>
  <nav class="navbar">
    <div class="logo">PH-BookRent</div>
    <div class="links">
      <router-link to="/rent">Rent a Book</router-link>
      <div v-if="isAdmin" class="admin-links">
        <router-link to="/admin" class="admin-link">Requests</router-link>
        <router-link to="/admin/records" class="admin-link">Records</router-link>
        <router-link to="/admin/inventory" class="admin-link">Inventory</router-link>
      </div>
      <button @click="handleLogout">Logout</button>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from '../services/supabaseClient';
import { useRouter } from 'vue-router';

const router = useRouter();
const isAdmin = ref(false);

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Check if user is in clerks table
    const { data: clerk } = await supabase
      .from('clerks')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (clerk) {
      isAdmin.value = true;
    } else {
      // Fallback check (if needed)
      const { data } = await supabase.from('profiles').select('user_type').eq('id', user.id).single();
      if (data?.user_type === 'admin') isAdmin.value = true;
    }
  }
});

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push('/');
};
</script>

<style scoped>
/* Scoped styles are mostly handled by global css now */
.admin-links { display: inline-flex; gap: 10px; margin-left: 20px; }
.admin-link {
  color: #d32f2f !important;
  font-weight: 600;
}
</style>
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import RentBook from '../views/customer/Rentbook.vue'
import AdminDashboard from '../views/admin/AdminDashboard.vue'
import { supabase } from '../services/supabaseClient'

const routes = [
  { path: '/', component: Login },
  { path: '/register', component: Register },
  { path: '/rent', component: RentBook },
  { 
    path: '/admin', 
    component: AdminDashboard,
    meta: { requiresAdmin: true }
  },
  { 
    path: '/admin/records', 
    component: () => import('../views/admin/AdminRecords.vue'),
    meta: { requiresAdmin: true }
  },
  { 
    path: '/admin/inventory', 
    component: () => import('../views/admin/AdminInventory.vue'),
    meta: { requiresAdmin: true }
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAdmin) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      next('/')
      return
    }
    
    const { data: clerk } = await supabase
      .from('clerks')
      .select('id')
      .eq('id', user.id)
      .single()
      
    if (clerk) {
      next()
    } else {
      next('/') // Redirect non-admins to login/home
    }
  } else {
    next()
  }
})
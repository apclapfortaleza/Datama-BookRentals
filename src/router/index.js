import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../services/supabaseClient'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomePage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/rent',
    name: 'RentBook',
    component: () => import('../views/customer/Rentbook.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/history',
    name: 'RentalHistory',
    component: () => import('../views/customer/RentalHistory.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('../views/admin/AdminDashboard.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/records',
    name: 'AdminRecords',
    component: () => import('../views/admin/AdminRecords.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/inventory',
    name: 'AdminInventory',
    component: () => import('../views/admin/AdminInventory.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../pages/NotFoundPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  
  if (requiresAuth) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    
    if (requiresAdmin) {
      // Check if user is admin
      const { data: clerk } = await supabase
        .from('clerks')
        .select('id')
        .eq('id', user.id)
        .single()
      
      if (!clerk) {
        // Fallback check
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single()
        
        if (profile?.user_type !== 'admin') {
          next({ name: 'RentBook' })
          return
        }
      }
    }
  }
  
  next()
})

export default router

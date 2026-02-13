import { ref, onMounted } from 'vue'
import { supabase } from '../services/supabaseClient'

const user = ref(null)
const profile = ref(null)
const isAdmin = ref(false)
const loading = ref(true)

export function useAuth() {
  const fetchUser = async () => {
    loading.value = true
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user.value = authUser
      
      if (authUser) {
        // Fetch user profile
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        profile.value = userProfile
        
        // Check if admin
        const { data: clerk } = await supabase
          .from('clerks')
          .select('id')
          .eq('id', authUser.id)
          .single()
        
        isAdmin.value = clerk !== null || userProfile?.user_type === 'admin'
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      loading.value = false
    }
  }
  
  const signOut = async () => {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    isAdmin.value = false
  }
  
  // Set up auth state listener
  onMounted(() => {
    fetchUser()
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchUser()
      } else if (event === 'SIGNED_OUT') {
        user.value = null
        profile.value = null
        isAdmin.value = false
      }
    })
    
    return () => {
      authListener?.subscription?.unsubscribe()
    }
  })
  
  return {
    user,
    profile,
    isAdmin,
    loading,
    fetchUser,
    signOut
  }
}

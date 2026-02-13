<template>
  <AppHeader :app-name="'PH-BookRent'">
    <template #nav-links>
      <router-link to="/rent" class="nav-link">Rent a Book</router-link>
      <router-link v-if="!isAdmin" to="/history" class="nav-link">My Rentals</router-link>
      <template v-if="isAdmin">
        <router-link to="/admin" class="nav-link nav-link-admin">Requests</router-link>
        <router-link to="/admin/records" class="nav-link nav-link-admin">Records</router-link>
        <router-link to="/admin/inventory" class="nav-link nav-link-admin">Inventory</router-link>
      </template>
    </template>
    <template #nav-actions>
      <div v-if="!isAdmin" class="notification-badge" @click="toggleNotifications">
        <span class="notification-icon">🔔</span>
        <span v-if="unreadCount > 0" class="notification-count">{{ unreadCount }}</span>
      </div>
      <AppButton variant="ghost" @click="handleLogout">Logout</AppButton>
    </template>
  </AppHeader>
  
  <!-- Notification Dropdown -->
  <div v-if="showNotifications" class="notifications-dropdown" @click.stop>
    <div class="notifications-header">
      <span class="notifications-title">Notifications</span>
      <button v-if="unreadCount > 0" @click="markAllAsRead" class="mark-all-btn">
        Clear all
      </button>
    </div>
    
    <div v-if="loading" class="notifications-loading">
      <span class="loading-text">Loading...</span>
    </div>
    
    <div v-else-if="notifications.length === 0" class="notifications-empty">
      <span class="empty-icon">🔔</span>
      <p>No notifications</p>
    </div>
    
    <div v-else class="notifications-list">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification-item"
      >
        <div class="notification-main" @click="markAsRead(notification.id)">
          <span class="notification-dot" :class="{ 'unread': !notification.read }"></span>
          <div class="notification-text">
            <p class="notification-message">{{ notification.message }}</p>
            <div v-if="notification.books && notification.books.length > 0" class="notification-books">
              <span v-for="(item, index) in notification.books.slice(0, 2)" :key="item.book_id" class="book-tag">
                {{ item.book?.title || 'Unknown' }}
                <span v-if="item.quantity > 1" class="book-qty">×{{ item.quantity }}</span>
              </span>
              <span v-if="notification.books.length > 2" class="more-books">
                +{{ notification.books.length - 2 }} more
              </span>
            </div>
            <span class="notification-time">{{ formatTime(notification.timestamp) }}</span>
          </div>
        </div>
        <button class="notification-close" @click.stop="removeNotification(notification.id)" title="Dismiss">
          ×
        </button>
      </div>
    </div>
  </div>
  
  <!-- Overlay -->
  <div v-if="showNotifications" class="notifications-overlay" @click="showNotifications = false"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../services/supabaseClient'
import { useRouter } from 'vue-router'
import { useNotifications } from '../composables/useNotifications'
import AppHeader from './layout/AppHeader.vue'
import AppButton from './ui/AppButton.vue'

const router = useRouter()
const isAdmin = ref(false)
const showNotifications = ref(false)

const { 
  notifications, 
  unreadCount, 
  loading, 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead, 
  subscribeToUpdates,
  unsubscribe,
  clearNotifications
} = useNotifications()

const removeNotification = (notificationId) => {
  const index = notifications.value.findIndex(n => n.id === notificationId)
  if (index > -1) {
    const notification = notifications.value[index]
    if (!notification.read) {
      saveReadNotification(notificationId)
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    notifications.value.splice(index, 1)
  }
}

const saveReadNotification = (notificationId) => {
  try {
    const stored = localStorage.getItem('rental_notifications_read')
    const readIds = stored ? JSON.parse(stored) : []
    if (!readIds.includes(notificationId)) {
      readIds.push(notificationId)
      localStorage.setItem('rental_notifications_read', JSON.stringify(readIds))
    }
  } catch (error) {
    console.error('Error saving read state:', error)
  }
}

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: clerk } = await supabase
      .from('clerks')
      .select('id')
      .eq('id', user.id)
      .single()
      
    if (clerk) {
      isAdmin.value = true
    } else {
      const { data } = await supabase.from('profiles').select('user_type').eq('id', user.id).single()
      if (data?.user_type === 'admin') isAdmin.value = true
    }
    
    // Fetch notifications for non-admin users
    if (!isAdmin.value) {
      await fetchNotifications(user.id)
      subscribeToUpdates(user.id)
    }
  }
})

onUnmounted(() => {
  unsubscribe()
})

const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
}

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/')
}
</script>

<style scoped>
.nav-link {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
  padding: var(--space-2) 0;
  border-bottom: 2px solid transparent;
}

.nav-link:hover {
  color: var(--color-primary);
}

.nav-link.router-link-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.nav-link-admin {
  color: var(--color-error);
}

.nav-link-admin:hover,
.nav-link-admin.router-link-active {
  color: var(--color-error);
  border-bottom-color: var(--color-error);
}

/* Notification Badge */
.notification-badge {
  position: relative;
  cursor: pointer;
  padding: 6px;
  transition: opacity 0.15s;
}

.notification-badge:hover {
  opacity: 0.7;
}

.notification-icon {
  font-size: 20px;
  display: block;
}

.notification-count {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 2px solid white;
  line-height: 1;
}

/* Notifications Dropdown */
.notifications-dropdown {
  position: fixed;
  top: 68px;
  right: 16px;
  width: 360px;
  max-height: 480px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.notifications-title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
}

.mark-all-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.mark-all-btn:hover {
  color: #111827;
  background: #f3f4f6;
}

.notifications-loading,
.notifications-empty {
  padding: 48px 24px;
  text-align: center;
  color: #9ca3af;
}

.loading-text {
  font-size: 13px;
}

.empty-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
  opacity: 0.5;
}

.notifications-empty p {
  margin: 0;
  font-size: 13px;
  color: #9ca3af;
}

.notifications-list {
  overflow-y: auto;
  max-height: 400px;
}

.notification-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #f9fafb;
  transition: background 0.15s;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
  cursor: pointer;
}

.notification-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  margin-top: 6px;
  flex-shrink: 0;
}

.notification-dot.unread {
  background: #3b82f6;
}

.notification-text {
  flex: 1;
  min-width: 0;
}

.notification-close {
  background: none;
  border: none;
  color: #d1d5db;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
  flex-shrink: 0;
  opacity: 0;
}

.notification-item:hover .notification-close {
  opacity: 1;
}

.notification-close:hover {
  background: #fee2e2;
  color: #ef4444;
}

.notification-message {
  margin: 0;
  font-size: 13px;
  color: #111827;
  line-height: 1.5;
  font-weight: 500;
}

.notification-books {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
  margin-bottom: 2px;
}

.book-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-qty {
  font-weight: 600;
  color: #3b82f6;
}

.more-books {
  font-size: 11px;
  color: #9ca3af;
  font-style: italic;
}

.notification-time {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
  display: block;
}

.notifications-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
}

@media (max-width: 768px) {
  .nav-link {
    padding: var(--space-3);
    border-bottom: none;
    border-left: 2px solid transparent;
  }
  
  .nav-link.router-link-active {
    border-left-color: var(--color-primary);
    border-bottom-color: transparent;
  }
  
  .nav-link-admin.router-link-active {
    border-left-color: var(--color-error);
  }
  
  .notifications-dropdown {
    right: 10px;
    left: 10px;
    width: auto;
  }
}
</style>
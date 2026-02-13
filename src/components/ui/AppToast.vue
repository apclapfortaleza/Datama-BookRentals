<template>
  <Teleport to="body">
    <Transition name="toast">
      <div 
        v-if="show" 
        :class="['toast', `toast-${type}`]"
        role="alert"
      >
        <div class="toast-content">
          <span class="toast-icon">{{ icon }}</span>
          <span class="toast-message">{{ message }}</span>
        </div>
        <button 
          v-if="closable" 
          class="toast-close" 
          @click="handleClose"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  },
  closable: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['close']);

const show = ref(false);
let timeoutId = null;

const icon = computed(() => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[props.type];
});

const handleClose = () => {
  show.value = false;
  emit('close');
};

const startTimer = () => {
  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      handleClose();
    }, props.duration);
  }
};

onMounted(() => {
  show.value = true;
  startTimer();
});

watch(() => props.message, () => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  startTimer();
});
</script>

<style scoped>
.toast {
  position: fixed;
  top: var(--space-6);
  right: var(--space-6);
  min-width: 300px;
  max-width: 500px;
  padding: var(--space-4);
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  z-index: var(--z-toast);
  border-left: 4px solid;
}

.toast-success {
  border-left-color: var(--color-success);
}

.toast-error {
  border-left-color: var(--color-error);
}

.toast-warning {
  border-left-color: var(--color-warning);
}

.toast-info {
  border-left-color: var(--color-primary);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
}

.toast-icon {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: 1;
}

.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error .toast-icon {
  color: var(--color-error);
}

.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info .toast-icon {
  color: var(--color-primary);
}

.toast-message {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: var(--line-height-normal);
}

.toast-close {
  background: none;
  border: none;
  font-size: var(--font-size-2xl);
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.toast-close:hover {
  background-color: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition-base);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>

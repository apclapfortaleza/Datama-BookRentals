<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </div>
</template>

<script setup>
// Root App component with minimal setup
// Route-based views will handle their own layouts
</script>

<style>
/* Import global styles */
@import './styles/global.css';

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <RouterView />
  </div>
</template>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100vh;
  width: 100vw;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden; /* Prevent all scrolling */
  margin: 0;
  padding: 0;
  position: fixed; /* Lock the viewport */
  top: 0;
  left: 0;
}

#app {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for modern browsers */
  height: -webkit-fill-available; /* Safari fallback */
  width: 100vw;
  overflow: hidden; /* Prevent scrolling */
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
}

.app {
  width: 100vw; /* Full viewport width */
  height: 100vh;
  height: 100dvh;
  height: -webkit-fill-available;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed; /* Keep gradient fixed during scroll */
  color: white;
  position: relative;
  margin: 0;
  padding: 0;
  overflow: hidden; /* Prevent internal scrolling */
}

/* Common button styles */
.btn {
  border: none;
  padding: 16px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  min-width: 120px;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn-primary {
  background: #51cf66;
  color: white;
}

.btn-primary:hover {
  background: #40c057;
}

.btn-secondary {
  background: #ffd43b;
  color: #333;
}

.btn-secondary:hover {
  background: #fab005;
}

.btn-outline {
  background: transparent;
  color: white;
  border: 2px solid rgba(255,255,255,0.6);
}

.btn-outline:hover {
  background: rgba(255,255,255,0.1);
  border-color: white;
}

/* Card styles */
.card {
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid rgba(255,255,255,0.2);
}

.card:hover {
  background: rgba(255,255,255,0.2);
  transition: background 0.2s ease;
}

/* Desktop specific adjustments */
@media (min-width: 769px) {
  .app {
    min-height: 100vh; /* Ensure full height on desktop */
  }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .btn {
    font-size: 1rem;
    padding: 14px 28px;
  }
}

/* Additional mobile fixes */
@media (max-width: 768px) {
  html, body, #app, .app {
    height: 100vh;
    height: 100dvh; /* Use dynamic viewport height on mobile */
    overflow: hidden;
  }
}
</style>

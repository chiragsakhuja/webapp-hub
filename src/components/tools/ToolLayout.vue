<script setup lang="ts">
import { RouterLink } from 'vue-router'

interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <div class="tool-layout">
    <!-- Header with back navigation -->
    <div class="tool-header">
      <RouterLink to="/" class="back-btn">
        <span class="back-icon">←</span>
        <span>Back to Apps</span>
      </RouterLink>
      
      <div class="tool-info">
        <h1 class="tool-title">{{ title }}</h1>
      </div>
    </div>

    <!-- Tool content -->
    <div class="tool-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tool-layout {
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.tool-header {
  flex-shrink: 0;
  margin-bottom: 32px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin-bottom: 24px;
  padding: 8px 16px;
  border-radius: 8px;
  background: rgba(255,255,255,0.15);
  transition: all 0.2s ease;
  border: 1px solid rgba(255,255,255,0.2);
}

.back-btn:hover {
  color: white;
  background: rgba(255,255,255,0.25);
}

.back-icon {
  font-size: 1.2rem;
  font-weight: bold;
}

.tool-info {
  text-align: center;
}

.tool-title {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 12px;
  color: white;
}

.tool-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .tool-layout {
    padding: 16px;
  }
  
  .tool-title {
    font-size: 2rem;
  }
  
  .back-btn {
    font-size: 0.9rem;
    padding: 6px 12px;
  }
}

@media (max-width: 480px) {
  .tool-title {
    font-size: 1.8rem;
  }
  
  .tool-header {
    margin-bottom: 24px;
  }
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 600px) {
  .tool-layout {
    padding: 16px;
  }
  
  .tool-header {
    margin-bottom: 20px;
  }
  
  .tool-title {
    font-size: 1.8rem;
    margin-bottom: 8px;
  }
}
</style> 
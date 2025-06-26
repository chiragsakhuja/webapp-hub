<script setup lang="ts">
interface Props {
  progressPercent: number
  overallProgressPercent: number
  isMiniMode: boolean
  isMobile: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="progress-section" :class="{ 'mini-mode': isMiniMode, 'mobile': isMobile }">
    <div class="progress-item">
      <div class="progress-label">Current Exercise</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>
    
    <div class="progress-item">
      <div class="progress-label">Overall Workout</div>
      <div class="progress-bar overall-progress">
        <div class="progress-fill overall-fill" :style="{ width: overallProgressPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-section {
  width: 100%;
  margin-bottom: 20px;
}

.progress-item {
  width: 100%;
  margin-bottom: 15px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.8);
  text-align: left;
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.3);
  border-radius: 4px;
  overflow: hidden;
}

.overall-progress {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: #51cf66;
  transition: width 1s linear;
  border-radius: 4px;
}

.overall-fill {
  background: #ffd43b;
}


</style> 
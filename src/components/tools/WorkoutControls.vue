<script setup lang="ts">
import { OpenInNewIcon } from 'mdi-vue3'

interface Props {
  isRunning: boolean
  isPaused: boolean
  isFinished: boolean
  isMiniMode: boolean
  isMobile: boolean
}

interface Emits {
  startWorkout: []
  pauseWorkout: []
  resetWorkout: []
  openMiniWindow: []
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div class="controls" :class="{ 'mini-mode': isMiniMode, 'mobile': isMobile }">
    <div v-if="!isRunning && !isFinished" class="control-group">
      <button @click="$emit('startWorkout')" class="start-btn btn-primary">
        Start Workout
      </button>
      
      <!-- Pop-out button (only show on desktop and not in mini mode) -->
      <button 
        v-if="!isMobile && !isMiniMode" 
        @click="$emit('openMiniWindow')" 
        class="popout-btn"
        title="Open in mini window"
      >
        <OpenInNewIcon />
      </button>
    </div>
    
    <button v-if="isRunning" @click="$emit('pauseWorkout')" class="pause-btn btn-secondary">
      {{ isPaused ? 'Resume' : 'Pause' }}
    </button>
    
    <button v-if="isFinished" @click="$emit('resetWorkout')" class="restart-btn btn-primary">
      Start Again
    </button>
  </div>
</template>

<style scoped>
.controls {
  width: 100%;
  margin-top: auto;
  padding-bottom: 20px;
  flex-shrink: 0;
}

.control-group {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.control-group .start-btn {
  flex: 1;
  max-width: 250px;
}

.popout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  padding: 16px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-left: 10px;
  min-width: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.popout-btn svg {
  width: 20px;
  height: 20px;
  fill: white;
}

.start-btn, .restart-btn, .pause-btn {
  padding: 16px 32px;
  font-size: 1.4rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 300px;
}

.start-btn:hover, .restart-btn:hover, .pause-btn:hover {
  transform: translateY(-1px);
}

/* Mini mode styles */
.controls.mini-mode .start-btn,
.controls.mini-mode .restart-btn,
.controls.mini-mode .pause-btn {
  padding: 12px 24px;
  font-size: 1.1rem;
  max-width: 220px;
}

.controls.mini-mode .control-group .start-btn {
  max-width: 180px;
}


</style> 
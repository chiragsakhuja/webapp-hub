<script setup lang="ts">
import type { Exercise } from '@/composables/useWorkoutTimer'

interface Props {
  exerciseName: string
  timeLeft: number
  formatTime: (seconds: number) => string
  isMiniMode: boolean
  isMobile: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="timer-container" :class="{ 'mini-mode': isMiniMode, 'mobile': isMobile }">
    <div class="exercise-name">
      {{ exerciseName }}
    </div>
    
    <div 
      class="timer-display" 
      :class="{ 
        'warning': timeLeft <= 5 && timeLeft > 0, 
        'finished': timeLeft === 0 
      }"
    >
      {{ formatTime(timeLeft) }}
    </div>
  </div>
</template>

<style scoped>
.timer-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 0;
}

.exercise-name {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 30px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  line-height: 1.2;
}

.timer-display {
  font-size: 6rem;
  font-weight: bold;
  margin-bottom: 30px;
  text-shadow: 3px 3px 6px rgba(0,0,0,0.4);
  transition: all 0.3s ease;
}

.timer-display.warning {
  color: #ff6b6b;
  animation: pulse 1s infinite;
}

.timer-display.finished {
  color: #51cf66;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* Mobile styles */
.timer-container.mobile .exercise-name {
  font-size: 1.4rem;
}

.timer-container.mobile .timer-display {
  font-size: 4.5rem;
}

/* Mini mode styles */

.timer-container.mini-mode .timer-display {
  margin-bottom: 15px;
  font-size: 3.0rem;
}

.timer-container.mini-mode .exercise-name {
  margin-bottom: 20px;
  font-size: 1.5rem;
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 600px) {
  .timer-display {
    font-size: 3.5rem;
    margin-bottom: 15px;
  }
  
  .exercise-name {
    font-size: 1.2rem;
    margin-bottom: 15px;
  }
}
</style> 
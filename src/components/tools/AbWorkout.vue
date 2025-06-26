<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import ToolLayout from './ToolLayout.vue'
import TimerDisplay from './TimerDisplay.vue'
import ProgressSection from './ProgressSection.vue'
import WorkoutControls from './WorkoutControls.vue'
import CompletionMessage from './CompletionMessage.vue'
import { useWorkoutTimer, type Exercise } from '@/composables/useWorkoutTimer'
import { useWorkoutAudio } from '@/composables/useWorkoutAudio'
import { useWakeLock } from '@/composables/useWakeLock'

// Workout routine (repeated 3 times)
const exercises: Exercise[] = [
  { name: "Side Plank (Right)", duration: 45, type: "exercise" },
  { name: "Rest", duration: 15, type: "break" },
  { name: "Side Plank (Left)", duration: 45, type: "exercise" },
  { name: "Rest", duration: 15, type: "break" },
  { name: "Plank - Straight Arms Tap Forward", duration: 45, type: "exercise" },
  { name: "Front Plank on Forearms", duration: 45, type: "exercise" },
  { name: "Rest", duration: 10, type: "break" },
  { name: "Russian Twists", duration: 20, type: "exercise" },
  { name: "Rest", duration: 15, type: "break" },
  { name: "Dead Bug", duration: 45, type: "exercise" },
  { name: "Rest", duration: 60, type: "break" }
]

// UI state
const isMiniMode = ref(false)
const isMobile = ref(false)

// Initialize composables
const TOTAL_ROUNDS = 3
const timer = useWorkoutTimer(exercises, TOTAL_ROUNDS)
const audio = useWorkoutAudio()
const wakeLock = useWakeLock()

// Initialize on component mount
onMounted(async () => {
  // Check if opened as mini window
  const urlParams = new URLSearchParams(window.location.search)
  isMiniMode.value = urlParams.has('mini')
  
  // Mobile detection (exclude mini mode from mobile detection)
  isMobile.value = !isMiniMode.value && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 768)
  )
  
  // Preload audio files
  await audio.preloadAudio()
})

// Watch for timer ticks to handle exercise transitions
watch(() => timer.timeLeft.value, (newTimeLeft, oldTimeLeft) => {
  // Exercise completed (time reached 0)
  if (oldTimeLeft === 1 && newTimeLeft === 0) {
    timer.nextExercise((nextExercise) => {
      audio.handleExerciseComplete(nextExercise)
      // Schedule sounds for the new exercise
      audio.scheduleSounds(timer.timeLeft.value, timer.currentExercise.value, timer.getNextExercise)
    })
  }
})

// Watch for workout completion
watch(() => timer.isFinished.value, (isFinished) => {
  if (isFinished) {
    audio.handleWorkoutComplete()
    wakeLock.releaseWakeLock()
  }
})

// Workout control functions
const startWorkout = async () => {
  await wakeLock.requestWakeLock()
  
  timer.start()
  
  // Play countdown sound and wait for it to complete before starting timer
  const countdownDuration = await audio.handleWorkoutStart()
  
  setTimeout(() => {
    // Schedule sounds for the first exercise
    audio.scheduleSounds(timer.timeLeft.value, timer.currentExercise.value, timer.getNextExercise)
    
    // Start the actual timer with tick handler
    timer.startTimer(() => {
      // This runs on every tick - we can add any per-tick logic here if needed
    })
  }, countdownDuration * 1000)
}

const pauseWorkout = () => {
  timer.pause()
  
  if (timer.isPaused.value) {
    // Pausing - clear scheduled sounds
    audio.handlePause(true, timer.timeLeft.value, timer.currentExercise.value, timer.getNextExercise)
  } else if (timer.isRunning.value && !timer.isFinished.value) {
    // Resuming
    timer.stopTimer() // Stop current timer
    
    // Reschedule sounds and restart timer
    audio.handlePause(false, timer.timeLeft.value, timer.currentExercise.value, timer.getNextExercise)
    
    timer.startTimer(() => {
      // Tick handler for resumed timer
    })
  }
}

const resetWorkout = () => {
  timer.reset(() => {
    audio.handleReset()
    wakeLock.releaseWakeLock()
  })
}

const openMiniWindow = () => {
  const currentUrl = window.location.href
  const miniUrl = currentUrl.includes('?') ? `${currentUrl}&mini=true` : `${currentUrl}?mini=true`
  
  const miniWindow = window.open(
    miniUrl,
    'AbWorkoutMini',
    'width=360,height=550,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no'
  )
  
  if (miniWindow) {
    miniWindow.focus()
  }
}

// Cleanup on component unmount
onBeforeUnmount(() => {
  wakeLock.releaseWakeLock()
  timer.stopTimer()
  audio.clearSoundTimeouts()
})
</script>

<template>
  <ToolLayout title="Ab Workout Timer">
    <div class="workout-content" :class="{ 'mini-mode': isMiniMode }">
      <!-- Header -->
      <div class="header">
        <div class="round-indicator">
          Round {{ Math.min(timer.currentRound.value, timer.totalRounds) }} / {{ timer.totalRounds }}
        </div>
      </div>

      <!-- Main Timer Display -->
      <TimerDisplay
        :exercise-name="timer.currentExercise.value.name"
        :time-left="timer.timeLeft.value"
        :format-time="timer.formatTime"
        :is-mini-mode="isMiniMode"
        :is-mobile="isMobile"
      />
      
      <!-- Progress Bars -->
      <ProgressSection
        :progress-percent="timer.progressPercent.value"
        :overall-progress-percent="timer.overallProgressPercent.value"
        :is-mini-mode="isMiniMode"
        :is-mobile="isMobile"
      />

      <!-- Controls -->
      <WorkoutControls
        :is-running="timer.isRunning.value"
        :is-paused="timer.isPaused.value"
        :is-finished="timer.isFinished.value"
        :is-mini-mode="isMiniMode"
        :is-mobile="isMobile"
        @start-workout="startWorkout"
        @pause-workout="pauseWorkout"
        @reset-workout="resetWorkout"
        @open-mini-window="openMiniWindow"
      />

      <!-- Workout Complete -->
      <CompletionMessage
        v-if="timer.isFinished.value"
        :total-rounds="timer.totalRounds"
        :is-mini-mode="isMiniMode"
        :is-mobile="isMobile"
      />
    </div>
  </ToolLayout>
</template>

<style scoped>
.workout-content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  min-height: 100%;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  text-align: center;
  position: relative;
  gap: 20px;
}



.header {
  width: 100%;
  flex-shrink: 0;
}

.round-indicator {
  font-size: 1.2rem;
  background: rgba(255,255,255,0.2);
  padding: 8px 16px;
  border-radius: 8px;
  display: inline-block;
}

/* Mini mode styles */
.workout-content.mini-mode .round-indicator {
  font-size: 0.9rem;
  padding: 6px 12px;
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 600px) {
  .workout-content {
    padding: 10px;
  }
}
</style> 
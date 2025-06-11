<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import ToolLayout from './ToolLayout.vue'
import { OpenInNewIcon } from 'mdi-vue3'

interface Exercise {
  name: string
  duration: number
  type: 'exercise' | 'break'
}

// Reactive state
const currentRound = ref(1)
const totalRounds = ref(3)
const currentExerciseIndex = ref(0)
const timeLeft = ref(0)
const isRunning = ref(false)
const isPaused = ref(false)
const isFinished = ref(false)
const timer = ref<number | null>(null)
const wakeLock = ref<WakeLockSentinel | null>(null)
const audioContext = ref<AudioContext | null>(null)

// Mini window state
const isMiniMode = ref(false)
const isMobile = ref(false)

// Check if this is a mini window and mobile detection
onMounted(() => {
  // Check if opened as mini window
  const urlParams = new URLSearchParams(window.location.search)
  isMiniMode.value = urlParams.has('mini')
  
  // Mobile detection
  isMobile.value = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && window.innerWidth < 768)
  
  // Preload audio files
  preloadAudio()
})

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

// Computed properties
const currentExercise = computed(() => {
  return exercises[currentExerciseIndex.value] || { name: "Complete", duration: 0, type: "exercise" }
})

const progressPercent = computed(() => {
  if (currentExercise.value.duration === 0) return 100
  return ((currentExercise.value.duration - timeLeft.value) / currentExercise.value.duration) * 100
})

const overallProgressPercent = computed(() => {
  const totalExercises = exercises.length * totalRounds.value
  const completedExercises = (currentRound.value - 1) * exercises.length + currentExerciseIndex.value
  const currentExerciseProgress = currentExercise.value.duration > 0 
    ? (currentExercise.value.duration - timeLeft.value) / currentExercise.value.duration 
    : 0
  
  const overallProgress = (completedExercises + currentExerciseProgress) / totalExercises * 100
  return Math.min(overallProgress, 100)
})

// Audio clips mapping and cache
const soundFiles: Record<string, string> = {
  start: new URL('@/assets/sounds/ab-workout-start.mp3', import.meta.url).href,
  rest: new URL('@/assets/sounds/ab-workout-rest.mp3', import.meta.url).href,
  complete: new URL('@/assets/sounds/ab-workout-complete.mp3', import.meta.url).href,
}
// Store both audio element and duration
const audioElements: Record<string, { audio: HTMLAudioElement, duration: number }> = {}

// For scheduling end sound
let endSoundTimeout: ReturnType<typeof setTimeout> | null = null
// For scheduling next exercise sound (START/REST)
let nextExerciseSoundTimeout: ReturnType<typeof setTimeout> | null = null

const preloadAudio = () => {
  Object.entries(soundFiles).forEach(([name, url]) => {
    const audio = new Audio(url)
    // Preload and get duration
    audio.addEventListener('loadedmetadata', () => {
      audioElements[name] = { audio, duration: audio.duration }
    })
    // Fallback if loadedmetadata doesn't fire (e.g. cached)
    audio.oncanplaythrough = () => {
      if (!audioElements[name]) {
        audioElements[name] = { audio, duration: audio.duration }
      }
    }
    audio.load()
  })
}

const playSound = (soundName: string) => {
  const entry = audioElements[soundName]
  if (entry) {
    entry.audio.currentTime = 0
    entry.audio.play()
  }
}

// Helper to play start sound and then run a callback after it ends
const playStartSoundAndThen = (cb: () => void) => {
  const entry = audioElements['start']
  if (entry && entry.duration > 0) {
    playSound('start')
    setTimeout(cb, entry.duration * 1000)
  } else {
    playSound('start')
    setTimeout(cb, 500) // fallback
  }
}

const playWarningSound = () => {
  // Warning sound removed - no longer play anything
}

const playEndSound = () => {
  // End sound removed - no longer play anything
}

const clearEndSoundTimeout = () => {
  if (endSoundTimeout) {
    clearTimeout(endSoundTimeout)
    endSoundTimeout = null
  }
}

const clearNextExerciseSoundTimeout = () => {
  if (nextExerciseSoundTimeout) {
    clearTimeout(nextExerciseSoundTimeout)
    nextExerciseSoundTimeout = null
  }
}

const getNextExercise = () => {
  const nextIndex = currentExerciseIndex.value + 1
  let nextRound = currentRound.value
  let nextExerciseIndex = nextIndex
  
  if (nextIndex >= exercises.length) {
    nextRound = currentRound.value + 1
    nextExerciseIndex = 0
  }
  
  if (nextRound > totalRounds.value) {
    return null // No more exercises
  }
  
  return {
    exercise: exercises[nextExerciseIndex],
    round: nextRound,
    index: nextExerciseIndex
  }
}

const scheduleNextExerciseSound = () => {
  clearNextExerciseSoundTimeout()
  
  const nextInfo = getNextExercise()
  if (!nextInfo) return // No more exercises
  
  const nextExercise = nextInfo.exercise
  const soundName = nextExercise.type === 'exercise' ? 'start' : 'rest'
  const soundEntry = audioElements[soundName]
  
  if (!soundEntry) return
  
  const soundDuration = soundEntry.duration || 3
  const timeToPlaySound = timeLeft.value - soundDuration
  
  if (timeToPlaySound > 0) {
    nextExerciseSoundTimeout = setTimeout(() => {
      playSound(soundName)
    }, timeToPlaySound * 1000)
  } else if (timeLeft.value > 1) {
    // If sound duration is longer than remaining time, play immediately
    playSound(soundName)
  }
}

const scheduleEndSound = () => {
  // End sound removed - no longer schedule anything
}

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock.value = await navigator.wakeLock.request('screen')
      console.log('Screen wake lock acquired')
    }
  } catch (error) {
    console.warn('Wake lock not supported or failed:', error)
  }
}

const releaseWakeLock = async () => {
  if (wakeLock.value) {
    await wakeLock.value.release()
    wakeLock.value = null
    console.log('Screen wake lock released')
  }
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const nextExercise = () => {
  clearEndSoundTimeout()
  clearNextExerciseSoundTimeout()
  currentExerciseIndex.value++
  // Check if we've completed all exercises in current round
  if (currentExerciseIndex.value >= exercises.length) {
    currentRound.value++
    // Check if we've completed all the rounds
    if (currentRound.value > totalRounds.value) {
      completeWorkout()
      return
    }
    // Start next round
    currentExerciseIndex.value = 0
  }
  // Set up next exercise - start immediately, no sound delay
  timeLeft.value = currentExercise.value.duration
  scheduleNextExerciseSound()
}

const completeWorkout = () => {
  isRunning.value = false
  isFinished.value = true
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
  clearEndSoundTimeout()
  clearNextExerciseSoundTimeout()
  releaseWakeLock()
  // Play completion sound
  playSound('complete')
}

let resumeAfterStartSound = false

const startTimer = () => {
  timer.value = setInterval(() => {
    if (!isPaused.value) {
      if (timeLeft.value > 0) {
        timeLeft.value--
        // Warning sound removed - no longer play at 5 seconds
      } else {
        // Exercise completed
        nextExercise()
      }
    }
  }, 1000) as unknown as number
}

const startWorkout = async () => {
  isRunning.value = true
  isPaused.value = false
  isFinished.value = false
  currentRound.value = 1
  currentExerciseIndex.value = 0
  timeLeft.value = currentExercise.value.duration
  await requestWakeLock()
  // Play start sound, then start timer
  playStartSoundAndThen(() => {
    scheduleNextExerciseSound()
    startTimer()
  })
}

const pauseWorkout = () => {
  isPaused.value = !isPaused.value
  if (!isPaused.value && isRunning.value && !isFinished.value) {
    // Resuming: play start sound, then resume timer
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
    playStartSoundAndThen(() => {
      scheduleNextExerciseSound()
      startTimer()
    })
  } else {
    // Pausing: clear any scheduled sounds
    clearEndSoundTimeout()
    clearNextExerciseSoundTimeout()
  }
}

const resetWorkout = () => {
  isRunning.value = false
  isPaused.value = false
  isFinished.value = false
  currentRound.value = 1
  currentExerciseIndex.value = 0
  timeLeft.value = 0
  
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
  
  clearEndSoundTimeout()
  clearNextExerciseSoundTimeout()
  releaseWakeLock()
}

const openMiniWindow = () => {
  const currentUrl = window.location.href
  const miniUrl = currentUrl.includes('?') ? `${currentUrl}&mini=true` : `${currentUrl}?mini=true`
  
  const miniWindow = window.open(
    miniUrl,
    'AbWorkoutMini',
    'width=400,height=500,resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no'
  )
  
  if (miniWindow) {
    miniWindow.focus()
  }
}

// Lifecycle hooks
onBeforeUnmount(() => {
  releaseWakeLock()
  if (timer.value) {
    clearInterval(timer.value)
  }
})
</script>

<template>
  <ToolLayout title="Ab Workout Timer">
    <div class="workout-content" :class="{ 'mini-mode': isMiniMode }">
      <!-- Header -->
      <div class="header">
        <div class="round-indicator">
          Round {{ Math.min(currentRound, totalRounds) }} / {{ totalRounds }}
        </div>
      </div>

      <!-- Main Timer Display -->
      <div class="timer-container">
        <div class="exercise-name">
          {{ currentExercise.name }}
        </div>
        
        <div class="timer-display" :class="{ 'warning': timeLeft <= 5 && timeLeft > 0, 'finished': timeLeft === 0 }">
          {{ formatTime(timeLeft) }}
        </div>
        
        <div class="progress-section">
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
      </div>

      <!-- Controls -->
      <div class="controls">
        <div v-if="!isRunning && !isFinished" class="control-group">
          <button @click="startWorkout" class="start-btn btn-primary">
            Start Workout
          </button>
          <!-- Pop-out button (only show in main window and not on mobile) -->
          <button 
            v-if="!isMiniMode && !isMobile" 
            @click="openMiniWindow" 
            class="popout-btn"
            title="Open in mini window"
          >
            <OpenInNewIcon />
          </button>
        </div>
        
        <button v-if="isRunning" @click="pauseWorkout" class="pause-btn btn-secondary">
          {{ isPaused ? 'Resume' : 'Pause' }}
        </button>
        
        <button v-if="isFinished" @click="resetWorkout" class="restart-btn btn-primary">
          Start Again
        </button>
      </div>

      <!-- Workout Complete -->
      <div v-if="isFinished" class="completion-message">
        <h2>🎉 Workout Complete! 🎉</h2>
        <p>Great job completing all {{ totalRounds }} rounds!</p>
      </div>
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

/* Mini Mode Styles */
.mini-mode {
  max-width: 100%;
  padding: 5px;
  font-size: 0.9rem;
}

.mini-mode .control-group .start-btn {
  max-width: 180px;
}

.mini-mode .popout-btn {
  padding: 10px;
  font-size: 1rem;
  min-width: 45px;
}

.mini-mode .popout-btn svg {
  width: 16px;
  height: 16px;
}

.mini-mode .header {
  margin-bottom: 10px;
}

.mini-mode .round-indicator {
  font-size: 0.9rem;
  padding: 4px 8px;
}

.mini-mode .exercise-name {
  font-size: 1.1rem;
  margin-bottom: 15px;
  line-height: 1.1;
}

.mini-mode .timer-display {
  font-size: 3.5rem;
  margin-bottom: 15px;
}

.mini-mode .progress-section {
  margin-bottom: 10px;
}

.mini-mode .progress-item {
  margin-bottom: 8px;
}

.mini-mode .progress-label {
  font-size: 0.75rem;
  margin-bottom: 3px;
}

.mini-mode .progress-bar {
  height: 6px;
}

.mini-mode .overall-progress {
  height: 4px;
}

.mini-mode .controls {
  padding-bottom: 10px;
}

.mini-mode .start-btn,
.mini-mode .restart-btn,
.mini-mode .pause-btn {
  padding: 10px 20px;
  font-size: 1rem;
  max-width: 200px;
}

.mini-mode .completion-message {
  padding: 15px;
}

.mini-mode .completion-message h2 {
  font-size: 1.4rem;
  margin-bottom: 8px;
}

.mini-mode .completion-message p {
  font-size: 0.9rem;
}

.header {
  width: 100%;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.round-indicator {
  font-size: 1.2rem;
  background: rgba(255,255,255,0.2);
  padding: 8px 16px;
  border-radius: 8px;
  display: inline-block;
}

.timer-container {
  flex: 1;
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

.controls {
  width: 100%;
  margin-top: auto;
  padding-bottom: 20px;
  flex-shrink: 0;
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

.completion-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.9);
  padding: 30px;
  border-radius: 12px;
  text-align: center;
  animation: celebration 0.3s ease-out;
  z-index: 1000;
}

.completion-message h2 {
  font-size: 2.2rem;
  margin-bottom: 15px;
  color: #51cf66;
}

.completion-message p {
  font-size: 1.2rem;
  color: #ccc;
}

@keyframes celebration {
  0% { 
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  100% { 
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

/* Mobile responsive adjustments */
@media (max-width: 480px) {
  .timer-container {
    max-width: 95%;
  }
  
  .exercise-name {
    font-size: 1.4rem;
  }
  
  .timer-display {
    font-size: 4.5rem;
  }
  
  .completion-message h2 {
    font-size: 1.8rem;
  }
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 600px) {
  .workout-content {
    padding: 10px;
  }
  
  .timer-display {
    font-size: 3.5rem;
    margin-bottom: 15px;
  }
  
  .exercise-name {
    font-size: 1.2rem;
    margin-bottom: 15px;
  }
  
  .controls {
    margin-top: 10px;
  }
}
</style> 
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import ToolLayout from './ToolLayout.vue'

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

// Methods
const initializeAudio = async () => {
  try {
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch (error) {
    console.warn('Audio context not supported:', error)
  }
}

const playSound = (frequency: number, duration = 200) => {
  if (!audioContext.value) return
  
  const oscillator = audioContext.value.createOscillator()
  const gainNode = audioContext.value.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.value.destination)
  
  oscillator.frequency.value = frequency
  oscillator.type = 'sine'
  
  gainNode.gain.setValueAtTime(0, audioContext.value.currentTime)
  gainNode.gain.linearRampToValueAtTime(0.3, audioContext.value.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.value.currentTime + duration / 1000)
  
  oscillator.start(audioContext.value.currentTime)
  oscillator.stop(audioContext.value.currentTime + duration / 1000)
}

const playStartSound = () => {
  playSound(800, 150)
  setTimeout(() => playSound(800, 150), 200)
}

const playWarningSound = () => {
  playSound(600, 300)
}

const playEndSound = () => {
  playSound(400, 500)
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
  
  // Set up next exercise
  timeLeft.value = currentExercise.value.duration
  playStartSound()
}

const completeWorkout = () => {
  isRunning.value = false
  isFinished.value = true
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
  releaseWakeLock()
  
  // Play completion sound sequence
  setTimeout(() => playSound(800, 200), 0)
  setTimeout(() => playSound(1000, 200), 300)
  setTimeout(() => playSound(1200, 400), 600)
}

const startTimer = () => {
  timer.value = setInterval(() => {
    if (!isPaused.value) {
      if (timeLeft.value > 0) {
        timeLeft.value--
        
        // Play warning sound at 5 seconds only for exercises
        if (timeLeft.value === 5 && currentExercise.value.type === 'exercise') {
          playWarningSound()
        }
      } else {
        // Exercise completed
        playEndSound()
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
  playStartSound()
  startTimer()
}

const pauseWorkout = () => {
  isPaused.value = !isPaused.value
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
  
  releaseWakeLock()
}

// Lifecycle hooks
onMounted(() => {
  initializeAudio()
})

onBeforeUnmount(() => {
  releaseWakeLock()
  if (timer.value) {
    clearInterval(timer.value)
  }
})
</script>

<template>
  <ToolLayout title="Ab Workout Timer" description="A guided 3-round ab workout with audio cues and progress tracking">
    <div class="workout-content">
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
        <button v-if="!isRunning && !isFinished" @click="startWorkout" class="start-btn btn-primary">
          Start Workout
        </button>
        
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
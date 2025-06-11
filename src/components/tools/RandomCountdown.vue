<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ToolLayout from './ToolLayout.vue'

const minTimeInput = ref<number>()
const maxTimeInput = ref<number>()
const message = ref<string>('')
const isRunning = ref<boolean>(false)
const showBell = ref<boolean>(false)

let timerId: number | null = null
const audioContext = ref<AudioContext | null>(null)
const wakeLock = ref<WakeLockSentinel | null>(null)
let alarmTimeout: number | null = null

onMounted(() => {
  // Initialize the Web Audio API
  initializeAudio()
})

onUnmounted(() => {
  // Clean up any running timers
  if (timerId) {
    clearTimeout(timerId)
  }
  if (alarmTimeout) {
    clearTimeout(alarmTimeout)
  }
  releaseWakeLock()
})

const initializeAudio = async () => {
  try {
    audioContext.value = new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch (error) {
    console.warn('Audio context not supported:', error)
  }
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

const playAlarmSound = (duration: number) => {
  if (!audioContext.value) return
  
  // Create an alarm-like pattern with alternating frequencies
  const pattern = [800, 1000, 800, 1000] // Alternating high and low tones
  const beepDuration = 150 // Each beep lasts 150ms
  const interval = 300 // Interval between beeps
  
  let currentTime = 0
  let patternIndex = 0
  
  const playBeep = () => {
    if (currentTime >= duration) return
    
    playSound(pattern[patternIndex % pattern.length], beepDuration)
    patternIndex++
    currentTime += interval
    
    if (currentTime < duration) {
      setTimeout(playBeep, interval)
    }
  }
  
  playBeep()
}

const startRandomCountdown = () => {
  if (!minTimeInput.value || !maxTimeInput.value) return
  
  const minTime = minTimeInput.value
  const maxTime = maxTimeInput.value
  const randomTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime
  console.log(`Random countdown set for ${randomTime} seconds`)

  timerId = setTimeout(() => {
    // Generate random alarm duration between 1-3 seconds
    const alarmDuration = Math.floor(Math.random() * 2000) + 1000 // 1000-3000ms
    console.log(`Playing alarm for ${alarmDuration}ms`)
    
    // Play the alarm sound
    playAlarmSound(alarmDuration)

    // Show and shake the bell
    showBell.value = true

    // Stop the bell animation after the alarm duration
    alarmTimeout = setTimeout(() => {
      showBell.value = false
    }, alarmDuration)

    // Start a new countdown if the timer is still running
    if (isRunning.value) {
      startRandomCountdown()
    }
  }, randomTime * 1000)
}

const handleStart = async () => {
  if (!isRunning.value) {
    const minTime = minTimeInput.value
    const maxTime = maxTimeInput.value

    if (!minTime || !maxTime || minTime <= 0 || maxTime <= 0 || minTime > maxTime) {
      message.value = "Please enter valid minimum and maximum times."
      return
    }

    message.value = "Timer is running..."
    isRunning.value = true
    await requestWakeLock()
    startRandomCountdown()
  } else {
    // Stop the timer
    if (timerId) {
      clearTimeout(timerId)
      timerId = null
    }
    if (alarmTimeout) {
      clearTimeout(alarmTimeout)
      alarmTimeout = null
    }
    showBell.value = false
    message.value = "Timer stopped."
    isRunning.value = false
    releaseWakeLock()
  }
}
</script>

<template>
  <ToolLayout title="Random Countdown">
    <div class="countdown-container">
      <div class="input-group">
        <input 
          v-model.number="minTimeInput" 
          type="number" 
          placeholder="Min (s)" 
          :disabled="isRunning"
          class="time-input"
        >
        <input 
          v-model.number="maxTimeInput" 
          type="number" 
          placeholder="Max (s)" 
          :disabled="isRunning"
          class="time-input"
        >
      </div>
      
      <button 
        @click="handleStart" 
        class="btn start-button"
        :class="{ 'btn-danger': isRunning, 'btn-primary': !isRunning }"
      >
        {{ isRunning ? 'Stop Timer' : 'Start Timer' }}
      </button>
      
      <div v-if="message" class="message">
        {{ message }}
      </div>
      
      <div 
        v-if="showBell" 
        class="bell"
        :class="{ 'shake': showBell }"
      >
        🔔
      </div>
    </div>
  </ToolLayout>
</template>

<style scoped>
.countdown-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  padding: 40px 20px;
}

.input-group {
  display: flex;
  gap: 16px;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}

.time-input {
  width: clamp(100px, 30%, 140px);
  padding: 12px 16px;
  font-size: 1rem;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: white;
  text-align: center;
  transition: all 0.2s ease;
}

.time-input:focus {
  outline: none;
  border-color: #51cf66;
  background: rgba(255,255,255,0.15);
}

.time-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.time-input::placeholder {
  color: rgba(255,255,255,0.6);
}

.start-button {
  min-width: 160px;
  font-size: 1.1rem;
  padding: 16px 32px;
}

.btn-danger {
  background: #ff6b6b;
  color: white;
}

.btn-danger:hover {
  background: #ff5252;
}

.message {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  padding: 16px 24px;
  background: rgba(255,255,255,0.1);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.2);
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bell {
  font-size: 3rem;
  text-align: center;
  margin-top: 20px;
}

.shake {
  animation: shake 0.5s ease-in-out infinite;
}

@keyframes shake {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
  75% { transform: rotate(-15deg); }
  100% { transform: rotate(0deg); }
}

/* Mobile responsive */
@media (max-width: 480px) {
  .countdown-container {
    padding: 24px 16px;
    gap: 20px;
  }
  
  .input-group {
    gap: 12px;
  }
  
  .time-input {
    width: clamp(90px, 40%, 120px);
    padding: 10px 12px;
    font-size: 0.95rem;
  }
  
  .start-button {
    min-width: 140px;
    font-size: 1rem;
    padding: 14px 28px;
  }
  
  .message {
    font-size: 1rem;
    padding: 12px 20px;
  }
  
  .bell {
    font-size: 2.5rem;
  }
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 600px) {
  .countdown-container {
    padding: 20px 16px;
    gap: 16px;
  }
  
  .bell {
    font-size: 2rem;
    margin-top: 16px;
  }
}
</style> 
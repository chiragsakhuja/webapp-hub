import { ref, onMounted } from 'vue'
import type { Exercise } from './useWorkoutTimer'

export function useWorkoutAudio() {
  const audioElements = ref<Record<string, HTMLAudioElement>>({})
  
  // Sound scheduling timeouts
  let countdownTimeout: ReturnType<typeof setTimeout> | null = null
  let beepTimeout: ReturnType<typeof setTimeout> | null = null

  // Sound files
  const soundFiles = {
    countdown: new URL('@/assets/sounds/ab-workout-countdown.mp3', import.meta.url).href,
    rest: new URL('@/assets/sounds/ab-workout-rest.mp3', import.meta.url).href,
    complete: new URL('@/assets/sounds/ab-workout-complete.mp3', import.meta.url).href,
    beep: new URL('@/assets/sounds/ab-workout-beep.mp3', import.meta.url).href
  }

  // Preload audio files
  const preloadAudio = async () => {
    for (const [name, url] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio(url)
        audio.preload = 'auto'
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve, { once: true })
          audio.addEventListener('error', reject, { once: true })
          audio.load()
        })
        audioElements.value[name] = audio
      } catch (error) {
        console.warn(`Failed to load audio: ${name}`, error)
      }
    }
  }

  const playSound = (soundName: string) => {
    const audio = audioElements.value[soundName]
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(console.warn)
    }
  }

  const getAudioDuration = (soundName: string): number => {
    const audio = audioElements.value[soundName]
    return audio?.duration || 0
  }

  const clearSoundTimeouts = () => {
    if (countdownTimeout) {
      clearTimeout(countdownTimeout)
      countdownTimeout = null
    }
    if (beepTimeout) {
      clearTimeout(beepTimeout)
      beepTimeout = null
    }
  }

  const scheduleCountdownSound = (timeLeft: number, getNextExercise: () => { exercise: Exercise } | null) => {
    const nextInfo = getNextExercise()
    if (!nextInfo || nextInfo.exercise.type !== 'exercise') return
    
    const countdownDuration = getAudioDuration('countdown')
    if (countdownDuration === 0) return
    
    const timeToStartCountdown = timeLeft - countdownDuration
    
    if (timeToStartCountdown > 0) {
      countdownTimeout = setTimeout(() => {
        playSound('countdown')
      }, timeToStartCountdown * 1000)
    }
  }

  const scheduleBeepSound = (timeLeft: number, currentExercise: Exercise) => {
    clearTimeout(beepTimeout!)
    
    // Special case: 60 second rest gets beep at 10 seconds, others at 5 seconds
    const beepTime = (currentExercise.type === 'break' && currentExercise.duration === 60) ? 10 : 5
    
    if (timeLeft > beepTime) {
      const timeToBeep = timeLeft - beepTime
      beepTimeout = setTimeout(() => {
        playSound('beep')
      }, timeToBeep * 1000)
    }
  }

  const scheduleSounds = (timeLeft: number, currentExercise: Exercise, getNextExercise: () => { exercise: Exercise } | null) => {
    scheduleBeepSound(timeLeft, currentExercise)
    scheduleCountdownSound(timeLeft, getNextExercise)
  }

  const handleExerciseComplete = (nextExercise: Exercise) => {
    // Play rest sound if the next exercise is a rest period
    if (nextExercise.type === 'break') {
      playSound('rest')
    }
  }

  const handleWorkoutComplete = () => {
    clearSoundTimeouts()
    playSound('complete')
  }

  const handleWorkoutStart = async () => {
    // Play countdown sound and return its duration
    const countdownDuration = getAudioDuration('countdown')
    playSound('countdown')
    return countdownDuration
  }

  const handlePause = (isPaused: boolean, timeLeft: number, currentExercise: Exercise, getNextExercise: () => { exercise: Exercise } | null) => {
    if (isPaused) {
      // Pausing - clear scheduled sounds
      clearSoundTimeouts()
    } else {
      // Resuming - reschedule sounds based on current time left
      scheduleSounds(timeLeft, currentExercise, getNextExercise)
    }
  }

  const handleReset = () => {
    clearSoundTimeouts()
  }

  return {
    preloadAudio,
    playSound,
    getAudioDuration,
    clearSoundTimeouts,
    scheduleSounds,
    handleExerciseComplete,
    handleWorkoutComplete,
    handleWorkoutStart,
    handlePause,
    handleReset
  }
} 
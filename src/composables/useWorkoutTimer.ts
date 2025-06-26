import { ref, computed } from 'vue'

export interface Exercise {
  name: string
  duration: number
  type: 'exercise' | 'break'
}

export function useWorkoutTimer(exercises: Exercise[], totalRounds: number = 3) {
  // State
  const currentRound = ref(1)
  const currentExerciseIndex = ref(0)
  const timeLeft = ref(exercises[0]?.duration || 0) // Initialize with first exercise duration
  const isRunning = ref(false)
  const isPaused = ref(false)
  const isFinished = ref(false)
  const timer = ref<number | null>(null)

  // Computed properties
  const currentExercise = computed(() => {
    return exercises[currentExerciseIndex.value] || { name: "Complete", duration: 0, type: "exercise" }
  })

  const progressPercent = computed(() => {
    if (currentExercise.value.duration === 0) return 100
    return ((currentExercise.value.duration - timeLeft.value) / currentExercise.value.duration) * 100
  })

  const overallProgressPercent = computed(() => {
    const totalExercises = exercises.length * totalRounds
    const completedExercises = (currentRound.value - 1) * exercises.length + currentExerciseIndex.value
    const currentExerciseProgress = currentExercise.value.duration > 0 
      ? (currentExercise.value.duration - timeLeft.value) / currentExercise.value.duration 
      : 0
    
    const overallProgress = (completedExercises + currentExerciseProgress) / totalExercises * 100
    return Math.min(overallProgress, 100)
  })

  // Helper functions
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getNextExercise = () => {
    const nextIndex = currentExerciseIndex.value + 1
    let nextRound = currentRound.value
    let nextExerciseIndex = nextIndex
    
    if (nextIndex >= exercises.length) {
      nextRound = currentRound.value + 1
      nextExerciseIndex = 0
    }
    
    if (nextRound > totalRounds) {
      return null // No more exercises
    }
    
    return {
      exercise: exercises[nextExerciseIndex],
      round: nextRound,
      index: nextExerciseIndex
    }
  }

  // Timer control functions
  const startTimer = (onTick?: () => void) => {
    timer.value = setInterval(() => {
      if (!isPaused.value) {
        if (timeLeft.value > 0) {
          timeLeft.value--
          if (onTick) onTick()
        }
      }
    }, 1000) as unknown as number
  }

  const stopTimer = () => {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }

  const nextExercise = (onExerciseComplete?: (exercise: Exercise) => void) => {
    currentExerciseIndex.value++
    
    // Skip the last break on the final round
    if (currentRound.value === totalRounds && 
        currentExerciseIndex.value === exercises.length - 1 && 
        exercises[currentExerciseIndex.value].type === 'break') {
      completeWorkout()
      return
    }
    
    // Check if we've completed all exercises in current round
    if (currentExerciseIndex.value >= exercises.length) {
      currentRound.value++
      if (currentRound.value > totalRounds) {
        completeWorkout()
        return
      }
      currentExerciseIndex.value = 0
    }
    
    // Set up next exercise
    timeLeft.value = currentExercise.value.duration
    
    // Notify parent component about exercise completion
    if (onExerciseComplete) {
      onExerciseComplete(currentExercise.value)
    }
  }

  const completeWorkout = (onComplete?: () => void) => {
    isRunning.value = false
    isFinished.value = true
    stopTimer()
    
    if (onComplete) {
      onComplete()
    }
  }

  const start = (onStart?: () => void) => {
    isRunning.value = true
    isPaused.value = false
    isFinished.value = false
    currentRound.value = 1
    currentExerciseIndex.value = 0
    timeLeft.value = currentExercise.value.duration
    
    if (onStart) {
      onStart()
    }
  }

  const pause = () => {
    isPaused.value = !isPaused.value
  }

  const reset = (onReset?: () => void) => {
    isRunning.value = false
    isPaused.value = false
    isFinished.value = false
    currentRound.value = 1
    currentExerciseIndex.value = 0
    timeLeft.value = exercises[0]?.duration || 0 // Reset to first exercise duration
    
    stopTimer()
    
    if (onReset) {
      onReset()
    }
  }

  return {
    // State
    currentRound,
    currentExerciseIndex,
    timeLeft,
    isRunning,
    isPaused,
    isFinished,
    
    // Computed
    currentExercise,
    progressPercent,
    overallProgressPercent,
    
    // Methods
    formatTime,
    getNextExercise,
    nextExercise,
    start,
    pause,
    reset,
    startTimer,
    stopTimer,
    totalRounds
  }
} 
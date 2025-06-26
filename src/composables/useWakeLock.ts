import { ref } from 'vue'

export function useWakeLock() {
  const wakeLock = ref<WakeLockSentinel | null>(null)

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

  return {
    requestWakeLock,
    releaseWakeLock
  }
} 
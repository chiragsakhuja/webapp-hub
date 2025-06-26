<script setup lang="ts">
interface Props {
  totalRounds: number
  isMiniMode: boolean
  isMobile: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="completion-message" :class="{ 'mini-mode': isMiniMode, 'mobile': isMobile }">
    <h2>🎉 Workout Complete! 🎉</h2>
    <p>Great job completing all {{ totalRounds }} rounds!</p>
  </div>
</template>

<style scoped>
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
  .completion-message h2 {
    font-size: 1.8rem;
  }
}
</style> 
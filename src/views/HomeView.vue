<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

// Define the tools that will be available
interface Tool {
  id: string
  name: string
  description: string
  icon: string
  path: string
  status: 'available' | 'coming-soon'
}

const tools = ref<Tool[]>([
  {
    id: 'ab-workout',
    name: 'Ab Workout Timer',
    description: 'Guided 3-round ab workout with audio cues and progress tracking',
    icon: '💪',
    path: '/ab-workout',
    status: 'available'
  },
  {
    id: 'random-countdown',
    name: 'Random Countdown',
    description: 'Set a random countdown timer between min and max seconds',
    icon: '⏰',
    path: '/random-countdown',
    status: 'available'
  },
  // Add your tools here - examples for demonstration structure
  // {
  //   id: 'calculator',
  //   name: 'Calculator',
  //   description: 'Simple calculator with basic operations',
  //   icon: '🧮',
  //   path: '/calculator',
  //   status: 'available'
  // },
])

onMounted(() => {
  // Any initialization logic can go here
})
</script>

<template>
  <div class="home">
    <!-- Header -->
    <div class="header">
      <h1>Apps</h1>
    </div>

    <!-- Tools Grid -->
    <div class="tools-container">
      <div v-if="tools.length === 0" class="empty-state">
        <div class="empty-icon">🛠️</div>
        <h2>No Tools Available Yet</h2>
        <p>Tools will appear here once they are added to the collection.</p>
        <div class="getting-started">
          <h3>Getting Started</h3>
          <p>To add a new tool:</p>
          <ol>
            <li>Create a new component in <code>src/components/tools/</code></li>
            <li>Add a route in <code>src/router/index.ts</code></li>
            <li>Update the tools array in this view</li>
          </ol>
        </div>
      </div>

      <div v-else class="tools-grid">
        <RouterLink 
          v-for="tool in tools" 
          :key="tool.id"
          :to="tool.path"
          class="tool-card"
          :class="{ 'coming-soon': tool.status === 'coming-soon' }"
        >
          <div class="tool-icon">{{ tool.icon }}</div>
          <h3 class="tool-name">{{ tool.name }}</h3>
          <p class="tool-description">{{ tool.description }}</p>
          <div v-if="tool.status === 'coming-soon'" class="coming-soon-badge">
            Coming Soon
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  min-height: -webkit-fill-available;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  margin: 0;
}

.header {
  text-align: center;
  margin-bottom: 40px;
  flex-shrink: 0;
}

.header h1 {
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 16px;
  color: white;
}

.subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.tools-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  max-width: 600px;
  padding: 40px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 24px;
}

.empty-state h2 {
  font-size: 2rem;
  margin-bottom: 16px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.empty-state p {
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 32px;
  line-height: 1.6;
}

.getting-started {
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 24px;
  text-align: left;
  margin-top: 32px;
  border: 1px solid rgba(255,255,255,0.2);
}

.getting-started h3 {
  margin-bottom: 16px;
  color: #ffd43b;
  font-size: 1.3rem;
}

.getting-started p {
  margin-bottom: 12px;
  font-size: 1rem;
}

.getting-started ol {
  margin-left: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.getting-started ol li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.getting-started code {
  background: rgba(0,0,0,0.3);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Consolas', monospace;
  color: #ffd43b;
  font-size: 0.9rem;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  width: 100%;
}

.tool-card {
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 32px 24px;
  text-decoration: none;
  color: white;
  transition: all 0.2s ease;
  text-align: center;
  position: relative;
  border: 1px solid rgba(255,255,255,0.2);
  cursor: pointer;
}

.tool-card:hover {
  background: rgba(255,255,255,0.25);
  transform: translateY(-2px);
}

.tool-card.coming-soon {
  opacity: 0.7;
  cursor: not-allowed;
}

.tool-card.coming-soon:hover {
  transform: none;
  background: rgba(255,255,255,0.15);
}

.tool-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.tool-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 12px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.tool-description {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
  font-size: 1rem;
}

.coming-soon-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ffd43b;
  color: #333;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.footer {
  text-align: center;
  padding: 24px 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  margin-top: auto;
  flex-shrink: 0;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .home {
    padding: 16px;
  }
  
  .header h1 {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.1rem;
  }
  
  .tools-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .empty-state {
    padding: 24px;
  }
  
  .getting-started {
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .header h1 {
    font-size: 2rem;
  }
  
  .tool-card {
    padding: 24px 20px;
  }
  
  .tool-icon {
    font-size: 2.5rem;
  }
  
  .tool-name {
    font-size: 1.3rem;
  }
}

/* Landscape orientation adjustments */
@media (orientation: landscape) and (max-height: 600px) {
  .home {
    padding: 16px;
  }
  
  .header {
    margin-bottom: 24px;
  }
  
  .header h1 {
    font-size: 2rem;
    margin-bottom: 8px;
  }
  
  .subtitle {
    font-size: 1rem;
  }
}

/* Desktop specific adjustments */
@media (min-width: 1024px) {
  .home {
    padding: 40px 60px;
  }
  
  .header h1 {
    font-size: 3.5rem;
  }
  
  .empty-state {
    max-width: 700px;
    padding: 60px 40px;
  }
}

@media (min-width: 1440px) {
  .home {
    padding: 60px 80px;
  }
}
</style>

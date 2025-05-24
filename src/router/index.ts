import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    // Tools routes (without /tools/ prefix)
    {
      path: '/ab-workout',
      name: 'ab-workout',
      component: () => import('../components/tools/AbWorkout.vue'),
    },
    
    // Catch-all route for 404
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router

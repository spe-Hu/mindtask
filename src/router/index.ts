/**
 * Router config with calendar view support
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: () => '/mindmap' },
    { path: '/project/:projectId/mindmap', name: 'MindMap', component: () => import('@/views/MindMapView.vue') },
    { path: '/project/:projectId/tasks', name: 'Tasks', component: () => import('@/views/TaskListView.vue') },
    { path: '/project/:projectId/board', name: 'Board', component: () => import('@/views/BoardView.vue') },
    { path: '/project/:projectId/calendar', name: 'Calendar', component: () => import('@/views/CalendarView.vue') },
    { path: '/project/:projectId/dashboard', name: 'Dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/mindmap', name: 'MindMapDefault', component: () => import('@/views/MindMapView.vue') },
    { path: '/tasks', name: 'TasksDefault', component: () => import('@/views/TaskListView.vue') },
    { path: '/board', name: 'BoardDefault', component: () => import('@/views/BoardView.vue') },
    { path: '/calendar', name: 'CalendarDefault', component: () => import('@/views/CalendarView.vue') },
    { path: '/dashboard', name: 'DashboardDefault', component: () => import('@/views/DashboardView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router

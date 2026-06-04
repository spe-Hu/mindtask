/**
 * 路由配置
 * 项目级路由
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => '/mindmap',
    },
    {
      path: '/project/:projectId/mindmap',
      name: 'MindMap',
      component: () => import('@/views/MindMapView.vue'),
    },
    {
      path: '/project/:projectId/tasks',
      name: 'Tasks',
      component: () => import('@/views/TaskListView.vue'),
    },
    {
      path: '/project/:projectId/board',
      name: 'Board',
      component: () => import('@/views/BoardView.vue'),
    },
    {
      path: '/project/:projectId/dashboard',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    // 兼容旧路由（无 projectId）
    {
      path: '/mindmap',
      name: 'MindMapDefault',
      component: () => import('@/views/MindMapView.vue'),
    },
    {
      path: '/tasks',
      name: 'TasksDefault',
      component: () => import('@/views/TaskListView.vue'),
    },
    {
      path: '/board',
      name: 'BoardDefault',
      component: () => import('@/views/BoardView.vue'),
    },
    {
      path: '/dashboard',
      name: 'DashboardDefault',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

export default router

/**
 * 路由配置
 * 两个主视图：思维导图 和 任务列表
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/mindmap',
    },
    {
      path: '/mindmap',
      name: 'MindMap',
      component: () => import('@/views/MindMapView.vue'),
    },
    {
      path: '/tasks',
      name: 'Tasks',
      component: () => import('@/views/TaskListView.vue'),
    },
    {
      // 404 catch-all：跳转到思维导图
      path: '/:pathMatch(.*)*',
      redirect: '/mindmap',
    },
  ],
})

export default router

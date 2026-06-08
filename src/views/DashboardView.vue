<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import type { TaskPriority } from '@/types/task'

const taskStore = useTaskStore()
onMounted(() => { taskStore.loadFromDB() })

const stats = computed(() => taskStore.getTaskStats())
const completionRate = computed(() => { const t = taskStore.taskList.length; if(t === 0) return 0; return Math.round((taskStore.completedTasks.length / t) * 100) })
const priorityStats = computed(() => { const ts = taskStore.taskList; return { urgent: ts.filter(t => t.priority === 'urgent').length, high: ts.filter(t => t.priority === 'high').length, medium: ts.filter(t => t.priority === 'medium').length, low: ts.filter(t => t.priority === 'low').length } })
const overdueCount = computed(() => { const today = new Date(); today.setHours(23,59,59,999); return taskStore.taskList.filter(t => { if(!t.dueDate || t.status === 'done') return false; return new Date(t.dueDate) < today }).length })
const todayCompletedCount = computed(() => { const today = new Date(); today.setHours(0,0,0,0); return taskStore.taskList.filter(t => { if(t.status !== 'done' || !t.updatedAt) return false; return new Date(t.updatedAt) >= today }).length })
function priorityColor(p: TaskPriority): string { switch(p) { case 'urgent': return '#FF4444'; case 'high': return '#F56C6C'; case 'medium': return '#E6A23C'; case 'low': return '#67C23A' } }
</script>

<template>
  <div class="dashboard-view">
    <div class="dashboard-header"><h2 class="dashboard-title">Dashboard</h2></div>
    <div class="overview-cards">
      <div class="stat-card"><div class="stat-card__value">{{ stats.total }}</div><div class="stat-card__label">Total Tasks</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:var(--c-warning)">{{ stats.doing }}</div><div class="stat-card__label">In Progress</div></div>
      <div class="stat-card"><div class="stat-card__value" style="color:var(--c-success)">{{ stats.done }}</div><div class="stat-card__label">Completed</div></div>
      <div class="stat-card"><div class="stat-card__value">{{ completionRate }}%</div><div class="stat-card__label">Completion Rate</div></div>
    </div>
    <div class="detail-sections">
      <div class="detail-card">
        <h3 class="detail-card__title">Priority Distribution</h3>
        <div class="priority-bars">
          <div class="priority-bar" v-for="p in (['urgent','high','medium','low'] as TaskPriority[])" :key="p">
            <div class="priority-bar__header"><span class="priority-bar__label">{{ p }}</span><span class="priority-bar__count">{{ priorityStats[p] }}</span></div>
            <div class="priority-bar__track"><div class="priority-bar__fill" :style="{ width: stats.total > 0 ? (priorityStats[p] / stats.total * 100) + '%' : '0%', backgroundColor: priorityColor(p) }"></div></div>
          </div>
        </div>
      </div>
      <div class="detail-card">
        <h3 class="detail-card__title">Status Distribution</h3>
        <div class="status-chart">
          <div class="status-item"><div class="status-item__bar status-item__bar--todo" :style="{ height: Math.max(stats.todo * 10, 4) + 'px' }"></div><div class="status-item__label">To Do</div><div class="status-item__count">{{ stats.todo }}</div></div>
          <div class="status-item"><div class="status-item__bar status-item__bar--doing" :style="{ height: Math.max(stats.doing * 10, 4) + 'px' }"></div><div class="status-item__label">Doing</div><div class="status-item__count">{{ stats.doing }}</div></div>
          <div class="status-item"><div class="status-item__bar status-item__bar--done" :style="{ height: Math.max(stats.done * 10, 4) + 'px' }"></div><div class="status-item__label">Done</div><div class="status-item__count">{{ stats.done }}</div></div>
        </div>
      </div>
      <div class="detail-card">
        <h3 class="detail-card__title">Metrics</h3>
        <div class="metrics-list">
          <div class="metric-item"><span class="metric-item__label">Overdue</span><span class="metric-item__value" :class="{'metric-item__value--warn': overdueCount > 0}">{{ overdueCount }}</span></div>
          <div class="metric-item"><span class="metric-item__label">Pending</span><span class="metric-item__value">{{ stats.todo }}</span></div>
          <div class="metric-item"><span class="metric-item__label">Today Completed</span><span class="metric-item__value">{{ todayCompletedCount }}</span></div>
          <div class="metric-item"><span class="metric-item__label">Tags</span><span class="metric-item__value">{{ taskStore.allTags.length }}</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view { display: flex; flex-direction: column; height: 100%; overflow-y: auto; background: var(--c-bg); padding: 24px }
.dashboard-header { margin-bottom: 24px }
.dashboard-title { font-size: 24px; font-weight: 600; color: var(--c-text); margin: 0 }
.overview-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px }
.stat-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px; padding: 20px; text-align: center }
.stat-card:hover { border-color: var(--c-primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1) }
.stat-card__value { font-size: 32px; font-weight: 700; color: var(--c-primary); line-height: 1 }
.stat-card__label { font-size: 13px; color: var(--c-text-3); margin-top: 8px; font-weight: 500 }
.detail-sections { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px }
.detail-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px; padding: 20px }
.detail-card__title { font-size: 16px; font-weight: 600; color: var(--c-text); margin: 0 0 16px }
.priority-bars { display: flex; flex-direction: column; gap: 10px }
.priority-bar__header { display: flex; justify-content: space-between; margin-bottom: 4px }
.priority-bar__label { font-size: 13px; color: var(--c-text-2); text-transform: capitalize }
.priority-bar__count { font-size: 13px; color: var(--c-text); font-weight: 600 }
.priority-bar__track { height: 8px; background: var(--c-bg-3); border-radius: 4px; overflow: hidden }
.priority-bar__fill { height: 100%; border-radius: 4px; transition: width 0.5s ease-out }
.status-chart { display: flex; align-items: flex-end; gap: 24px; justify-content: center; height: 120px }
.status-item { display: flex; flex-direction: column; align-items: center; gap: 6px }
.status-item__bar { width: 40px; border-radius: 4px 4px 0 0; transition: height 0.5s ease-out; min-height: 4px }
.status-item__bar--todo { background: var(--c-text-3) }
.status-item__bar--doing { background: var(--c-warning) }
.status-item__bar--done { background: var(--c-success) }
.status-item__label { font-size: 12px; color: var(--c-text-3) }
.status-item__count { font-size: 14px; font-weight: 600; color: var(--c-text) }
.metrics-list { display: flex; flex-direction: column; gap: 12px }
.metric-item { display: flex; justify-content: space-between; align-items: center }
.metric-item__label { font-size: 14px; color: var(--c-text-2) }
.metric-item__value { font-size: 16px; font-weight: 600; color: var(--c-text) }
.metric-item__value--warn { color: var(--c-danger) }
</style>

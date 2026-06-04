<script setup lang="ts">
/**
 * 统计仪表板视图
 * 展示项目任务统计数据
 */
import { computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import type { TaskPriority } from '@/types/task'

const taskStore = useTaskStore()

onMounted(() => {
  taskStore.loadFromDB()
})

/** 基础统计 */
const stats = computed(() => taskStore.getTaskStats())

/** 完成率 */
const completionRate = computed(() => {
  const total = taskStore.taskList.length
  if (total === 0) return 0
  return Math.round((taskStore.completedTasks.length / total) * 100)
})

/** 按优先级统计 */
const priorityStats = computed(() => {
  const high = taskStore.taskList.filter(t => t.priority === 'high').length
  const medium = taskStore.taskList.filter(t => t.priority === 'medium').length
  const low = taskStore.taskList.filter(t => t.priority === 'low').length
  return { high, medium, low }
})

/** 逾期任务数 */
const overdueCount = computed(() => {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return taskStore.taskList.filter(t => {
    if (!t.dueDate || t.status === 'done') return false
    const due = new Date(t.dueDate)
    return due < today
  }).length
})

/** 今日完成数 */
const todayCompletedCount = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return taskStore.taskList.filter(t => {
    if (t.status !== 'done' || !t.updatedAt) return false
    const updated = new Date(t.updatedAt)
    return updated >= today
  }).length
})

/** 优先级颜色 */
function priorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'high': return '#F56C6C'
    case 'medium': return '#E6A23C'
    case 'low': return '#67C23A'
  }
}
</script>

<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <h2 class="dashboard-title">统计仪表板</h2>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-cards">
      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--total">📊</div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.total }}</div>
          <div class="stat-card__label">总任务数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--doing">🔄</div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.doing }}</div>
          <div class="stat-card__label">进行中</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--done">✅</div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ stats.done }}</div>
          <div class="stat-card__label">已完成</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-card__icon stat-card__icon--rate">📈</div>
        <div class="stat-card__content">
          <div class="stat-card__value">{{ completionRate }}%</div>
          <div class="stat-card__label">完成率</div>
        </div>
      </div>
    </div>

    <!-- 详细统计 -->
    <div class="detail-sections">
      <!-- 优先级分布 -->
      <div class="detail-card">
        <h3 class="detail-card__title">优先级分布</h3>
        <div class="priority-bars">
          <div class="priority-bar">
            <div class="priority-bar__header">
              <span class="priority-bar__label">高优先级</span>
              <span class="priority-bar__count">{{ priorityStats.high }}</span>
            </div>
            <div class="priority-bar__track">
              <div
                class="priority-bar__fill"
                :style="{
                  width: stats.total > 0 ? `${(priorityStats.high / stats.total) * 100}%` : '0%',
                  backgroundColor: priorityColor('high')
                }"
              ></div>
            </div>
          </div>

          <div class="priority-bar">
            <div class="priority-bar__header">
              <span class="priority-bar__label">中优先级</span>
              <span class="priority-bar__count">{{ priorityStats.medium }}</span>
            </div>
            <div class="priority-bar__track">
              <div
                class="priority-bar__fill"
                :style="{
                  width: stats.total > 0 ? `${(priorityStats.medium / stats.total) * 100}%` : '0%',
                  backgroundColor: priorityColor('medium')
                }"
              ></div>
            </div>
          </div>

          <div class="priority-bar">
            <div class="priority-bar__header">
              <span class="priority-bar__label">低优先级</span>
              <span class="priority-bar__count">{{ priorityStats.low }}</span>
            </div>
            <div class="priority-bar__track">
              <div
                class="priority-bar__fill"
                :style="{
                  width: stats.total > 0 ? `${(priorityStats.low / stats.total) * 100}%` : '0%',
                  backgroundColor: priorityColor('low')
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 任务状态分布 -->
      <div class="detail-card">
        <h3 class="detail-card__title">状态分布</h3>
        <div class="status-chart">
          <div class="status-item">
            <div class="status-item__bar status-item__bar--todo" :style="{ height: `${stats.todo * 10}px` }"></div>
            <div class="status-item__label">待办</div>
            <div class="status-item__count">{{ stats.todo }}</div>
          </div>
          <div class="status-item">
            <div class="status-item__bar status-item__bar--doing" :style="{ height: `${stats.doing * 10}px` }"></div>
            <div class="status-item__label">进行中</div>
            <div class="status-item__count">{{ stats.doing }}</div>
          </div>
          <div class="status-item">
            <div class="status-item__bar status-item__bar--done" :style="{ height: `${stats.done * 10}px` }"></div>
            <div class="status-item__label">已完成</div>
            <div class="status-item__count">{{ stats.done }}</div>
          </div>
        </div>
      </div>

      <!-- 特殊统计 -->
      <div class="detail-card">
        <h3 class="detail-card__title">其他指标</h3>
        <div class="metrics-list">
          <div class="metric-item">
            <span class="metric-item__icon">⚠️</span>
            <span class="metric-item__label">逾期任务</span>
            <span class="metric-item__value">{{ overdueCount }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-item__icon">📝</span>
            <span class="metric-item__label">待办任务</span>
            <span class="metric-item__value">{{ stats.todo }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-item__icon">🎯</span>
            <span class="metric-item__label">今日完成</span>
            <span class="metric-item__value">{{ todayCompletedCount }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-item__icon">🏷️</span>
            <span class="metric-item__label">标签总数</span>
            <span class="metric-item__value">{{ taskStore.allTags.length }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 600;
  color: #e0e0f0;
  margin: 0;
}

/* 概览卡片 */
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #2d2d44;
}

.stat-card__icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(102, 126, 234, 0.1);
}

.stat-card__icon--total {
  background: rgba(102, 126, 234, 0.15);
}

.stat-card__icon--doing {
  background: rgba(230, 162, 60, 0.15);
}

.stat-card__icon--done {
  background: rgba(103, 194, 58, 0.15);
}

.stat-card__icon--rate {
  background: rgba(64, 158, 255, 0.15);
}

.stat-card__content {
  flex: 1;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: #e0e0f0;
  line-height: 1;
}

.stat-card__label {
  font-size: 14px;
  color: #8b8b9e;
  margin-top: 4px;
}

/* 详细统计 */
.detail-sections {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.detail-card {
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #2d2d44;
  padding: 20px;
}

.detail-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0f0;
  margin: 0 0 16px 0;
}

/* 优先级条形图 */
.priority-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.priority-bar__header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.priority-bar__label {
  font-size: 14px;
  color: #b0b0c8;
}

.priority-bar__count {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0f0;
}

.priority-bar__track {
  height: 8px;
  background: #2d2d44;
  border-radius: 4px;
  overflow: hidden;
}

.priority-bar__fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* 状态柱状图 */
.status-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding-top: 20px;
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.status-item__bar {
  width: 40px;
  min-height: 4px;
  border-radius: 4px 4px 0 0;
  transition: height 0.3s ease;
}

.status-item__bar--todo {
  background: #8b8b9e;
}

.status-item__bar--doing {
  background: #E6A23C;
}

.status-item__bar--done {
  background: #67C23A;
}

.status-item__label {
  font-size: 12px;
  color: #8b8b9e;
}

.status-item__count {
  font-size: 14px;
  font-weight: 600;
  color: #e0e0f0;
}

/* 指标列表 */
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #16162a;
  border-radius: 6px;
}

.metric-item__icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.metric-item__label {
  flex: 1;
  font-size: 14px;
  color: #b0b0c8;
}

.metric-item__value {
  font-size: 18px;
  font-weight: 700;
  color: #e0e0f0;
}
</style>

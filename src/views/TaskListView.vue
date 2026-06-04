<script setup lang="ts">
/**
 * 任务列表视图
 * 参考滴答清单风格：左侧筛选 + 右侧任务列表 + 详情面板
 */
import { ref, computed, onMounted, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import type { Task, TaskFilterType, TaskPriority, TaskStatus } from '@/types/task'
import TaskDetailPanel from '@/components/task/TaskDetailPanel.vue'

const taskStore = useTaskStore()
const router = useRouter()

// 详情面板
const showDetail = ref(false)
const detailTaskId = ref('')

onMounted(() => {
  taskStore.loadFromDB()
})

/** 筛选分类 */
const filterGroups: { label: string; value: TaskFilterType; icon: string; count: ComputedRef<number> }[] = [
  { label: '今日', value: 'today', icon: '☀️', count: computed(() => taskStore.todayTasks.length) },
  { label: '接下来', value: 'upcoming', icon: '📅', count: computed(() => taskStore.upcomingTasks.length) },
  { label: '本周', value: 'week', icon: '📋', count: computed(() => taskStore.weekTasks.length) },
  { label: '全部', value: 'all', icon: '📝', count: computed(() => taskStore.taskList.length) },
  { label: '已完成', value: 'completed', icon: '✅', count: computed(() => taskStore.completedTasks.length) },
]

/** 选中筛选 */
function setFilter(filter: TaskFilterType) {
  taskStore.currentFilter = filter
}

/** 优先级标签颜色 */
function priorityColor(priority?: TaskPriority): string {
  switch (priority) {
    case 'high': return '#F56C6C'
    case 'medium': return '#E6A23C'
    case 'low': return '#67C23A'
    default: return '#8b8b9e'
  }
}

/** 优先级标签文本 */
function priorityText(priority?: TaskPriority): string {
  switch (priority) {
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return ''
  }
}

/** 状态标签类型 */
function statusType(status: TaskStatus): string {
  switch (status) {
    case 'todo': return 'info'
    case 'doing': return 'warning'
    case 'done': return 'success'
    default: return 'info'
  }
}

/** 状态标签文本 */
function statusText(status: TaskStatus): string {
  switch (status) {
    case 'todo': return '未开始'
    case 'doing': return '进行中'
    case 'done': return '已完成'
    default: return ''
  }
}

/** 切换任务完成状态 */
async function toggleDone(task: Task) {
  const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
  await taskStore.updateTask(task.id, {
    status: newStatus,
    progress: newStatus === 'done' ? 100 : 0,
  })
}

/** 点击任务打开详情 */
function openDetail(task: Task) {
  detailTaskId.value = task.id
  showDetail.value = true
}

/** 更新任务字段 */
async function updateField(field: string, value: any) {
  await taskStore.updateTask(detailTaskId.value, { [field]: value })
}

/** 更新任务状态 */
async function onDetailStatusChange(status: string) {
  await taskStore.updateTask(detailTaskId.value, {
    status: status as TaskStatus,
    progress: status === 'done' ? 100 : status === 'todo' ? 0 : undefined,
  })
}

/** 跳转到思维导图并定位到节点 */
function goToMindmap(task: Task) {
  router.push('/mindmap')
}

/** 任务统计 */
const stats = computed(() => taskStore.getTaskStats())

/** 抽屉中的任务对象（响应式） */
const drawerTask = computed(() => taskStore.getTaskByNodeId(detailTaskId.value))
</script>

<template>
  <div class="task-list-view">
    <!-- 左侧：筛选面板 -->
    <aside class="task-sidebar">
      <div class="sidebar-stats">
        <div class="stat-item">
          <span class="stat-num">{{ stats.total }}</span>
          <span class="stat-label">总计</span>
        </div>
        <div class="stat-item">
          <span class="stat-num stat-num--doing">{{ stats.doing }}</span>
          <span class="stat-label">进行中</span>
        </div>
        <div class="stat-item">
          <span class="stat-num stat-num--done">{{ stats.done }}</span>
          <span class="stat-label">已完成</span>
        </div>
      </div>

      <div class="sidebar-filters">
        <div
          v-for="group in filterGroups"
          :key="group.value"
          class="filter-item"
          :class="{ 'filter-item--active': taskStore.currentFilter === group.value }"
          @click="setFilter(group.value)"
        >
          <span class="filter-icon">{{ group.icon }}</span>
          <span class="filter-label">{{ group.label }}</span>
          <span class="filter-count">{{ group.count.value }}</span>
        </div>
      </div>

      <!-- 搜索 -->
      <div class="sidebar-search">
        <el-input
          v-model="taskStore.searchQuery"
          placeholder="搜索任务..."
          clearable
          size="small"
        />
      </div>
    </aside>

    <!-- 右侧：任务列表 -->
    <main class="task-content">
      <div class="content-header">
        <h2 class="content-title">
          {{ filterGroups.find(g => g.value === taskStore.currentFilter)?.label || '全部' }}
        </h2>
        <el-select
          v-model="taskStore.currentSort"
          size="small"
          style="width: 130px"
        >
          <el-option label="创建时间" value="createdAt" />
          <el-option label="截止日期" value="dueDate" />
          <el-option label="优先级" value="priority" />
          <el-option label="状态" value="status" />
        </el-select>
      </div>

      <div class="task-list" v-if="taskStore.filteredTasks.length > 0">
        <div
          v-for="task in taskStore.filteredTasks"
          :key="task.id"
          class="task-card"
          :class="{ 'task-card--done': task.status === 'done' }"
          @click="openDetail(task)"
        >
          <div class="task-card__check" @click.stop="toggleDone(task)">
            <el-checkbox
              :model-value="task.status === 'done'"
              size="large"
            />
          </div>

          <div class="task-card__body">
            <div class="task-card__title">{{ task.title }}</div>
            <div class="task-card__meta">
              <el-tag
                v-if="task.priority"
                :color="priorityColor(task.priority)"
                size="small"
                effect="dark"
                style="border: none"
              >
                {{ priorityText(task.priority) }}
              </el-tag>
              <el-tag
                :type="(statusType(task.status) as any)"
                size="small"
              >
                {{ statusText(task.status) }}
              </el-tag>
              <span v-if="task.dueDate" class="task-card__due">
                📅 {{ task.dueDate }}
              </span>
              <span v-if="task.assignee" class="task-card__assignee">
                👤 {{ task.assignee }}
              </span>
            </div>
            <div v-if="task.tags?.length" class="task-card__tags">
              <el-tag
                v-for="tag in task.tags"
                :key="tag"
                size="small"
                type="info"
                effect="plain"
              >
                {{ tag }}
              </el-tag>
            </div>
            <el-progress
              v-if="task.progress !== undefined && task.progress > 0"
              :percentage="task.progress"
              :stroke-width="4"
              :show-text="false"
              style="margin-top: 6px"
            />
          </div>

          <div class="task-card__actions" @click.stop>
            <el-button
              size="small"
              text
              @click="goToMindmap(task)"
              title="在思维导图中查看"
            >
              🧠
            </el-button>
          </div>
        </div>
      </div>

      <div v-else class="task-empty">
        <span class="task-empty__icon">📋</span>
        <p>暂无任务</p>
        <p class="task-empty__hint">在思维导图中右键节点，选择"转为任务"</p>
      </div>
    </main>

    <!-- 详情面板 -->
    <el-drawer
      v-model="showDetail"
      title="任务详情"
      direction="rtl"
      size="380px"
    >
      <template v-if="drawerTask">
        <TaskDetailPanel
          :task="drawerTask"
          @status-change="onDetailStatusChange"
          @update="updateField"
        />
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.task-list-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* 左侧边栏 */
.task-sidebar {
  width: 240px;
  background: #16162a;
  border-right: 1px solid #2d2d44;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
}

.sidebar-stats {
  display: flex;
  justify-content: space-around;
  padding: 16px 12px;
  border-bottom: 1px solid #2d2d44;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #667eea;
}

.stat-num--doing {
  color: #E6A23C;
}

.stat-num--done {
  color: #67C23A;
}

.stat-label {
  font-size: 11px;
  color: #8b8b9e;
}

.sidebar-filters {
  padding: 8px 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.15s;
  color: #b0b0c8;
}

.filter-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.filter-item--active {
  background: rgba(102, 126, 234, 0.12);
  color: #667eea;
}

.filter-icon {
  font-size: 16px;
}

.filter-label {
  flex: 1;
  font-size: 14px;
}

.filter-count {
  font-size: 12px;
  color: #8b8b9e;
  background: rgba(255, 255,  255, 0.06);
  padding: 1px 6px;
  border-radius: 10px;
}

.sidebar-search {
  padding: 12px;
  border-top: 1px solid #2d2d44;
  margin-top: auto;
}

/* 右侧内容区 */
.task-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #2d2d44;
  flex-shrink: 0;
}

.content-title {
  font-size: 20px;
  font-weight: 600;
  color: #e0e0f0;
  margin: 0;
}

.task-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

/* 任务卡片 */
.task-card {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  background: #1e1e36;
  border-radius: 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;
}

.task-card:hover {
  border-color: #3a3a5c;
  background: #252540;
}

.task-card--done {
  opacity: 0.6;
}

.task-card--done .task-card__title {
  text-decoration: line-through;
}

.task-card__check {
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.task-card__body {
  flex: 1;
  min-width: 0;
}

.task-card__title {
  font-size: 15px;
  color: #e0e0f0;
  margin-bottom: 6px;
  line-height: 1.4;
}

.task-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-card__due,
.task-card__assignee {
  font-size: 12px;
  color: #8b8b9e;
}

.task-card__tags {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.task-card__actions {
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.task-card:hover .task-card__actions {
  opacity: 1;
}

/* 空状态 */
.task-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #8b8b9e;
}

.task-empty__icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.task-empty p {
  font-size: 14px;
  margin: 4px 0;
}

.task-empty__hint {
  font-size: 12px;
  color: #5a5a78;
}
</style>

/* 移动端适配 */
@media (max-width: 768px) {
  .task-list-view {
    padding: 8px;
  }

  .toolbar {
    flex-direction: column;
    gap: 8px;
  }

  .search-bar {
    width: 100%;
  }

  .filter-bar {
    flex-wrap: wrap;
    gap: 4px;
  }

  .filter-btn {
    flex: 1;
    min-width: 80px;
    font-size: 12px;
    padding: 6px 10px;
  }

  .task-card {
    padding: 12px;
  }

  .task-card__title {
    font-size: 14px;
  }

  .task-card__meta {
    flex-wrap: wrap;
    gap: 4px;
  }
}

/* 平板适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .task-card {
    padding: 14px;
  }
}

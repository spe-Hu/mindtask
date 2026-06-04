<script setup lang="ts">
/**
 * 看板视图
 * 三列拖拽看板：待办 / 进行中 / 已完成
 */
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import type { Task, TaskStatus, TaskPriority } from '@/types/task'
import TaskDetailPanel from '@/components/task/TaskDetailPanel.vue'

const taskStore = useTaskStore()

// 详情面板
const showDetail = ref(false)
const detailTaskId = ref('')

// 拖拽状态
const draggedTaskId = ref<string | null>(null)
const dragOverColumn = ref<TaskStatus | null>(null)

onMounted(() => {
  taskStore.loadFromDB()
})

/** 三列配置 */
const columns = [
  { status: 'todo' as TaskStatus, label: '待办', icon: '📋', color: '#8b8b9e' },
  { status: 'doing' as TaskStatus, label: '进行中', icon: '🔄', color: '#E6A23C' },
  { status: 'done' as TaskStatus, label: '已完成', icon: '✅', color: '#67C23A' },
]

/** 获取某列的任务 */
function getColumnTasks(status: TaskStatus): Task[] {
  return taskStore.taskList.filter(t => t.status === status)
}

/** 优先级颜色 */
function priorityColor(priority?: TaskPriority): string {
  switch (priority) {
    case 'high': return '#F56C6C'
    case 'medium': return '#E6A23C'
    case 'low': return '#67C23A'
    default: return '#8b8b9e'
  }
}

function priorityText(priority?: TaskPriority): string {
  switch (priority) {
    case 'high': return '高'
    case 'medium': return '中'
    case 'low': return '低'
    default: return ''
  }
}

/** 拖拽开始 */
function onDragStart(task: Task, event: DragEvent) {
  draggedTaskId.value = task.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }
}

function onDragEnter(status: TaskStatus) {
  dragOverColumn.value = status
}

function onDragLeave(status: TaskStatus) {
  if (dragOverColumn.value === status) {
    dragOverColumn.value = null
  }
}

/** 拖拽放置 */
async function onDrop(status: TaskStatus, event: DragEvent) {
  event.preventDefault()
  if (draggedTaskId.value) {
    const task = taskStore.getTaskByNodeId(draggedTaskId.value)
    if (task && task.status !== status) {
      await taskStore.updateTask(task.id, {
        status,
        progress: status === 'done' ? 100 : status === 'todo' ? 0 : task.progress,
      })
    }
  }
  draggedTaskId.value = null
  dragOverColumn.value = null
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}

/** 点击任务打开详情 */
function openDetail(task: Task) {
  detailTaskId.value = task.id
  showDetail.value = true
}

async function updateField(field: string, value: any) {
  await taskStore.updateTask(detailTaskId.value, { [field]: value })
}

async function onDetailStatusChange(status: string) {
  await taskStore.updateTask(detailTaskId.value, {
    status: status as TaskStatus,
    progress: status === 'done' ? 100 : status === 'todo' ? 0 : undefined,
  })
}

const drawerTask = computed(() => taskStore.getTaskByNodeId(detailTaskId.value))
</script>

<template>
  <div class="board-view">
    <div class="board-header">
      <h2 class="board-title">任务看板</h2>
      <div class="board-stats">
        <span class="board-stat">总计: {{ taskStore.taskList.length }}</span>
        <span class="board-stat board-stat--doing">进行中: {{ getColumnTasks('doing').length }}</span>
        <span class="board-stat board-stat--done">已完成: {{ getColumnTasks('done').length }}</span>
      </div>
    </div>

    <div class="board-columns">
      <div
        v-for="column in columns"
        :key="column.status"
        class="board-column"
        :class="{ 'board-column--drag-over': dragOverColumn === column.status }"
        @dragenter="onDragEnter(column.status)"
        @dragleave="onDragLeave(column.status)"
        @dragover="onDragOver"
        @drop="onDrop(column.status, $event)"
      >
        <div class="column-header">
          <span class="column-icon">{{ column.icon }}</span>
          <span class="column-label">{{ column.label }}</span>
          <span class="column-count">{{ getColumnTasks(column.status).length }}</span>
        </div>

        <div class="column-body">
          <div
            v-for="task in getColumnTasks(column.status)"
            :key="task.id"
            class="board-card"
            :class="{ 'board-card--dragging': draggedTaskId === task.id }"
            draggable="true"
            @dragstart="onDragStart(task, $event)"
            @click="openDetail(task)"
          >
            <div class="card-header">
              <el-tag
                v-if="task.priority"
                :color="priorityColor(task.priority)"
                size="small"
                effect="dark"
                style="border: none"
              >
                {{ priorityText(task.priority) }}
              </el-tag>
              <span v-if="task.dueDate" class="card-due">📅 {{ task.dueDate }}</span>
            </div>
            <div class="card-title">{{ task.title }}</div>
            <div v-if="task.tags?.length" class="card-tags">
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
              style="margin-top: 8px"
            />
          </div>

          <div v-if="getColumnTasks(column.status).length === 0" class="column-empty">
            拖拽任务到这里
          </div>
        </div>
      </div>
    </div>

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
.board-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  overflow: hidden;
}

.board-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.board-title {
  font-size: 24px;
  font-weight: 600;
  color: #e0e0f0;
  margin: 0;
}

.board-stats {
  display: flex;
  gap: 16px;
}

.board-stat {
  font-size: 14px;
  color: #8b8b9e;
}

.board-stat--doing {
  color: #E6A23C;
}

.board-stat--done {
  color: #67C23A;
}

.board-columns {
  display: flex;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}

.board-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  transition: background 0.2s;
}

.board-column--drag-over {
  background: #252540;
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid #2d2d44;
}

.column-icon {
  font-size: 18px;
}

.column-label {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #e0e0f0;
}

.column-count {
  font-size: 12px;
  color: #8b8b9e;
  background: rgba(255, 255, 255, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}

.column-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.board-card {
  background: #1e1e36;
  border: 1px solid #2d2d44;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: move;
  transition: all 0.2s;
}

.board-card:hover {
  border-color: #3a3a5c;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.board-card--dragging {
  opacity: 0.5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-due {
  font-size: 12px;
  color: #8b8b9e;
}

.card-title {
  font-size: 14px;
  color: #e0e0f0;
  line-height: 1.4;
  margin-bottom: 8px;
}

.card-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.column-empty {
  text-align: center;
  padding: 40px 20px;
  color: #5a5a78;
  font-size: 14px;
}
</style>

/* 移动端适配 */
@media (max-width: 768px) {
  .board-view {
    padding: 8px;
  }

  .board-columns {
    flex-direction: column;
    gap: 12px;
  }

  .board-column {
    min-height: 200px;
  }

  .column-header {
    padding: 10px;
  }

  .column-title {
    font-size: 14px;
  }

  .board-card {
    padding: 10px;
  }

  .card-title {
    font-size: 13px;
  }
}

/* 平板适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .board-columns {
    gap: 12px;
  }

  .board-card {
    padding: 11px;
  }
}

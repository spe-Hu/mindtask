<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useLocaleStore } from '@/stores/locale'
import type { Task, TaskStatus, TaskPriority } from '@/types/task'
import TaskDetailPanel from '@/components/task/TaskDetailPanel.vue'

const taskStore = useTaskStore()
const localeStore = useLocaleStore()
const t = localeStore.t
const showDetail = ref(false)
const detailTaskId = ref('')
const draggedTaskId = ref<string | null>(null)
const dragOverColumn = ref<TaskStatus | null>(null)
const dragOverTaskId = ref<string | null>(null)

onMounted(() => { taskStore.loadFromDB() })

const columns = computed(() => taskStore.getProjectBoardColumns())

function getColumnTasks(status: TaskStatus | string): Task[] {
  return taskStore.taskList.filter(t => t.status === status).sort((a, b) => a.order - b.order)
}

function priorityColor(p?: TaskPriority): string { switch(p) { case 'urgent': return '#FF4444'; case 'high': return '#F56C6C'; case 'medium': return '#E6A23C'; case 'low': return '#67C23A'; default: return '#8b8b9e' } }
function priorityText(p?: TaskPriority): string { switch(p) { case 'urgent': return 'P1'; case 'high': return 'P2'; case 'medium': return 'P3'; case 'low': return 'P4'; default: return '' } }

function onDragStart(task: Task, e: DragEvent) { draggedTaskId.value = task.id; if(e.dataTransfer) e.dataTransfer.effectAllowed = 'move' }
function onDragEnter(status: TaskStatus) { dragOverColumn.value = status }
function onDragLeave(status: TaskStatus) { if(dragOverColumn.value === status) dragOverColumn.value = null }
function onDragOverTask(task: Task) { dragOverTaskId.value = task.id }
function onDragOver(e: DragEvent) { e.preventDefault() }

async function onDrop(status: TaskStatus, e: DragEvent) {
  e.preventDefault()
  if (!draggedTaskId.value) return
  const task = taskStore.getTaskByNodeId(draggedTaskId.value)
  if (!task) return

  // Status change
  if (task.status !== status) {
    await taskStore.updateTask(task.id, { status, progress: status === 'done' ? 100 : status === 'todo' ? 0 : task.progress })
  }

  // Reorder within column
  if (dragOverTaskId.value && dragOverTaskId.value !== draggedTaskId.value) {
    const colTasks = getColumnTasks(status)
    const dragIdx = colTasks.findIndex(t => t.id === draggedTaskId.value)
    const dropIdx = colTasks.findIndex(t => t.id === dragOverTaskId.value)
    if (dragIdx >= 0 && dropIdx >= 0) {
      const [moved] = colTasks.splice(dragIdx, 1)
      colTasks.splice(dropIdx, 0, moved)
      await taskStore.reorderTasks(colTasks.map(t => t.id))
    }
  }

  draggedTaskId.value = null
  dragOverColumn.value = null
  dragOverTaskId.value = null
}

function openDetail(task: Task) { detailTaskId.value = task.id; showDetail.value = true }
async function updateField(field: string, value: any) { await taskStore.updateTask(detailTaskId.value, { [field]: value }) }
async function onDetailStatusChange(status: string) { await taskStore.updateTask(detailTaskId.value, { status: status as TaskStatus, progress: status === 'done' ? 100 : 0 }) }
const drawerTask = computed(() => taskStore.getTaskByNodeId(detailTaskId.value))
</script>

<template>
  <div class="board-view">
    <div class="board-header">
      <h2 class="board-title">{{ t('nav.board') }}</h2>
      <div class="board-stats">
        <span class="board-stat">{{ t('common.total') }}: {{ taskStore.taskList.length }}</span>
        <span class="board-stat board-stat--doing">{{ t('status.doing') }}: {{ getColumnTasks('doing').length }}</span>
        <span class="board-stat board-stat--done">{{ t('status.done') }}: {{ getColumnTasks('done').length }}</span>
      </div>
    </div>

    <div class="board-columns">
      <div v-for="column in columns" :key="column.status" class="board-column"
        :class="{'board-column--drag-over': dragOverColumn === column.status}"
        @dragenter="onDragEnter(column.status as TaskStatus)"
        @dragleave="onDragLeave(column.status as TaskStatus)"
        @dragover="onDragOver"
        @drop="onDrop(column.status as TaskStatus, $event)"
      >
        <div class="column-header">
          <span class="column-icon" :style="{ background: column.color }">{{ column.label[0] }}</span>
          <span class="column-label">{{ column.label }}</span>
          <span class="column-count">{{ getColumnTasks(column.status).length }}</span>
        </div>
        <div class="column-body">
          <div v-for="task in getColumnTasks(column.status)" :key="task.id"
            class="board-card"
            :class="{'board-card--dragging': draggedTaskId === task.id, 'board-card--drag-over': dragOverTaskId === task.id}"
            draggable="true"
            @dragstart="onDragStart(task, $event)"
            @dragover="onDragOverTask(task)"
            @click="openDetail(task)"
          >
            <div class="card-header">
              <el-tag v-if="task.priority" :color="priorityColor(task.priority)" size="small" effect="dark" style="border:none">{{ priorityText(task.priority) }}</el-tag>
              <span v-if="task.dueDate" class="card-due">{{ task.dueDate }}</span>
            </div>
            <div class="card-title">{{ task.title }}</div>
            <div v-if="task.tags?.length" class="card-tags"><el-tag v-for="tag in task.tags" :key="tag" size="small" type="info" effect="plain">{{ tag }}</el-tag></div>
            <el-progress v-if="task.progress !== undefined && task.progress > 0" :percentage="task.progress" :stroke-width="4" :show-text="false" style="margin-top:8px" />
            <div v-if="task.children?.length" class="card-subtasks">{{ task.children.filter(c => taskStore.getTaskByNodeId(c)?.status === 'done').length }}/{{ task.children.length }}</div>
          </div>
          <div v-if="getColumnTasks(column.status).length === 0" class="column-empty">Drop tasks here</div>
        </div>
      </div>
    </div>

    <el-drawer v-model="showDetail" :title="t('task.details')" direction="rtl" size="380px">
      <template v-if="drawerTask"><TaskDetailPanel :task="drawerTask" @status-change="onDetailStatusChange" @update="updateField" /></template>
    </el-drawer>
  </div>
</template>

<style scoped>
.board-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--c-bg) }
.board-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--c-border); flex-shrink: 0 }
.board-title { font-size: 20px; font-weight: 600; color: var(--c-text); margin: 0 }
.board-stats { display: flex; gap: 16px }
.board-stat { font-size: 14px; color: var(--c-text-2); font-weight: 500 }
.board-stat--doing { color: var(--c-warning) }
.board-stat--done { color: var(--c-success) }
.board-columns { flex: 1; display: flex; gap: 20px; padding: 20px 24px; overflow-x: auto; overflow-y: hidden }
.board-column { flex: 1; min-width: 300px; max-width: 400px; display: flex; flex-direction: column; background: var(--c-bg-2); border-radius: 10px; border: 1px solid var(--c-border); overflow: hidden; transition: border-color 0.2s }
.board-column--drag-over { border-color: var(--c-primary); background: var(--c-primary-light) }
.column-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--c-border); background: var(--c-surface) }
.column-icon { font-size: 12px; font-weight: 700; width: 24px; height: 24px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; color: white }
.column-label { flex: 1; font-size: 16px; font-weight: 600; color: var(--c-text) }
.column-count { font-size: 12px; color: var(--c-text-3); background: var(--c-bg-3); padding: 2px 8px; border-radius: 10px; font-weight: 600 }
.column-body { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px }
.board-card { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.2s }
.board-card:hover { border-color: var(--c-primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15) }
.board-card--dragging { opacity: 0.5 }
.board-card--drag-over { border-color: var(--c-primary); border-style: dashed }
.card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px }
.card-title { font-size: 14px; font-weight: 500; color: var(--c-text); margin-bottom: 4px; line-height: 1.5 }
.card-due { font-size: 12px; color: var(--c-text-3) }
.card-tags { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap }
.card-subtasks { font-size: 11px; color: var(--c-text-3); margin-top: 6px }
.column-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; color: var(--c-text-3); text-align: center }
</style>

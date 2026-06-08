<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTaskStore } from '@/stores/task'
import { useLocaleStore } from '@/stores/locale'
import type { Task, TaskFilterType, TaskPriority, TaskStatus } from '@/types/task'
import TaskDetailPanel from '@/components/task/TaskDetailPanel.vue'

const taskStore = useTaskStore()
const localeStore = useLocaleStore()
const t = localeStore.t
const showDetail = ref(false)
const detailTaskId = ref('')
const focusedIndex = ref(-1)
const completionAnimating = ref<Set<string>>(new Set())

onMounted(() => { 
  taskStore.loadFromDB()
  window.addEventListener('keydown', handleKeydown)
  console.log('Keyboard navigation initialized')
})

const filterGroups = computed(() => [
  { label: t('filter.today'), value: 'today' as TaskFilterType, icon: 'T', count: () => taskStore.todayTasks.length },
  { label: t('filter.upcoming'), value: 'upcoming' as TaskFilterType, icon: 'U', count: () => taskStore.upcomingTasks.length },
  { label: t('filter.week'), value: 'week' as TaskFilterType, icon: 'W', count: () => taskStore.weekTasks.length },
  { label: t('filter.all'), value: 'all' as TaskFilterType, icon: 'A', count: () => taskStore.taskList.length },
  { label: t('filter.completed'), value: 'completed' as TaskFilterType, icon: 'D', count: () => taskStore.completedTasks.length },
])

function setFilter(f: TaskFilterType) { taskStore.currentFilter = f }
function priorityColor(p?: TaskPriority): string { switch(p) { case 'urgent': return '#FF4444'; case 'high': return '#F56C6C'; case 'medium': return '#E6A23C'; case 'low': return '#67C23A'; default: return '#8b8b9e' } }
function priorityText(p?: TaskPriority): string { switch(p) { case 'urgent': return 'P1'; case 'high': return 'P2'; case 'medium': return 'P3'; case 'low': return 'P4'; default: return '' } }
function statusText(s: TaskStatus): string { switch(s) { case 'todo': return t('status.todo'); case 'doing': return t('status.doing'); case 'done': return t('status.done'); default: return '' } }

async function toggleDone(task: Task) {
  const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
  if (newStatus === 'done') { completionAnimating.value.add(task.id); setTimeout(() => completionAnimating.value.delete(task.id), 800) }
  await taskStore.updateTask(task.id, { status: newStatus, progress: newStatus === 'done' ? 100 : 0 })
  if (newStatus === 'done' && task.recurring?.type && task.recurring.type !== 'none') { await taskStore.completeRecurringTask(task.id) }
}

function openDetail(task: Task) { detailTaskId.value = task.id; showDetail.value = true }
async function updateField(field: string, value: any) { await taskStore.updateTask(detailTaskId.value, { [field]: value }) }
async function onDetailStatusChange(status: string) { await taskStore.updateTask(detailTaskId.value, { status: status as TaskStatus, progress: status === 'done' ? 100 : 0 }) }
const drawerTask = computed(() => taskStore.getTaskByNodeId(detailTaskId.value))
const stats = computed(() => taskStore.getTaskStats())

// Drag and drop
const draggedTaskId = ref<string | null>(null)
function onDragStart(task: Task, e: DragEvent) { draggedTaskId.value = task.id; if(e.dataTransfer) e.dataTransfer.effectAllowed = 'move' }
function onDragOver(e: DragEvent) { e.preventDefault() }
async function onDrop(targetTask: Task, e: DragEvent) {
  e.preventDefault()
  if (!draggedTaskId.value || draggedTaskId.value === targetTask.id) return
  const tasks = [...taskStore.filteredTasks]
  const dragIdx = tasks.findIndex(t => t.id === draggedTaskId.value)
  const dropIdx = tasks.findIndex(t => t.id === targetTask.id)
  if (dragIdx < 0 || dropIdx < 0) return
  const [moved] = tasks.splice(dragIdx, 1)
  tasks.splice(dropIdx, 0, moved)
  await taskStore.reorderTasks(tasks.map(t => t.id))
  draggedTaskId.value = null
}

// Keyboard navigation
async function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  console.log('Key pressed:', e.key, 'Target:', target.tagName, 'Focused index:', focusedIndex.value)
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    console.log('Ignoring key event - target is input/textarea')
    return
  }
  const tasks = taskStore.filteredTasks
  console.log('Available tasks:', tasks.length)
  if (e.key === 'ArrowDown') { 
    e.preventDefault()
    const newIndex = Math.min(focusedIndex.value + 1, tasks.length - 1)
    console.log('ArrowDown: moving from', focusedIndex.value, 'to', newIndex)
    focusedIndex.value = newIndex
  }
  else if (e.key === 'ArrowUp') { 
    e.preventDefault()
    const newIndex = Math.max(focusedIndex.value - 1, 0)
    console.log('ArrowUp: moving from', focusedIndex.value, 'to', newIndex)
    focusedIndex.value = newIndex
  }
  else if (e.key === 'Enter' && focusedIndex.value >= 0) { 
    e.preventDefault()
    console.log('Enter: opening detail for task', focusedIndex.value)
    openDetail(tasks[focusedIndex.value])
  }
  else if (e.key === ' ' && focusedIndex.value >= 0) { 
    e.preventDefault()
    console.log('Space: toggling task', focusedIndex.value, 'Current status:', tasks[focusedIndex.value].status)
    await toggleDone(tasks[focusedIndex.value])
    console.log('Space: task status after toggle:', tasks[focusedIndex.value].status)
  }
  else if (e.key === 'x' && focusedIndex.value >= 0) { 
    console.log('X: selecting task', focusedIndex.value)
    taskStore.toggleTaskSelection(tasks[focusedIndex.value].id)
  }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && focusedIndex.value >= 0) {
    e.preventDefault()
    const task = tasks[focusedIndex.value]
    console.log('Delete/Backspace: deleting task', focusedIndex.value, task.title)
    if (confirm(`${localeStore.t('common.confirmDelete').replace('{title}', task.title)}`)) {
      taskStore.deleteTask(task.id)
      focusedIndex.value = Math.max(0, focusedIndex.value - 1)
    }
  }
  else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) { 
    e.preventDefault()
    console.log('Ctrl+A: selecting all visible')
    taskStore.selectAllVisible()
  }
}



// Section management
const newSectionName = ref('')
async function addSection() { if (!newSectionName.value.trim()) return; await taskStore.createSection(newSectionName.value.trim()); newSectionName.value = '' }

// Import/Export
function exportJSON() {
  const data = taskStore.exportProjectData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'tasks-export.json'; a.click(); URL.revokeObjectURL(url)
}
function exportCSV() {
  const csv = taskStore.exportCSV()
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'tasks-export.csv'; a.click(); URL.revokeObjectURL(url)
}
async function importJSON(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  try { const data = JSON.parse(text); await taskStore.importProjectData(data) } catch { alert('Invalid JSON file') }
}
</script>

<template>
  <div class="task-list-view">
    <aside class="task-sidebar">
      <div class="sidebar-stats">
        <div class="stat-item"><span class="stat-num">{{ stats.total }}</span><span class="stat-label">{{ t('common.total') }}</span></div>
        <div class="stat-item"><span class="stat-num stat-num--doing">{{ stats.doing }}</span><span class="stat-label">{{ t('common.doing') }}</span></div>
        <div class="stat-item"><span class="stat-num stat-num--done">{{ stats.done }}</span><span class="stat-label">{{ t('common.done') }}</span></div>
      </div>
      <div class="sidebar-filters">
        <div v-for="g in filterGroups" :key="g.value" class="filter-item" :class="{'filter-item--active': taskStore.currentFilter === g.value}" @click="setFilter(g.value)">
          <span class="filter-icon">{{ g.icon }}</span>
          <span class="filter-label">{{ g.label }}</span>
          <span class="filter-count">{{ g.count() }}</span>
        </div>
      </div>
      <div class="sidebar-sections">
        <div class="section-header">{{ t('sections.title') }}</div>
        <div v-for="s in taskStore.projectSections" :key="s.id" class="section-item">{{ s.name }}</div>
        <div class="section-add">
          <el-input v-model="newSectionName" size="small" :placeholder="t('sections.newPlaceholder')" @keyup.enter="addSection" />
        </div>
      </div>
      <div class="sidebar-search"><el-input v-model="taskStore.searchQuery" :placeholder="t('common.search') + '...'" clearable size="small" /></div>
      <div class="sidebar-actions">
        <el-button size="small" text @click="exportJSON">{{ t('export.json') }}</el-button>
        <el-button size="small" text @click="exportCSV">{{ t('export.csv') }}</el-button>
        <label class="import-label"><el-button size="small" text>{{ t('export.importJson') }}</el-button><input type="file" accept=".json" @change="importJSON" class="import-file" /></label>
      </div>
    </aside>

    <main class="task-content">
      <!-- Batch action bar -->
      <div v-if="taskStore.selectedTaskIds.size > 0" class="batch-bar">
        <span class="batch-count">{{ taskStore.selectedTaskIds.size }} {{ t('common.selected') }}</span>
        <el-button size="small" @click="taskStore.batchUpdateStatus('todo')">{{ t('status.todo') }}</el-button>
        <el-button size="small" @click="taskStore.batchUpdateStatus('doing')">{{ t('status.doing') }}</el-button>
        <el-button size="small" @click="taskStore.batchUpdateStatus('done')">{{ t('status.done') }}</el-button>
        <el-dropdown @command="(v: string) => taskStore.batchSetPriority(v as TaskPriority)">
          <el-button size="small">{{ t('task.priority') }}</el-button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="urgent">{{ t('priority.urgent') }}</el-dropdown-item><el-dropdown-item command="high">{{ t('priority.high') }}</el-dropdown-item><el-dropdown-item command="medium">{{ t('priority.medium') }}</el-dropdown-item><el-dropdown-item command="low">{{ t('priority.low') }}</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
        <el-button size="small" type="danger" @click="taskStore.batchDelete()">{{ t('common.delete') }}</el-button>
        <el-button size="small" text @click="taskStore.clearSelection()">{{ t('common.cancel') }}</el-button>
      </div>

      <div class="content-header">
        <h2 class="content-title">{{ filterGroups.find(g => g.value === taskStore.currentFilter)?.label || t('filter.all') }}</h2>
        <div class="content-actions">
          <el-button size="small" text @click="taskStore.selectAllVisible()">{{ t('common.selectAll') }}</el-button>
          <el-button size="small" text @click="taskStore.undo()" :disabled="taskStore.undoStack.length === 0">{{ t('common.undo') }}</el-button>
          <el-button size="small" text @click="taskStore.redo()" :disabled="taskStore.redoStack.length === 0">{{ t('common.redo') }}</el-button>
          <el-select v-model="taskStore.currentSort" size="small" style="width:130px">
            <el-option :label="t('sort.created')" value="createdAt" /><el-option :label="t('sort.dueDate')" value="dueDate" /><el-option :label="t('sort.priority')" value="priority" /><el-option :label="t('sort.status')" value="status" /><el-option :label="t('sort.order')" value="order" />
          </el-select>
        </div>
      </div>

      <div class="task-list" v-if="taskStore.filteredTasks.length > 0">
        <div v-for="(task, idx) in taskStore.filteredTasks" :key="task.id"
          class="task-card" :class="{
            'task-card--done': task.status === 'done',
            'task-card--selected': taskStore.selectedTaskIds.has(task.id),
            'task-card--focused': idx === focusedIndex,
            'task-card--completing': completionAnimating.has(task.id)
          }"
          draggable="true"
          @dragstart="onDragStart(task, $event)" @dragover="onDragOver" @drop="onDrop(task, $event)"
          @click="openDetail(task)"
        >
          <div class="task-card__check" @click.stop>
            <el-checkbox :model-value="taskStore.selectedTaskIds.has(task.id)" @update:model-value="taskStore.toggleTaskSelection(task.id)" />
          </div>
          <div class="task-card__status" @click.stop="toggleDone(task)">
            <span class="status-circle" :class="'status-circle--' + task.status">{{ task.status === 'done' ? '✓' : '' }}</span>
          </div>
          <div class="task-card__body">
            <div class="task-card__title">{{ task.title }}</div>
            <div class="task-card__meta">
              <el-tag v-if="task.priority" :color="priorityColor(task.priority)" size="small" effect="dark" style="border:none">{{ priorityText(task.priority) }}</el-tag>
              <el-tag :type="task.status === 'done' ? 'success' : task.status === 'doing' ? 'warning' : 'info'" size="small">{{ statusText(task.status) }}</el-tag>
              <span v-if="task.dueDate" class="task-card__due">{{ task.dueDate }}</span>
              <span v-if="task.assignee" class="task-card__assignee">{{ task.assignee }}</span>
              <span v-if="task.children?.length" class="task-card__subtasks">{{ task.children.length }} {{ t('task.subtasks') }}</span>
              <span v-if="task.totalTrackedTime" class="task-card__time">{{ Math.floor(task.totalTrackedTime / 60000) }}m</span>
              <span v-if="task.recurring?.type !== 'none' && task.recurring" class="task-card__recurring">↻</span>
            </div>
            <div v-if="task.tags?.length" class="task-card__tags"><el-tag v-for="tag in task.tags" :key="tag" size="small" type="info" effect="plain">{{ tag }}</el-tag></div>
            <el-progress v-if="task.progress !== undefined && task.progress > 0" :percentage="task.progress" :stroke-width="4" :show-text="false" style="margin-top:6px" />
          </div>
        </div>
      </div>
      <div v-else class="task-empty"><p>{{ t('task.noTasksEmpty') }}</p><p class="task-empty__hint">{{ t('task.noTasksHint') }}</p></div>
    </main>

    <el-drawer v-model="showDetail" :title="t('task.taskDetails')" direction="rtl" size="400px">
      <template v-if="drawerTask"><TaskDetailPanel :task="drawerTask" @status-change="onDetailStatusChange" @update="updateField" /></template>
    </el-drawer>
  </div>
</template>

<style scoped>
.task-list-view { display: flex; height: 100%; overflow: hidden }
.task-sidebar { width: 240px; background: var(--c-bg-2); border-right: 1px solid var(--c-border); display: flex; flex-direction: column; flex-shrink: 0; overflow-y: auto }
.sidebar-stats { display: flex; justify-content: space-around; padding: 16px; border-bottom: 1px solid var(--c-border) }
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px }
.stat-num { font-size: 22px; font-weight: 600; color: var(--c-primary) }
.stat-num--doing { color: var(--c-warning) }
.stat-num--done { color: var(--c-success) }
.stat-label { font-size: 11px; color: var(--c-text-3); font-weight: 500 }
.sidebar-filters { padding: 8px 0 }
.filter-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin: 0 8px; cursor: pointer; color: var(--c-text-2); border-radius: 6px; transition: all 0.15s }
.filter-item:hover { background: var(--c-surface-hover); color: var(--c-text) }
.filter-item--active { background: var(--c-primary-light); color: var(--c-primary) }
.filter-icon { font-size: 12px; font-weight: 700; width: 22px; height: 22px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; background: var(--c-bg-3); color: var(--c-text-2) }
.filter-item--active .filter-icon { background: var(--c-primary); color: white }
.filter-label { flex: 1; font-size: 14px; font-weight: 500 }
.filter-count { font-size: 12px; color: var(--c-text-3); background: var(--c-bg-3); padding: 2px 8px; border-radius: 10px; font-weight: 600 }
.filter-item--active .filter-count { background: var(--c-primary); color: white }
.sidebar-sections { padding: 8px 12px; border-top: 1px solid var(--c-border) }
.section-header { font-size: 11px; font-weight: 600; color: var(--c-text-3); text-transform: uppercase; margin-bottom: 6px }
.section-item { font-size: 13px; color: var(--c-text-2); padding: 4px 0 }
.section-add { margin-top: 6px }
.sidebar-search { padding: 12px; border-top: 1px solid var(--c-border); margin-top: auto }
.sidebar-actions { display: flex; flex-wrap: wrap; gap: 4px; padding: 8px 12px; border-top: 1px solid var(--c-border) }
.import-label { position: relative; display: inline-block }
.import-file { position: absolute; inset: 0; opacity: 0; cursor: pointer; font-size: 0 }
.task-content { flex: 1; display: flex; flex-direction: column; overflow: hidden }
.batch-bar { display: flex; align-items: center; gap: 8px; padding: 10px 24px; background: var(--c-primary-light); border-bottom: 1px solid var(--c-primary); flex-shrink: 0 }
.batch-count { font-size: 14px; font-weight: 600; color: var(--c-primary); margin-right: 8px }
.content-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--c-border); flex-shrink: 0 }
.content-title { font-size: 20px; font-weight: 600; color: var(--c-text); margin: 0 }
.content-actions { display: flex; align-items: center; gap: 8px }
.task-list { flex: 1; overflow-y: auto; padding: 16px 24px }
.task-card { display: flex; gap: 12px; padding: 12px 16px; background: var(--c-surface); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s; border: 1px solid var(--c-border) }
.task-card:hover { border-color: var(--c-primary); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15) }
.task-card--selected { border-color: var(--c-primary); background: var(--c-primary-light) }
.task-card--focused { outline: 2px solid var(--c-primary); outline-offset: -2px }
.task-card--done { opacity: 0.6 }
.task-card--done .task-card__title { text-decoration: line-through; color: var(--c-text-3) }
@keyframes completeFlash { 0% { background: var(--c-success-light) } 100% { background: var(--c-surface) } }
.task-card--completing { animation: completeFlash 0.8s ease-out }
.task-card__check { display: flex; align-items: flex-start; padding-top: 2px }
.task-card__status { display: flex; align-items: flex-start; padding-top: 2px; cursor: pointer }
.status-circle { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--c-border-light); display: flex; align-items: center; justify-content: center; font-size: 12px; color: white; transition: all 0.2s }
.status-circle--doing { border-color: var(--c-warning); background: var(--c-warning); color: white }
.status-circle--done { border-color: var(--c-success); background: var(--c-success); color: white }
.task-card__body { flex: 1; min-width: 0 }
.task-card__title { font-size: 14px; color: var(--c-text); margin-bottom: 6px; line-height: 1.5; font-weight: 500 }
.task-card__meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap }
.task-card__due, .task-card__assignee, .task-card__subtasks, .task-card__time { font-size: 12px; color: var(--c-text-3) }
.task-card__recurring { font-size: 14px; color: var(--c-primary) }
.task-card__tags { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap }
.task-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--c-text-3) }
.task-empty p { font-size: 14px; margin: 4px 0 }
.task-empty__hint { font-size: 12px }
</style>

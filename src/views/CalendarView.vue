<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'
import type { Task, TaskStatus, TaskPriority } from '@/types/task'
import TaskDetailPanel from '@/components/task/TaskDetailPanel.vue'

const taskStore = useTaskStore()
const currentDate = ref(new Date())
const viewMode = ref<'month'|'week'|'day'>('month')
const showDetail = ref(false)
const detailTaskId = ref('')

onMounted(() => { taskStore.loadFromDB() })

function prevMonth() { const d = new Date(currentDate.value); d.setMonth(d.getMonth()-1); currentDate.value = d }
function nextMonth() { const d = new Date(currentDate.value); d.setMonth(d.getMonth()+1); currentDate.value = d }
function goToday() { currentDate.value = new Date() }

const year = computed(() => currentDate.value.getFullYear())
const month = computed(() => currentDate.value.getMonth())
const monthLabel = computed(() => currentDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }))

const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const calendarDays = computed(() => {
  const firstDay = new Date(year.value, month.value, 1)
  const lastDay = new Date(year.value, month.value + 1, 0)
  const startDay = firstDay.getDay()
  const daysInMonth = lastDay.getDate()
  const days: { date: number; month: number; year: number; isCurrentMonth: boolean; isToday: boolean }[] = []
  const prevMonthDays = new Date(year.value, month.value, 0).getDate()
  for (let i = startDay - 1; i >= 0; i--) days.push({ date: prevMonthDays - i, month: month.value - 1, year: year.value, isCurrentMonth: false, isToday: false })
  const today = new Date()
  for (let i = 1; i <= daysInMonth; i++) days.push({ date: i, month: month.value, year: year.value, isCurrentMonth: true, isToday: today.getFullYear() === year.value && today.getMonth() === month.value && today.getDate() === i })
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) days.push({ date: i, month: month.value + 1, year: year.value, isCurrentMonth: false, isToday: false })
  return days
})

function getDateStr(day: typeof calendarDays.value[0]): string {
  const m = day.month < 0 ? 11 : day.month > 11 ? 0 : day.month
  const y = day.month < 0 ? day.year - 1 : day.month > 11 ? day.year + 1 : day.year
  return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(day.date).padStart(2, '0')
}

function getTasksForDay(day: typeof calendarDays.value[0]): Task[] {
  const dateStr = getDateStr(day)
  return taskStore.taskList.filter(t => t.dueDate === dateStr)
}

function priorityColor(p?: TaskPriority): string {
  switch(p) { case 'urgent': return '#F56C6C'; case 'high': return '#F56C6C'; case 'medium': return '#E6A23C'; case 'low': return '#67C23A'; default: return '#8b8b9e' }
}

function openDetail(task: Task) { detailTaskId.value = task.id; showDetail.value = true }
async function onDetailStatusChange(status: string) { await taskStore.updateTask(detailTaskId.value, { status: status as TaskStatus, progress: status === 'done' ? 100 : 0 }) }
async function updateField(field: string, value: any) { await taskStore.updateTask(detailTaskId.value, { [field]: value }) }
const drawerTask = computed(() => taskStore.getTaskByNodeId(detailTaskId.value))
</script>

<template>
  <div class="calendar-view">
    <div class="calendar-header">
      <div class="calendar-nav">
        <button class="cal-btn" @click="prevMonth">&lt;</button>
        <h2 class="calendar-title">{{ monthLabel }}</h2>
        <button class="cal-btn" @click="nextMonth">&gt;</button>
        <button class="cal-btn cal-btn--today" @click="goToday">Today</button>
      </div>
      <div class="calendar-view-modes">
        <button v-for="m in (['month','week','day'] as const)" :key="m" class="mode-btn" :class="{'mode-btn--active': viewMode === m}" @click="viewMode = m">{{ m }}</button>
      </div>
    </div>
    <div class="calendar-weekdays">
      <div v-for="d in weekDays" :key="d" class="weekday-label">{{ d }}</div>
    </div>
    <div class="calendar-grid">
      <div v-for="(day, idx) in calendarDays" :key="idx" class="calendar-cell" :class="{'cell--other': !day.isCurrentMonth, 'cell--today': day.isToday}">
        <div class="cell-date">{{ day.date }}</div>
        <div class="cell-tasks">
          <div v-for="task in getTasksForDay(day).slice(0, 3)" :key="task.id" class="cell-task" :style="{ borderLeftColor: priorityColor(task.priority) }" @click.stop="openDetail(task)">
            <span class="cell-task-title" :class="{'cell-task-title--done': task.status === 'done'}">{{ task.title }}</span>
          </div>
          <div v-if="getTasksForDay(day).length > 3" class="cell-more">+{{ getTasksForDay(day).length - 3 }} more</div>
        </div>
      </div>
    </div>
    <el-drawer v-model="showDetail" title="Task Details" direction="rtl" size="380px">
      <template v-if="drawerTask">
        <TaskDetailPanel :task="drawerTask" @status-change="onDetailStatusChange" @update="updateField" />
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.calendar-view { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--c-bg) }
.calendar-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid var(--c-border); flex-shrink: 0 }
.calendar-nav { display: flex; align-items: center; gap: 8px }
.cal-btn { background: var(--c-bg-3); border: 1px solid var(--c-border); color: var(--c-text-2); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 14px; transition: all 0.15s }
.cal-btn:hover { background: var(--c-surface-hover); color: var(--c-text) }
.cal-btn--today { font-weight: 600 }
.calendar-title { font-size: 20px; font-weight: 600; color: var(--c-text); margin: 0; min-width: 160px; text-align: center }
.calendar-view-modes { display: flex; gap: 4px }
.mode-btn { background: var(--c-bg-3); border: 1px solid var(--c-border); color: var(--c-text-2); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 13px; text-transform: capitalize }
.mode-btn--active { background: var(--c-primary); color: white; border-color: var(--c-primary) }
.calendar-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--c-border); flex-shrink: 0 }
.weekday-label { padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: var(--c-text-3); text-transform: uppercase }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: repeat(6, 1fr); flex: 1; overflow: hidden }
.calendar-cell { border-right: 1px solid var(--c-border); border-bottom: 1px solid var(--c-border); padding: 4px; min-height: 0; overflow: hidden }
.cell--other { opacity: 0.4 }
.cell--today { background: var(--c-primary-light) }
.cell-date { font-size: 12px; font-weight: 600; color: var(--c-text-2); margin-bottom: 2px }
.cell--today .cell-date { color: var(--c-primary) }
.cell-tasks { display: flex; flex-direction: column; gap: 2px }
.cell-task { padding: 2px 4px; border-radius: 3px; background: var(--c-bg-3); border-left: 3px solid #8b8b9e; cursor: pointer; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.cell-task:hover { background: var(--c-surface-hover) }
.cell-task-title { color: var(--c-text-2) }
.cell-task-title--done { text-decoration: line-through; opacity: 0.6 }
.cell-more { font-size: 10px; color: var(--c-text-3); padding: 1px 4px }
</style>

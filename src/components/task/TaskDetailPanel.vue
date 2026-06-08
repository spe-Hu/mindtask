<script setup lang="ts">
import { computed, ref, onBeforeUnmount, watch } from 'vue'
import type { Task, TaskPriority, TaskStatus, TaskComment, ActivityEntry } from '@/types/task'
import { useTaskStore } from '@/stores/task'
import { useLocaleStore } from '@/stores/locale'
import { formatDuration } from '@/utils/dateParser'
import MarkdownEditor from '@/components/MarkdownEditor.vue'

const props = defineProps<{ task: Task }>()
const emit = defineEmits<{
  (e: 'status-change', status: string): void
  (e: 'update', field: string, value: any): void
  (e: 'close'): void
}>()

const taskStore = useTaskStore()
const localeStore = useLocaleStore()

const activeTab = ref<'details'|'description'|'comments'|'activity'|'time'>('details')

const progressColor = computed(() => { const p = props.task.progress ?? 0; if (p >= 100) return '#67C23A'; if (p >= 50) return '#E6A23C'; return '#667eea' })

// Comments - use version counter to force reactivity on Map
const commentVersion = ref(0)
const newComment = ref('')
const taskComments = computed(() => {
  commentVersion.value
  return taskStore.getTaskComments(props.task.id)
})

async function addComment() {
  if (!newComment.value.trim()) return
  await taskStore.addComment(props.task.id, newComment.value.trim())
  newComment.value = ''
  commentVersion.value++
}

// Activity - use version counter
const activityVersion = ref(0)
const taskActivities = computed(() => {
  activityVersion.value
  return taskStore.getTaskActivities(props.task.id)
})

watch(() => props.task.updatedAt, () => {
  activityVersion.value++
})

// Time tracking
const isTimerRunning = computed(() => props.task.isPomodoroActive === true)
const taskTimeEntries = computed(() => taskStore.getTaskTimeEntries(props.task.id))
const totalTime = computed(() => formatDuration(props.task.totalTrackedTime || 0))

function toggleTimer() {
  if (isTimerRunning.value) taskStore.stopTimeEntry(props.task.id)
  else taskStore.startTimeEntry(props.task.id)
}

// Pomodoro with countdown
const pomodoroMinutes = ref(25)
const pomodoroRemainingSeconds = ref(0)
let pomodoroInterval: ReturnType<typeof setInterval> | null = null

function startPomodoro() {
  taskStore.startPomodoro(props.task.id, pomodoroMinutes.value)
  pomodoroRemainingSeconds.value = pomodoroMinutes.value * 60
  if (pomodoroInterval) clearInterval(pomodoroInterval)
  pomodoroInterval = setInterval(() => {
    if (pomodoroRemainingSeconds.value > 0) {
      pomodoroRemainingSeconds.value--
    } else {
      stopPomodoro()
    }
  }, 1000)
}

function stopPomodoro() {
  taskStore.stopPomodoro()
  pomodoroRemainingSeconds.value = 0
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval)
    pomodoroInterval = null
  }
}

onBeforeUnmount(() => {
  if (pomodoroInterval) clearInterval(pomodoroInterval)
})

const isPomodoroActive = computed(() => taskStore.pomodoroTaskId === props.task.id)
const pomodoroDisplay = computed(() => {
  if (!isPomodoroActive.value) return ''
  const mins = Math.floor(pomodoroRemainingSeconds.value / 60)
  const secs = pomodoroRemainingSeconds.value % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

// Subtasks
const newSubtaskTitle = ref('')
const childTasks = computed(() => props.task.children.map(id => taskStore.getTaskByNodeId(id)).filter(Boolean) as Task[])

async function addSubtask() {
  if (!newSubtaskTitle.value.trim()) return
  await taskStore.createTask({ title: newSubtaskTitle.value.trim(), parentId: props.task.id })
  newSubtaskTitle.value = ''
}

async function toggleChildDone(child: Task) {
  const newStatus: TaskStatus = child.status === 'done' ? 'todo' : 'done'
  await taskStore.updateTask(child.id, { status: newStatus, progress: newStatus === 'done' ? 100 : 0 })
}

async function deleteChild(child: Task) {
  await taskStore.deleteTask(child.id)
  emit('update', 'children', props.task.children.filter(id => id !== child.id))
}

// Tags
const newTag = ref('')
function addTag() {
  if (!newTag.value.trim()) return
  emit('update', 'tags', [...(props.task.tags || []), newTag.value.trim()])
  newTag.value = ''
}

function updateDescription(value: string) {
  emit('update', 'description', value)
}
</script>

<template>
  <div class="task-detail">
    <div class="task-detail__header">
      <el-input
        :model-value="task.title"
        @update:modelValue="(v: string) => emit('update', 'title', v)"
        size="default"
        class="title-input"
        :placeholder="localeStore.t('task.title')"
      />
    </div>

    <div class="task-detail__tabs">
      <button v-for="tb in (['details','description','comments','activity','time'] as const)" :key="tb" class="tab-btn" :class="{'tab-btn--active': activeTab === tb}" @click="activeTab = tb">
        {{ tb === 'details' ? localeStore.t('task.details') : tb === 'description' ? localeStore.t('task.description') : tb === 'comments' ? localeStore.t('task.comments') + ' (' + taskComments.length + ')' : tb === 'activity' ? localeStore.t('task.activity') : localeStore.t('task.timeTracking') + ' (' + totalTime + ')' }}
      </button>
    </div>

    <!-- Details Tab -->
    <div v-show="activeTab === 'details'" class="tab-content">
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.status') }}</span>
        <el-select :model-value="task.status" @update:modelValue="(v: string) => emit('status-change', v)" size="small" style="width:130px">
          <el-option :label="localeStore.t('status.todo')" value="todo" />
          <el-option :label="localeStore.t('status.doing')" value="doing" />
          <el-option :label="localeStore.t('status.done')" value="done" />
        </el-select>
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.priority') }}</span>
        <el-select :model-value="task.priority" @update:modelValue="(v: string) => emit('update', 'priority', v)" size="small" style="width:130px">
          <el-option :label="localeStore.t('priority.urgent')" value="urgent" />
          <el-option :label="localeStore.t('priority.high')" value="high" />
          <el-option :label="localeStore.t('priority.medium')" value="medium" />
          <el-option :label="localeStore.t('priority.low')" value="low" />
        </el-select>
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.dueDate') }}</span>
        <el-date-picker :model-value="task.dueDate" @update:modelValue="(v: string) => emit('update', 'dueDate', v)" type="date" size="small" value-format="YYYY-MM-DD" :placeholder="localeStore.t('common.pickDate')" style="width:150px" />
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.assignee') }}</span>
        <el-input :model-value="task.assignee" @update:modelValue="(v: string) => emit('update', 'assignee', v)" size="small" :placeholder="localeStore.t('task.assignee')" style="width:150px" />
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.progress') }}</span>
        <el-slider :model-value="task.progress" @update:modelValue="(v: number) => emit('update', 'progress', v)" :min="0" :max="100" :color="progressColor" style="flex:1;margin:0 8px" />
        <span class="progress-value">{{ task.progress ?? 0 }}%</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.tags') }}</span>
        <div class="tag-list">
          <el-tag v-for="tag in (task.tags || [])" :key="tag" size="small" closable @close="emit('update', 'tags', task.tags?.filter(tg => tg !== tag))" style="margin-right:3px">{{ tag }}</el-tag>
          <el-input v-model="newTag" size="small" :placeholder="'+ ' + localeStore.t('task.tags')" style="width:80px" @keyup.enter="addTag" />
        </div>
      </div>
      <div class="meta-row">
        <span class="meta-label">{{ localeStore.t('task.recurring') }}</span>
        <el-select :model-value="task.recurring?.type || 'none'" @update:modelValue="(v: string) => emit('update', 'recurring', v === 'none' ? undefined : { type: v, interval: 1 })" size="small" style="width:130px">
          <el-option :label="localeStore.t('common.none')" value="none" />
          <el-option :label="localeStore.t('task.daily')" value="daily" />
          <el-option :label="localeStore.t('task.weekly')" value="weekly" />
          <el-option :label="localeStore.t('task.monthly')" value="monthly" />
          <el-option :label="localeStore.t('task.yearly')" value="yearly" />
        </el-select>
      </div>

      <!-- Subtasks -->
      <div class="task-detail__section">
        <span class="meta-label">{{ localeStore.t('task.subtasks') }} ({{ childTasks.length }})</span>
        <div v-for="child in childTasks" :key="child.id" class="subtask-item">
          <el-checkbox :model-value="child.status === 'done'" @update:model-value="toggleChildDone(child)" />
          <span class="subtask-text" :class="{'subtask-text--done': child.status === 'done'}">{{ child.title }}</span>
          <el-button size="small" text type="danger" @click="deleteChild(child)">x</el-button>
        </div>
        <div class="subtask-add">
          <el-input v-model="newSubtaskTitle" size="small" :placeholder="localeStore.t('task.addSubtask')" @keyup.enter="addSubtask" />
          <el-button size="small" type="primary" @click="addSubtask" :disabled="!newSubtaskTitle.trim()">{{ localeStore.t('common.add') }}</el-button>
        </div>
      </div>

      <div class="task-detail__meta">
        <span class="meta-value">{{ localeStore.t('task.createdAt') }}: {{ new Date(task.createdAt).toLocaleString() }}</span>
        <span class="meta-value">{{ localeStore.t('task.updatedAt') }}: {{ new Date(task.updatedAt).toLocaleString() }}</span>
      </div>
    </div>

    <!-- Description Tab -->
    <div v-show="activeTab === 'description'" class="tab-content">
      <MarkdownEditor
        :model-value="task.description || ''"
        @update:modelValue="updateDescription"
      />
    </div>

    <!-- Comments Tab -->
    <div v-show="activeTab === 'comments'" class="tab-content">
      <div class="comments-list">
        <div v-for="comment in taskComments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <span class="comment-author">{{ comment.author }}</span>
            <span class="comment-time">{{ new Date(comment.createdAt).toLocaleString() }}</span>
            <el-button size="small" text @click="taskStore.deleteComment(comment.id, task.id); commentVersion++">x</el-button>
          </div>
          <div class="comment-body">{{ comment.content }}</div>
        </div>
        <div v-if="taskComments.length === 0" class="empty-state">{{ localeStore.t('task.noComments') }}</div>
      </div>
      <div class="comment-input">
        <el-input v-model="newComment" type="textarea" :rows="2" :placeholder="localeStore.t('task.addComment') + ' (Ctrl+Enter)'" @keyup.ctrl.enter="addComment" />
        <el-button type="primary" size="small" @click="addComment" :disabled="!newComment.trim()">{{ localeStore.t('task.addComment') }}</el-button>
      </div>
    </div>

    <!-- Activity Tab -->
    <div v-show="activeTab === 'activity'" class="tab-content">
      <div class="activity-list">
        <div v-for="activity in taskActivities" :key="activity.id" class="activity-item">
          <span class="activity-dot" :class="'activity-dot--' + activity.type"></span>
          <div class="activity-content">
            <div class="activity-desc">{{ activity.description }}</div>
            <div class="activity-time">{{ new Date(activity.createdAt).toLocaleString() }}</div>
          </div>
        </div>
        <div v-if="taskActivities.length === 0" class="empty-state">{{ localeStore.t('task.noActivity') }}</div>
      </div>
    </div>

    <!-- Time Tracking Tab -->
    <div v-show="activeTab === 'time'" class="tab-content">
      <div class="time-controls">
        <div class="time-total">{{ localeStore.t('task.totalTracked') }}: <strong>{{ totalTime }}</strong></div>
        <div class="time-buttons">
          <el-button :type="isTimerRunning ? 'danger' : 'primary'" size="small" @click="toggleTimer">{{ isTimerRunning ? localeStore.t('task.stopTimer') : localeStore.t('task.startTimer') }}</el-button>
          <el-button v-if="!isPomodoroActive" size="small" @click="startPomodoro">{{ localeStore.t('task.pomodoro') }} ({{ pomodoroMinutes }}m)</el-button>
          <el-button v-else size="small" type="warning" @click="stopPomodoro">{{ localeStore.t('task.stopPomodoro') }}</el-button>
          <span v-if="isPomodoroActive" class="pomodoro-display">{{ pomodoroDisplay }}</span>
        </div>
        <div class="time-presets">
          <el-button v-for="m in [15,25,45,60]" :key="m" size="small" text @click="pomodoroMinutes = m" :type="pomodoroMinutes === m ? 'primary' : 'info'">{{ m }}m</el-button>
        </div>
      </div>
      <div class="time-entries">
        <div v-for="entry in taskTimeEntries" :key="entry.id" class="time-entry-item">
          <span>{{ formatDuration(entry.duration || 0) }}</span>
          <span class="time-entry-date">{{ new Date(entry.startTime).toLocaleString() }}</span>
        </div>
        <div v-if="taskTimeEntries.length === 0" class="empty-state">{{ localeStore.t('task.noTimeEntries') }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-detail { padding: 0; font-size: 13px }
.task-detail__header { margin-bottom: 12px }
.task-detail__tabs { display: flex; gap: 2px; margin-bottom: 12px; border-bottom: 1px solid var(--c-border); padding-bottom: 6px; flex-wrap: wrap }
.tab-btn { background: none; border: none; color: var(--c-text-3); font-size: 12px; padding: 5px 10px; cursor: pointer; border-radius: 4px; font-weight: 500; transition: all 0.15s }
.tab-btn:hover { background: var(--c-surface-hover); color: var(--c-text) }
.tab-btn--active { background: var(--c-primary-light); color: var(--c-primary); font-weight: 600 }
.tab-content { min-height: 120px; font-size: 13px }
.meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px }
.meta-label { font-size: 12px; color: var(--c-text-3); min-width: 60px; font-weight: 500; flex-shrink: 0 }
.meta-value { font-size: 12px; color: var(--c-text-2) }
.progress-value { font-size: 12px; color: var(--c-text-2); min-width: 32px; text-align: right }
.tag-list { display: flex; align-items: center; flex-wrap: wrap; gap: 3px }
.task-detail__section { margin: 12px 0 }
.subtask-item { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-radius: 4px; transition: background 0.15s }
.subtask-item:hover { background: var(--c-surface-hover) }
.subtask-text { flex: 1; font-size: 13px; color: var(--c-text) }
.subtask-text--done { text-decoration: line-through; color: var(--c-text-3) }
.subtask-add { display: flex; gap: 6px; margin-top: 6px }
.task-detail__meta { display: flex; flex-direction: column; gap: 2px; padding-top: 12px; border-top: 1px solid var(--c-border); margin-top: 12px }
.comments-list { max-height: 240px; overflow-y: auto; margin-bottom: 10px }
.comment-item { padding: 6px; border-radius: 4px; background: var(--c-bg-3); margin-bottom: 6px }
.comment-header { display: flex; align-items: center; gap: 6px; margin-bottom: 3px }
.comment-author { font-size: 11px; font-weight: 600; color: var(--c-primary) }
.comment-time { font-size: 10px; color: var(--c-text-3) }
.comment-body { font-size: 13px; color: var(--c-text); line-height: 1.4 }
.comment-input { display: flex; flex-direction: column; gap: 6px }
.activity-list { max-height: 300px; overflow-y: auto }
.activity-item { display: flex; align-items: flex-start; gap: 6px; padding: 4px 0 }
.activity-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 4px; background: var(--c-text-3); flex-shrink: 0 }
.activity-dot--created { background: var(--c-success) }
.activity-dot--status_change { background: var(--c-warning) }
.activity-dot--deleted { background: var(--c-danger) }
.activity-desc { font-size: 12px; color: var(--c-text); line-height: 1.3 }
.activity-time { font-size: 10px; color: var(--c-text-3) }
.time-controls { margin-bottom: 12px }
.time-total { font-size: 13px; color: var(--c-text); margin-bottom: 6px }
.time-buttons { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; align-items: center }
.time-presets { display: flex; gap: 3px }
.pomodoro-display { font-size: 13px; color: var(--c-warning); font-weight: 600; font-family: var(--mono, monospace) }
.time-entries { max-height: 240px; overflow-y: auto }
.time-entry-item { display: flex; justify-content: space-between; padding: 4px 6px; border-radius: 3px; font-size: 12px; color: var(--c-text-2); background: var(--c-bg-3); margin-bottom: 3px }
.time-entry-date { font-size: 10px; color: var(--c-text-3) }
.empty-state { text-align: center; padding: 16px; color: var(--c-text-3); font-size: 13px }
</style>

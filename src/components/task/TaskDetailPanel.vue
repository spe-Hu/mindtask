<script setup lang="ts">
/**
 * 任务详情面板
 * 展示和编辑单个任务的完整信息，含子任务管理
 */
import { computed, ref } from 'vue'
import type { Task, TaskPriority, TaskStatus } from '@/types/task'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  (e: 'status-change', status: string): void
  (e: 'update', field: string, value: any): void
}>()

const statusMap: Record<TaskStatus, { label: string; type: string }> = {
  todo: { label: '未开始', type: 'info' },
  doing: { label: '进行中', type: 'warning' },
  done: { label: '已完成', type: 'success' },
}

const priorityMap: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: '高', color: '#F56C6C' },
  medium: { label: '中', color: '#E6A23C' },
  low: { label: '低', color: '#67C23A' },
}

const progressColor = computed(() => {
  if ((props.task.progress ?? 0) >= 100) return '#67C23A'
  if ((props.task.progress ?? 0) >= 50) return '#E6A23C'
  return '#667eea'
})

/** 新子任务输入 */
const newSubtaskTitle = ref('')

/** 添加子任务 */
function addSubtask() {
  if (!newSubtaskTitle.value.trim()) return
  const children = [...(props.task.children || []), newSubtaskTitle.value.trim()]
  emit('update', 'children', children)
  newSubtaskTitle.value = ''
}

/** 删除子任务 */
function removeSubtask(index: number) {
  const children = [...(props.task.children || [])]
  children.splice(index, 1)
  emit('update', 'children', children)
}

/** 编辑子任务 */
const editingSubtaskIndex = ref<number | null>(null)
const editingSubtaskValue = ref('')

function startEditSubtask(index: number) {
  editingSubtaskIndex.value = index
  editingSubtaskValue.value = props.task.children?.[index] || ''
}

function saveEditSubtask() {
  if (editingSubtaskIndex.value === null) return
  const val = editingSubtaskValue.value.trim()
  if (!val) { editingSubtaskIndex.value = null; return }
  const children = [...(props.task.children || [])]
  children[editingSubtaskIndex.value] = val
  emit('update', 'children', children)
  editingSubtaskIndex.value = null
}

/** 编辑标签 */
const editingTagIndex = ref<number | null>(null)
const editingTagValue = ref('')

function startEditTag(index: number) {
  editingTagIndex.value = index
  editingTagValue.value = props.task.tags?.[index] || ''
}

function saveEditTag() {
  if (editingTagIndex.value === null) return
  const val = editingTagValue.value.trim()
  if (!val) { editingTagIndex.value = null; return }
  const tags = [...(props.task.tags || [])]
  tags[editingTagIndex.value] = val
  emit('update', 'tags', tags)
  editingTagIndex.value = null
}
</script>

<template>
  <div class="task-detail">
    <div class="task-detail__title">
      <el-input
        :model-value="task.title"
        @update:modelValue="(val: string) => emit('update', 'title', val)"
        size="large"
        class="title-input"
      />
    </div>

    <div class="task-detail__meta">
      <div class="meta-row">
        <span class="meta-label">状态</span>
        <el-select
          :model-value="task.status"
          @update:modelValue="(val: string) => emit('status-change', val)"
          size="small"
          style="width: 120px"
        >
          <el-option label="未开始" value="todo" />
          <el-option label="进行中" value="doing" />
          <el-option label="已完成" value="done" />
        </el-select>
      </div>

      <div class="meta-row">
        <span class="meta-label">优先级</span>
        <el-select
          :model-value="task.priority"
          @update:modelValue="(val: string) => emit('update', 'priority', val)"
          size="small"
          style="width: 120px"
        >
          <el-option label="高" value="high" />
          <el-option label="中" value="medium" />
          <el-option label="低" value="low" />
        </el-select>
      </div>

      <div class="meta-row">
        <span class="meta-label">截止日期</span>
        <el-date-picker
          :model-value="task.dueDate"
          @update:modelValue="(val: string) => emit('update', 'dueDate', val)"
          type="date"
          size="small"
          value-format="YYYY-MM-DD"
          placeholder="选择日期"
          style="width: 160px"
        />
      </div>

      <div class="meta-row">
        <span class="meta-label">负责人</span>
        <el-input
          :model-value="task.assignee"
          @update:modelValue="(val: string) => emit('update', 'assignee', val)"
          size="small"
          placeholder="负责人"
          style="width: 160px"
        />
      </div>

      <div class="meta-row">
        <span class="meta-label">进度</span>
        <el-slider
          :model-value="task.progress"
          @update:modelValue="(val: number) => emit('update', 'progress', val)"
          :min="0"
          :max="100"
          :color="progressColor"
          style="flex: 1; margin: 0 12px"
        />
        <span class="progress-value">{{ task.progress }}%</span>
      </div>

      <div class="meta-row">
        <span class="meta-label">标签</span>
        <div class="tag-list">
          <template v-for="(tag, idx) in task.tags" :key="idx">
            <el-input
              v-if="editingTagIndex === idx"
              v-model="editingTagValue"
              size="small"
              style="width: 80px; margin-right: 4px"
              @keyup.enter="saveEditTag"
              @blur="saveEditTag"
              ref="tagInputRef"
            />
            <el-tag
              v-else
              size="small"
              closable
              @click="startEditTag(idx)"
              @close="emit('update', 'tags', task.tags?.filter((_, i) => i !== idx))"
              style="margin-right: 4px; cursor: pointer"
            >
              {{ tag }}
            </el-tag>
          </template>
          <el-button
            size="small"
            text
            @click="emit('update', 'tags', [...(task.tags || []), '新标签'])"
          >
            + 添加
          </el-button>
        </div>
      </div>
    </div>

    <div class="task-detail__description">
      <span class="meta-label">描述</span>
      <el-input
        :model-value="task.description"
        @update:modelValue="(val: string) => emit('update', 'description', val)"
        type="textarea"
        :rows="3"
        placeholder="添加描述..."
      />
    </div>

    <!-- 子任务区域 -->
    <div class="task-detail__subtasks">
      <span class="meta-label">子任务</span>
      <div v-if="task.children && task.children.length > 0" class="subtask-list">
        <div v-for="(child, index) in task.children" :key="index" class="subtask-item">
          <el-input
            v-if="editingSubtaskIndex === index"
            v-model="editingSubtaskValue"
            size="small"
            style="flex: 1"
            @keyup.enter="saveEditSubtask"
            @blur="saveEditSubtask"
          />
          <span v-else class="subtask-text" @dblclick="startEditSubtask(index)" style="cursor: pointer">{{ child }}</span>
          <el-button size="small" text type="danger" @click="removeSubtask(index)">删除</el-button>
        </div>
      </div>
      <div v-else class="subtask-empty">暂无子任务</div>
      <div class="subtask-add">
        <el-input
          v-model="newSubtaskTitle"
          size="small"
          placeholder="添加子任务..."
          @keyup.enter="addSubtask"
        />
        <el-button size="small" type="primary" @click="addSubtask" :disabled="!newSubtaskTitle.trim()">
          添加
        </el-button>
      </div>
    </div>

    <div class="task-detail__footer">
      <span class="meta-label">创建</span>
      <span class="meta-value">{{ new Date(task.createdAt).toLocaleString() }}</span>
      <span class="meta-label" style="margin-left: 16px">更新</span>
      <span class="meta-value">{{ new Date(task.updatedAt).toLocaleString() }}</span>
    </div>
  </div>
</template>

<style scoped>
.task-detail {
  padding: 0 4px;
}

.task-detail__title {
  margin-bottom: 20px;
}

.title-input :deep(.el-input__wrapper) {
  background: transparent;
  box-shadow: none;
  font-size: 18px;
  font-weight: 600;
  padding: 0;
}

.task-detail__meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.meta-label {
  font-size: 13px;
  color: #8b8b9e;
  min-width: 56px;
  flex-shrink: 0;
}

.meta-value {
  font-size: 13px;
  color: #b0b0c8;
}

.progress-value {
  font-size: 13px;
  color: #667eea;
  min-width: 36px;
  text-align: right;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.task-detail__description {
  margin-bottom: 20px;
}

.task-detail__description .meta-label {
  display: block;
  margin-bottom: 8px;
}

/* 子任务 */
.task-detail__subtasks {
  margin-bottom: 20px;
}

.task-detail__subtasks .meta-label {
  display: block;
  margin-bottom: 8px;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.subtask-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
}

.subtask-text {
  font-size: 14px;
  color: #e0e0f0;
}

.subtask-empty {
  font-size: 13px;
  color: #5a5a78;
  margin-bottom: 8px;
}

.subtask-add {
  display: flex;
  gap: 8px;
}

.task-detail__footer {
  padding-top: 16px;
  border-top: 1px solid #2d2d44;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}
</style>

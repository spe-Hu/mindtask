/**
 * 任务状态管理
 * 管理所有任务数据，提供增删改查、筛选、排序功能
 * 与 mindmap store 协作实现双向同步
 */
import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type { Task, TaskPriority, TaskStatus, TaskFilterType, TaskSortBy } from '@/types/task'
import { dbPut, dbDelete, dbGetAll, STORE_TASKS } from '@/utils/db'

/** 生成唯一 ID */
function genId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

/** 同步回调类型：任务更新时通知思维导图 */
type SyncCallback = (task: Task) => void

export const useTaskStore = defineStore('task', () => {
  // ===== 状态 =====
  const tasks = ref<Map<string, Task>>(new Map())
  const isLoaded = ref(false)

  // ===== 筛选/排序状态 =====
  const currentFilter = ref<TaskFilterType>('all')
  const currentSort = ref<TaskSortBy>('createdAt')
  const searchQuery = ref('')
  const filterTags = ref<string[]>([])

  // ===== 双向同步回调 =====
  let _syncToMindmapCallback: SyncCallback | null = null

  /** 注册同步回调（由 MindMapView 在初始化时调用） */
  function registerSyncCallback(cb: SyncCallback) {
    _syncToMindmapCallback = cb
  }

  // ===== 计算属性 =====

  /** 所有任务列表 */
  const taskList = computed(() => Array.from(tasks.value.values()))

  /** 今日到期任务 */
  const todayTasks = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return taskList.value.filter(t => {
      if (!t.dueDate || t.status === 'done') return false
      const d = new Date(t.dueDate)
      return d >= today && d < tomorrow
    })
  })

  /** 本周到期任务 */
  const weekTasks = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekEnd = new Date(today)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return taskList.value.filter(t => {
      if (!t.dueDate || t.status === 'done') return false
      const d = new Date(t.dueDate)
      return d >= today && d < weekEnd
    })
  })

  /** 已完成任务 */
  const completedTasks = computed(() =>
    taskList.value.filter(t => t.status === 'done')
  )

  /** 未完成任务 */
  const pendingTasks = computed(() =>
    taskList.value.filter(t => t.status !== 'done')
  )

  /** 接下来要做（未完成、有截止日期、按日期排序） */
  const upcomingTasks = computed(() =>
    pendingTasks.value
      .filter(t => t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
  )

  /** 根据当前筛选条件过滤后的任务列表 */
  const filteredTasks = computed(() => {
    let result: Task[]

    switch (currentFilter.value) {
      case 'today': result = todayTasks.value; break
      case 'week': result = weekTasks.value; break
      case 'completed': result = completedTasks.value; break
      case 'upcoming': result = upcomingTasks.value; break
      default: result = taskList.value
    }

    // 搜索过滤
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }

    // 标签过滤
    if (filterTags.value.length > 0) {
      result = result.filter(t =>
        filterTags.value.some(tag => t.tags?.includes(tag))
      )
    }

    // 排序
    result = [...result].sort((a, b) => {
      switch (currentSort.value) {
        case 'dueDate':
          return (a.dueDate || '').localeCompare(b.dueDate || '')
        case 'priority': {
          const order: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }
          return (order[a.priority || 'medium'] ?? 1) - (order[b.priority || 'medium'] ?? 1)
        }
        case 'status': {
          const order: Record<TaskStatus, number> = { todo: 0, doing: 1, done: 2 }
          return order[a.status] - order[b.status]
        }
        case 'createdAt':
        default:
          return b.createdAt - a.createdAt
      }
    })

    return result
  })

  /** 所有使用过的标签（去重） */
  const allTags = computed(() => {
    const tagSet = new Set<string>()
    taskList.value.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet)
  })

  // ===== 操作 =====

  /** 从 IndexedDB 加载所有任务 */
  async function loadFromDB() {
    if (isLoaded.value) return
    const list = await dbGetAll<Task>(STORE_TASKS)
    const newMap = new Map<string, Task>()
    list.forEach(t => newMap.set(t.id, t))
    tasks.value = newMap
    isLoaded.value = true
  }

  /** 创建任务（从思维导图节点转换时调用） */
  async function createTask(data: {
    id: string  // 使用思维导图节点 ID 作为任务 ID
    title: string
    description?: string
    dueDate?: string | null
    priority?: TaskPriority
    tags?: string[]
    assignee?: string
    parentId?: string | null
    children?: string[]
  }): Promise<Task> {
    const task: Task = {
      id: data.id,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate ?? null,
      priority: data.priority || 'medium',
      tags: data.tags || [],
      status: 'todo',
      assignee: data.assignee,
      progress: 0,
      children: data.children || [],
      parentId: data.parentId ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    tasks.value.set(task.id, task)
    triggerRef(tasks)
    await dbPut(STORE_TASKS, task as unknown as Record<string, unknown>)
    return task
  }

  /** 更新任务属性，并同步到思维导图 */
  async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    const task = tasks.value.get(id)
    if (!task) return
    const updated = { ...task, ...updates, updatedAt: Date.now() }
    tasks.value.set(id, updated)
    triggerRef(tasks)
    await dbPut(STORE_TASKS, updated as unknown as Record<string, unknown>)

    // 如果有父任务，自动计算父任务进度
    if (updated.parentId) {
      await recalcParentProgress(updated.parentId)
    }

    // 双向同步：通知思维导图更新节点
    if (_syncToMindmapCallback) {
      _syncToMindmapCallback(updated)
    }
  }

  /** 删除任务 */
  async function deleteTask(id: string) {
    const task = tasks.value.get(id)
    if (!task) return

    // 同时删除所有子任务
    if (task.children?.length) {
      for (const childId of task.children) {
        await deleteTask(childId)
      }
    }

    tasks.value.delete(id)
    triggerRef(tasks)
    await dbDelete(STORE_TASKS, id)

    // 从父任务的 children 列表中移除
    if (task.parentId) {
      const parent = tasks.value.get(task.parentId)
      if (parent?.children) {
        parent.children = parent.children.filter(cid => cid !== id)
        await dbPut(STORE_TASKS, parent as unknown as Record<string, unknown>)
        await recalcParentProgress(parent.id)
      }
    }
  }

  /** 将任务节点转回普通节点（删除任务数据） */
  async function revertToNode(id: string) {
    await deleteTask(id)
  }

  /** 重新计算父任务进度（基于子任务完成比例） */
  async function recalcParentProgress(parentId: string) {
    const parent = tasks.value.get(parentId)
    if (!parent?.children?.length) return

    const childTasks = parent.children
      .map(cid => tasks.value.get(cid))
      .filter(Boolean) as Task[]

    if (childTasks.length === 0) return

    const doneCount = childTasks.filter(c => c.status === 'done').length
    const progress = Math.round((doneCount / childTasks.length) * 100)

    const updated = { ...parent, progress, updatedAt: Date.now() }
    tasks.value.set(parentId, updated)
    triggerRef(tasks)
    await dbPut(STORE_TASKS, updated as unknown as Record<string, unknown>)

    // 同步更新后的父任务到导图
    if (_syncToMindmapCallback) {
      _syncToMindmapCallback(updated)
    }
  }

  /** 根据节点 ID 查找任务 */
  function getTaskByNodeId(nodeId: string): Task | undefined {
    return tasks.value.get(nodeId)
  }

  /** 同步节点标题变更到任务（从思维导图 → 任务列表） */
  async function syncTitleFromNode(nodeId: string, newTitle: string) {
    const task = tasks.value.get(nodeId)
    if (task && task.title !== newTitle) {
      // 直接更新，不触发同步回调（避免循环）
      const updated = { ...task, title: newTitle, updatedAt: Date.now() }
      tasks.value.set(nodeId, updated)
      triggerRef(tasks)
      await dbPut(STORE_TASKS, updated as unknown as Record<string, unknown>)
    }
  }

  /** 获取某个任务的统计信息 */
  function getTaskStats() {
    const total = taskList.value.length
    const done = completedTasks.value.length
    const doing = taskList.value.filter(t => t.status === 'doing').length
    const todo = taskList.value.filter(t => t.status === 'todo').length
    return { total, done, doing, todo }
  }

  return {
    tasks,
    isLoaded,
    currentFilter,
    currentSort,
    searchQuery,
    filterTags,
    taskList,
    todayTasks,
    weekTasks,
    completedTasks,
    pendingTasks,
    upcomingTasks,
    filteredTasks,
    allTags,
    loadFromDB,
    createTask,
    updateTask,
    deleteTask,
    revertToNode,
    getTaskByNodeId,
    syncTitleFromNode,
    registerSyncCallback,
    getTaskStats,
  }
})

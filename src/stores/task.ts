/**
 * 任务状态管理
 * 管理所有任务数据，提供增删改查、筛选、排序功能
 * 按项目隔离数据
 */
import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type { Task, TaskPriority, TaskStatus, TaskFilterType, TaskSortBy } from '@/types/task'
import { dbPut, dbDelete, dbGetAll, STORE_TASKS } from '@/utils/db'

type SyncCallback = (task: Task) => void

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Map<string, Task>>(new Map())
  const isLoaded = ref(false)
  const currentProjectId = ref('')

  const currentFilter = ref<TaskFilterType>('all')
  const currentSort = ref<TaskSortBy>('createdAt')
  const searchQuery = ref('')
  const filterTags = ref<string[]>([])

  let _syncToMindmapCallback: SyncCallback | null = null

  function registerSyncCallback(cb: SyncCallback) {
    _syncToMindmapCallback = cb
  }

  /** 当前项目的任务列表 */
  const taskList = computed(() =>
    Array.from(tasks.value.values()).filter(t => t.projectId === currentProjectId.value)
  )

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

  const completedTasks = computed(() =>
    taskList.value.filter(t => t.status === 'done')
  )

  const pendingTasks = computed(() =>
    taskList.value.filter(t => t.status !== 'done')
  )

  const upcomingTasks = computed(() =>
    pendingTasks.value
      .filter(t => t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
  )

  const filteredTasks = computed(() => {
    let result: Task[]
    switch (currentFilter.value) {
      case 'today': result = todayTasks.value; break
      case 'week': result = weekTasks.value; break
      case 'completed': result = completedTasks.value; break
      case 'upcoming': result = upcomingTasks.value; break
      default: result = taskList.value
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      )
    }
    if (filterTags.value.length > 0) {
      result = result.filter(t =>
        filterTags.value.some(tag => t.tags?.includes(tag))
      )
    }
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

  const allTags = computed(() => {
    const tagSet = new Set<string>()
    taskList.value.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet)
  })

  /** 切换到指定项目 */
  async function switchProject(projectId: string) {
    currentProjectId.value = projectId
    isLoaded.value = false
    tasks.value = new Map()
    await loadFromDB()
  }

  /** 从 IndexedDB 加载所有任务（全局，通过 projectId 过滤） */
  async function loadFromDB() {
    if (isLoaded.value) return
    const list = await dbGetAll<Task>(STORE_TASKS)
    const newMap = new Map<string, Task>()
    list.forEach(t => newMap.set(t.id, t))
    tasks.value = newMap
    isLoaded.value = true
  }

  async function createTask(data: {
    id: string
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
      projectId: currentProjectId.value,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    tasks.value.set(task.id, task)
    triggerRef(tasks)
    await dbPut(STORE_TASKS, task as unknown as Record<string, unknown>)
    return task
  }

  async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) {
    const task = tasks.value.get(id)
    if (!task) return
    const updated = { ...task, ...updates, updatedAt: Date.now() }
    tasks.value.set(id, updated)
    triggerRef(tasks)
    await dbPut(STORE_TASKS, updated as unknown as Record<string, unknown>)
    if (updated.parentId) {
      await recalcParentProgress(updated.parentId)
    }
    if (_syncToMindmapCallback) {
      _syncToMindmapCallback(updated)
    }
  }

  async function deleteTask(id: string) {
    const task = tasks.value.get(id)
    if (!task) return
    if (task.children?.length) {
      for (const childId of task.children) {
        await deleteTask(childId)
      }
    }
    tasks.value.delete(id)
    triggerRef(tasks)
    await dbDelete(STORE_TASKS, id)
    if (task.parentId) {
      const parent = tasks.value.get(task.parentId)
      if (parent?.children) {
        parent.children = parent.children.filter(cid => cid !== id)
        await dbPut(STORE_TASKS, parent as unknown as Record<string, unknown>)
        await recalcParentProgress(parent.id)
      }
    }
  }

  async function revertToNode(id: string) {
    await deleteTask(id)
  }

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
    if (_syncToMindmapCallback) {
      _syncToMindmapCallback(updated)
    }
  }

  function getTaskByNodeId(nodeId: string): Task | undefined {
    return tasks.value.get(nodeId)
  }

  async function syncTitleFromNode(nodeId: string, newTitle: string) {
    const task = tasks.value.get(nodeId)
    if (task && task.title !== newTitle) {
      const updated = { ...task, title: newTitle, updatedAt: Date.now() }
      tasks.value.set(nodeId, updated)
      triggerRef(tasks)
      await dbPut(STORE_TASKS, updated as unknown as Record<string, unknown>)
    }
  }


  /** 获取所有任务（跨项目，用于全局搜索） */
  function getAllTasks(): Task[] {
    return Array.from(tasks.value.values())
  }

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
    currentProjectId,
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
    switchProject,
    loadFromDB,
    createTask,
    updateTask,
    deleteTask,
    revertToNode,
    getTaskByNodeId,
    syncTitleFromNode,
    registerSyncCallback,
    getAllTasks,
    getTaskStats,
  }
})

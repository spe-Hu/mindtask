/**
 * 任务系统类型定义
 */

export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskFilterType = 'all' | 'today' | 'upcoming' | 'week' | 'completed'
export type TaskSortBy = 'createdAt' | 'dueDate' | 'priority' | 'status'

export interface Task {
  id: string
  title: string
  description?: string
  dueDate?: string | null
  priority?: TaskPriority
  tags?: string[]
  status: TaskStatus
  assignee?: string
  progress?: number
  children?: string[]
  parentId?: string | null
  projectId?: string
  createdAt: number
  updatedAt: number
}

export interface TaskMetadata {
  isTask: boolean
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  assignee?: string
  progress?: number
  tags?: string[]
}

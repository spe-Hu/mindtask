/**
 * Task system types - full task management features
 * 4-level priority, subtasks, comments, time tracking, recurring, dependencies, sections
 */

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskFilterType = 'all' | 'today' | 'upcoming' | 'week' | 'completed'
export type TaskSortBy = 'createdAt' | 'dueDate' | 'priority' | 'status' | 'order'
export type RecurringType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type CalendarViewType = 'month' | 'week' | 'day'

export interface TaskComment {
  id: string
  taskId: string
  content: string
  author: string
  createdAt: number
  updatedAt: number
}

export interface ActivityEntry {
  id: string
  taskId: string
  type: 'created' | 'status_change' | 'priority_change' | 'title_change' | 'due_date_change' | 'assignee_change' | 'comment' | 'subtask_added' | 'subtask_completed' | 'deleted' | 'tag_change'
  oldValue?: string
  newValue?: string
  description: string
  createdAt: number
}

export interface TimeEntry {
  id: string
  taskId: string
  startTime: number
  endTime?: number
  duration?: number
  note?: string
}

export interface RecurringConfig {
  type: RecurringType
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  endDate?: string
}

export interface TaskSection {
  id: string
  projectId: string
  name: string
  order: number
  createdAt: number
}

export interface Task {
  id: string
  title: string
  description?: string
  dueDate?: string | null
  priority: TaskPriority
  tags?: string[]
  status: TaskStatus
  assignee?: string
  progress?: number
  children: string[]
  parentId?: string | null
  projectId?: string
  sectionId?: string
  order: number
  recurring?: RecurringConfig
  timeEntries?: TimeEntry[]
  totalTrackedTime?: number
  dependencies?: string[]
  isPomodoroActive?: boolean
  createdAt: number
  updatedAt: number
}

export interface BoardColumn {
  id: string
  projectId: string
  status: TaskStatus | 'custom'
  label: string
  color: string
  order: number
  wipLimit?: number
}

export interface TagConfig {
  name: string
  color: string
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

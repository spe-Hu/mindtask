/**
 * 任务系统类型定义
 * @description 定义任务相关数据结构和枚举
 */

/** 任务优先级 */
export type TaskPriority = "high" | "medium" | "low";

/** 任务状态 */
export type TaskStatus = "todo" | "doing" | "done";

/** 单个任务的数据结构 */
export interface Task {
  /** 任务唯一ID，对应思维导图节点ID */
  id: string;
  /** 任务标题 */
  title: string;
  /** 可选：详细描述 */
  description?: string;
  /** 截止日期 */
  dueDate?: string | null;
  /** 优先级 */
  priority?: TaskPriority;
  /** 标签列表 */
  tags?: string[];
  /** 当前状态 */
  status: TaskStatus;
  /** 负责人 */
  assignee?: string;
  /** 进度百分比 0-100 */
  progress?: number;
  /** 子任务ID列表 */
  children?: string[];
  /** 父任务ID */
  parentId?: string | null;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** 任务筛选条件 */
export type TaskFilterType = "all" | "today" | "upcoming" | "week" | "completed";

/** 任务排序方式 */
export type TaskSortBy = "dueDate" | "priority" | "createdAt" | "status";

/** 任务筛选和排序参数 */
export interface TaskFilterOptions {
  filter: TaskFilterType;
  sortBy: TaskSortBy;
  searchQuery: string;
  tags: string[];
}

/** 思维导图节点与任务的关联结构 */
export interface NodeTaskMapping {
  /** 思维导图节点ID */
  nodeId: string;
  /** 对应任务ID */
  taskId: string;
  /** 是否是任务节点 */
  isTask: boolean;
}

/** 思源思维导图节点的任务数据扩展 */
export interface TaskMetadata {
  /** 标识是否为任务节点 */
  isTask: boolean;
  /** 任务状态 */
  status?: TaskStatus;
  /** 优先级 */
  priority?: TaskPriority;
  /** 截止日期 */
  dueDate?: string;
  /** 负责人 */
  assignee?: string;
  /** 进度 */
  progress?: number;
  /** 标签 */
  tags?: string[];
}

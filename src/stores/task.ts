/**
 * Task store - full featured task management
 * Supports: CRUD, subtasks, undo/redo, activity log, time tracking,
 * batch ops, sections, ordering, comments, recurring, dependencies, pomodoro
 */
import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type { Task, TaskPriority, TaskStatus, TaskFilterType, TaskSortBy, TaskComment, ActivityEntry, TimeEntry, RecurringConfig, TaskSection, BoardColumn, TagConfig } from '@/types/task'
import { dbPut, dbDelete, dbGetAll, STORE_TASKS, STORE_COMMENTS, STORE_ACTIVITIES, STORE_TIME_ENTRIES, STORE_SECTIONS, STORE_BOARD_COLUMNS, STORE_TAGS } from '@/utils/db'

type SyncCallback = (task: Task) => void

interface UndoEntry {
  type: 'update' | 'delete' | 'create'
  taskId: string
  previousState?: Task
  description: string
}

function genId(): string {
  return 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

export const useTaskStore = defineStore('task', () => {
  const tasks = ref<Map<string, Task>>(new Map())
  const isLoaded = ref(false)
  const currentProjectId = ref('')
  const currentFilter = ref<TaskFilterType>('all')
  const currentSort = ref<TaskSortBy>('createdAt')
  const searchQuery = ref('')
  const filterTags = ref<string[]>([])
  const selectedTaskIds = ref<Set<string>>(new Set())
  const undoStack = ref<UndoEntry[]>([])
  const redoStack = ref<UndoEntry[]>([])
  const MAX_UNDO = 50
  const comments = ref<Map<string, TaskComment[]>>(new Map())
  const activities = ref<Map<string, ActivityEntry[]>>(new Map())
  const timeEntries = ref<TimeEntry[]>([])
  const sections = ref<TaskSection[]>([])
  const boardColumns = ref<BoardColumn[]>([])
  const tagConfigs = ref<TagConfig[]>([])
  const pomodoroTaskId = ref<string | null>(null)
  const pomodoroStartTime = ref<number | null>(null)
  const pomodoroRemaining = ref<number>(0)

  let _syncToMindmapCallback: SyncCallback | null = null
  function registerSyncCallback(cb: SyncCallback) { _syncToMindmapCallback = cb }

  function pushUndo(entry: UndoEntry) {
    undoStack.value.push(entry)
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
    redoStack.value = []
  }

  async function undo() {
    const entry = undoStack.value.pop()
    if (!entry) return
    if (entry.type === 'update' && entry.previousState) {
      const current = tasks.value.get(entry.taskId)
      if (current) {
        redoStack.value.push({ type: 'update', taskId: entry.taskId, previousState: { ...current }, description: entry.description })
        tasks.value.set(entry.taskId, { ...entry.previousState })
        triggerRef(tasks)
        await dbPut(STORE_TASKS, entry.previousState as unknown as Record<string, unknown>)
      }
    } else if (entry.type === 'delete' && entry.previousState) {
      redoStack.value.push({ type: 'delete', taskId: entry.taskId, description: entry.description })
      tasks.value.set(entry.taskId, { ...entry.previousState })
      triggerRef(tasks)
      await dbPut(STORE_TASKS, entry.previousState as unknown as Record<string, unknown>)
    } else if (entry.type === 'create') {
      const current = tasks.value.get(entry.taskId)
      if (current) {
        redoStack.value.push({ type: 'create', taskId: entry.taskId, previousState: { ...current }, description: entry.description })
        tasks.value.delete(entry.taskId)
        triggerRef(tasks)
        await dbDelete(STORE_TASKS, entry.taskId)
      }
    }
  }

  async function redo() {
    const entry = redoStack.value.pop()
    if (!entry) return
    if (entry.type === 'update' && entry.previousState) {
      const current = tasks.value.get(entry.taskId)
      if (current) {
        undoStack.value.push({ type: 'update', taskId: entry.taskId, previousState: { ...current }, description: entry.description })
        tasks.value.set(entry.taskId, { ...entry.previousState })
        triggerRef(tasks)
        await dbPut(STORE_TASKS, entry.previousState as unknown as Record<string, unknown>)
      }
    } else if (entry.type === 'delete') {
      const current = tasks.value.get(entry.taskId)
      if (current) {
        undoStack.value.push({ type: 'delete', taskId: entry.taskId, previousState: { ...current }, description: entry.description })
        tasks.value.delete(entry.taskId)
        triggerRef(tasks)
        await dbDelete(STORE_TASKS, entry.taskId)
      }
    } else if (entry.type === 'create' && entry.previousState) {
      undoStack.value.push({ type: 'create', taskId: entry.taskId, description: entry.description })
      tasks.value.set(entry.taskId, { ...entry.previousState })
      triggerRef(tasks)
      await dbPut(STORE_TASKS, entry.previousState as unknown as Record<string, unknown>)
    }
  }

  function logActivity(taskId: string, type: ActivityEntry['type'], description: string, oldValue?: string, newValue?: string) {
    const entry: ActivityEntry = { id: genId(), taskId, type, description, oldValue, newValue, createdAt: Date.now() }
    const arr = activities.value.get(taskId) || []
    arr.push(entry)
    activities.value.set(taskId, [...arr])
    triggerRef(activities)
    import('@/utils/db').then(({ dbPut: dp }) => { dp(STORE_ACTIVITIES, entry as unknown as Record<string, unknown>) })
  }

  const taskList = computed(() => Array.from(tasks.value.values()).filter(t => t.projectId === currentProjectId.value))

  const todayTasks = computed(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1)
    return taskList.value.filter(t => { if(!t.dueDate||t.status==='done') return false; const d=new Date(t.dueDate); return d>=today&&d<tomorrow })
  })

  const weekTasks = computed(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate()+7)
    return taskList.value.filter(t => { if(!t.dueDate||t.status==='done') return false; const d=new Date(t.dueDate); return d>=today&&d<weekEnd })
  })

  const completedTasks = computed(() => taskList.value.filter(t => t.status === 'done'))
  const pendingTasks = computed(() => taskList.value.filter(t => t.status !== 'done'))
  const upcomingTasks = computed(() => pendingTasks.value.filter(t => t.dueDate).sort((a,b) => new Date(a.dueDate!).getTime()-new Date(b.dueDate!).getTime()))
  const overdueTasks = computed(() => { const today=new Date(); today.setHours(0,0,0,0); return taskList.value.filter(t=>{ if(!t.dueDate||t.status==='done') return false; return new Date(t.dueDate)<today }) })

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
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q)))
    }
    if (filterTags.value.length > 0) { result = result.filter(t => filterTags.value.some(tag => t.tags?.includes(tag))) }
    result = [...result].sort((a, b) => {
      switch (currentSort.value) {
        case 'dueDate': return (a.dueDate||'').localeCompare(b.dueDate||'')
        case 'priority': { const o: Record<TaskPriority,number>={urgent:0,high:1,medium:2,low:3}; return (o[a.priority]??2)-(o[b.priority]??2) }
        case 'status': { const o: Record<TaskStatus,number>={todo:0,doing:1,done:2}; return o[a.status]-o[b.status] }
        case 'order': return a.order-b.order
        default: return b.createdAt-a.createdAt
      }
    })
    return result
  })

  const allTags = computed(() => { const s=new Set<string>(); taskList.value.forEach(t=>t.tags?.forEach(tag=>s.add(tag))); return Array.from(s) })
  const projectSections = computed(() => sections.value.filter(s=>s.projectId===currentProjectId.value).sort((a,b)=>a.order-b.order))

  async function switchProject(projectId: string) {
    currentProjectId.value = projectId; isLoaded.value = false; tasks.value = new Map(); selectedTaskIds.value = new Set()
    await loadFromDB(); await loadProjectData()
  }

  async function loadFromDB() {
    if (isLoaded.value) return
    const list = await dbGetAll<Task>(STORE_TASKS)
    const m = new Map<string,Task>()
    list.forEach(t => { if(!t.priority) t.priority='medium'; if(!t.children) t.children=[]; if(t.order===undefined) t.order=0; m.set(t.id,t) })
    tasks.value = m; isLoaded.value = true
    await loadComments(); await loadActivities(); await loadTimeEntries()
  }

  async function loadComments() { const all=await dbGetAll<TaskComment>(STORE_COMMENTS); const m=new Map<string,TaskComment[]>(); all.forEach(c=>{ const a=m.get(c.taskId)||[]; a.push(c); m.set(c.taskId,a) }); comments.value=m }
  async function loadActivities() { const all=await dbGetAll<ActivityEntry>(STORE_ACTIVITIES); const m=new Map<string,ActivityEntry[]>(); all.forEach(a=>{ const ar=m.get(a.taskId)||[]; ar.push(a); m.set(a.taskId,ar) }); activities.value=m }
  async function loadTimeEntries() { timeEntries.value = await dbGetAll<TimeEntry>(STORE_TIME_ENTRIES) }
  async function loadProjectData() {
    sections.value = await dbGetAll<TaskSection>(STORE_SECTIONS)
    boardColumns.value = await dbGetAll<BoardColumn>(STORE_BOARD_COLUMNS)
    tagConfigs.value = await dbGetAll<TagConfig>(STORE_TAGS)
  }

  async function createTask(data: { id?:string; title:string; description?:string; dueDate?:string|null; priority?:TaskPriority; tags?:string[]; assignee?:string; parentId?:string|null; children?:string[]; sectionId?:string; recurring?:RecurringConfig }): Promise<Task> {
    const maxOrder = taskList.value.reduce((max,t)=>Math.max(max,t.order),0)
    const task: Task = { id:data.id||genId(), title:data.title, description:data.description, dueDate:data.dueDate??null, priority:data.priority||'medium', tags:data.tags||[], status:'todo', assignee:data.assignee, progress:0, children:data.children||[], parentId:data.parentId??null, projectId:currentProjectId.value, sectionId:data.sectionId, order:maxOrder+1, recurring:data.recurring, timeEntries:[], totalTrackedTime:0, dependencies:[], createdAt:Date.now(), updatedAt:Date.now() }
    tasks.value.set(task.id, task); triggerRef(tasks)
    await dbPut(STORE_TASKS, task as unknown as Record<string, unknown>)
    pushUndo({ type:'create', taskId:task.id, description:'Created: '+task.title })
    logActivity(task.id, 'created', 'Task created: '+task.title)
    if (task.parentId) { const parent=tasks.value.get(task.parentId); if(parent&&!parent.children.includes(task.id)){parent.children.push(task.id); await dbPut(STORE_TASKS,parent as unknown as Record<string,unknown>); logActivity(parent.id,'subtask_added','Subtask added: '+task.title)} }
    return task
  }

  async function updateTask(id: string, updates: Partial<Omit<Task,'id'|'createdAt'>>) {
    const task = tasks.value.get(id); if(!task) return
    const previousState = { ...task }
    const updated = { ...task, ...updates, updatedAt:Date.now() }
    tasks.value.set(id, updated); triggerRef(tasks)
    await dbPut(STORE_TASKS, updated as unknown as Record<string, unknown>)
    if(updates.status&&updates.status!==previousState.status) logActivity(id,'status_change','Status changed',previousState.status,updates.status)
    if(updates.title&&updates.title!==previousState.title) logActivity(id,'title_change','Title changed',previousState.title,updates.title)
    if(updates.priority&&updates.priority!==previousState.priority) logActivity(id,'priority_change','Priority changed',previousState.priority,updates.priority)
    pushUndo({ type:'update', taskId:id, previousState, description:'Updated: '+updated.title })
    if(updated.parentId) await recalcParentProgress(updated.parentId)
    if(_syncToMindmapCallback) _syncToMindmapCallback(updated)
  }

  async function deleteTask(id: string) {
    const task=tasks.value.get(id); if(!task) return
    const previousState={...task}
    if(task.children?.length) { for(const cid of task.children) await deleteTask(cid) }
    tasks.value.delete(id); triggerRef(tasks); await dbDelete(STORE_TASKS,id)
    comments.value.delete(id); activities.value.delete(id)
    pushUndo({ type:'delete', taskId:id, previousState, description:'Deleted: '+task.title })
    logActivity(id,'deleted','Task deleted: '+task.title)
    if(task.parentId){const parent=tasks.value.get(task.parentId); if(parent?.children){parent.children=parent.children.filter(c=>c!==id); await dbPut(STORE_TASKS,parent as unknown as Record<string,unknown>); await recalcParentProgress(parent.id)}}
  }

  async function revertToNode(id: string) { await deleteTask(id) }

  async function recalcParentProgress(parentId: string) {
    const parent=tasks.value.get(parentId); if(!parent?.children?.length) return
    const childTasks=parent.children.map(cid=>tasks.value.get(cid)).filter(Boolean) as Task[]
    if(childTasks.length===0) return
    const doneCount=childTasks.filter(c=>c.status==='done').length
    const progress=Math.round((doneCount/childTasks.length)*100)
    const updated={...parent,progress,updatedAt:Date.now()}
    tasks.value.set(parentId,updated); triggerRef(tasks)
    await dbPut(STORE_TASKS,updated as unknown as Record<string,unknown>)
    if(_syncToMindmapCallback) _syncToMindmapCallback(updated)
  }

  function getTaskByNodeId(nodeId: string): Task | undefined { return tasks.value.get(nodeId) }

  async function syncTitleFromNode(nodeId: string, newTitle: string) {
    const task=tasks.value.get(nodeId)
    if(task&&task.title!==newTitle){const u={...task,title:newTitle,updatedAt:Date.now()}; tasks.value.set(nodeId,u); triggerRef(tasks); await dbPut(STORE_TASKS,u as unknown as Record<string,unknown>)}
  }

  function getAllTasks(): Task[] { return Array.from(tasks.value.values()) }
  function getTaskStats() { const total=taskList.value.length; const done=completedTasks.value.length; const doing=taskList.value.filter(t=>t.status==='doing').length; const todo=taskList.value.filter(t=>t.status==='todo').length; return {total,done,doing,todo} }
  function getTaskComments(taskId: string): TaskComment[] { return (comments.value.get(taskId)||[]).sort((a,b)=>a.createdAt-b.createdAt) }

  async function addComment(taskId: string, content: string, author: string='Me'): Promise<TaskComment> {
    const comment: TaskComment = { id:genId(), taskId, content, author, createdAt:Date.now(), updatedAt:Date.now() }
    const arr=comments.value.get(taskId)||[]; arr.push(comment); comments.value.set(taskId,[...arr])
    triggerRef(comments)
    await dbPut(STORE_COMMENTS, comment as unknown as Record<string, unknown>)
    logActivity(taskId, 'comment', 'Comment: '+content.slice(0,50))
    return comment
  }

  async function deleteComment(commentId: string, taskId: string) { const arr=comments.value.get(taskId)||[]; comments.value.set(taskId,arr.filter(c=>c.id!==commentId)); triggerRef(comments); await dbDelete(STORE_COMMENTS,commentId) }
  function getTaskActivities(taskId: string): ActivityEntry[] { return (activities.value.get(taskId)||[]).sort((a,b)=>b.createdAt-a.createdAt) }

  async function startTimeEntry(taskId: string) { const entry:TimeEntry={id:genId(),taskId,startTime:Date.now()}; timeEntries.value.push(entry); await updateTask(taskId,{isPomodoroActive:true}) }
  async function stopTimeEntry(taskId: string) {
    const entry=timeEntries.value.find(e=>e.taskId===taskId&&!e.endTime); if(!entry) return
    entry.endTime=Date.now(); entry.duration=entry.endTime-entry.startTime
    const task=tasks.value.get(taskId)
    if(task){const total=(task.totalTrackedTime||0)+entry.duration; await updateTask(taskId,{totalTrackedTime:total,isPomodoroActive:false})}
    await dbPut(STORE_TIME_ENTRIES,entry as unknown as Record<string,unknown>)
  }
  function getTaskTimeEntries(taskId: string): TimeEntry[] { return timeEntries.value.filter(e=>e.taskId===taskId).sort((a,b)=>b.startTime-a.startTime) }

  async function createSection(name: string): Promise<TaskSection> {
    const maxOrder=projectSections.value.reduce((max,s)=>Math.max(max,s.order),0)
    const section:TaskSection={id:genId(),projectId:currentProjectId.value,name,order:maxOrder+1,createdAt:Date.now()}
    sections.value.push(section); await dbPut(STORE_SECTIONS,section as unknown as Record<string,unknown>); return section
  }
  async function deleteSection(sectionId: string) { sections.value=sections.value.filter(s=>s.id!==sectionId); await dbDelete(STORE_SECTIONS,sectionId); const affected=taskList.value.filter(t=>t.sectionId===sectionId); for(const task of affected) await updateTask(task.id,{sectionId:undefined}) }
  async function reorderSections(orderedIds: string[]) { orderedIds.forEach((id,idx)=>{const s=sections.value.find(s=>s.id===id); if(s) s.order=idx}); for(const s of sections.value.filter(s=>s.projectId===currentProjectId.value)) await dbPut(STORE_SECTIONS,s as unknown as Record<string,unknown>) }

  function toggleTaskSelection(taskId: string) { if(selectedTaskIds.value.has(taskId)) selectedTaskIds.value.delete(taskId); else selectedTaskIds.value.add(taskId); selectedTaskIds.value=new Set(selectedTaskIds.value) }
  function selectAllVisible() { filteredTasks.value.forEach(t=>selectedTaskIds.value.add(t.id)); selectedTaskIds.value=new Set(selectedTaskIds.value) }
  function clearSelection() { selectedTaskIds.value=new Set() }
  async function batchUpdateStatus(status: TaskStatus) { for(const id of selectedTaskIds.value) await updateTask(id,{status,progress:status==='done'?100:0}); clearSelection() }
  async function batchDelete() { for(const id of selectedTaskIds.value) await deleteTask(id); clearSelection() }
  async function batchSetPriority(priority: TaskPriority) { for(const id of selectedTaskIds.value) await updateTask(id,{priority}); clearSelection() }

  async function reorderTasks(orderedIds: string[]) { orderedIds.forEach((id,idx)=>{const t=tasks.value.get(id); if(t) t.order=idx}); triggerRef(tasks); for(const id of orderedIds){const t=tasks.value.get(id); if(t) await dbPut(STORE_TASKS,t as unknown as Record<string,unknown>)} }

  async function completeRecurringTask(taskId: string) {
    const task=tasks.value.get(taskId); if(!task?.recurring||task.recurring.type==='none') return
    const nextDate=calculateNextDueDate(task.dueDate,task.recurring); if(!nextDate) return
    await createTask({title:task.title,description:task.description,dueDate:nextDate,priority:task.priority,tags:task.tags,assignee:task.assignee,sectionId:task.sectionId,recurring:task.recurring})
    logActivity(taskId,'status_change','Recurring task completed, next instance created')
  }

  function calculateNextDueDate(currentDate: string|null|undefined, config: RecurringConfig): string|null {
    if(!currentDate) return null; const d=new Date(currentDate)
    switch(config.type){ case 'daily':d.setDate(d.getDate()+config.interval);break; case 'weekly':d.setDate(d.getDate()+7*config.interval);break; case 'monthly':d.setMonth(d.getMonth()+config.interval);break; case 'yearly':d.setFullYear(d.getFullYear()+config.interval);break; default:return null }
    if(config.endDate&&d>new Date(config.endDate)) return null; return d.toISOString().split('T')[0]
  }

  function startPomodoro(taskId: string, minutes: number=25) { pomodoroTaskId.value=taskId; pomodoroStartTime.value=Date.now(); pomodoroRemaining.value=minutes*60*1000 }
  function stopPomodoro() { if(pomodoroTaskId.value&&pomodoroStartTime.value){const elapsed=Date.now()-pomodoroStartTime.value; const task=tasks.value.get(pomodoroTaskId.value); if(task){const total=(task.totalTrackedTime||0)+elapsed; updateTask(pomodoroTaskId.value,{totalTrackedTime:total})}}; pomodoroTaskId.value=null; pomodoroStartTime.value=null; pomodoroRemaining.value=0 }

  async function setBoardColumns(columns: BoardColumn[]) { boardColumns.value=columns; for(const col of columns) await dbPut(STORE_BOARD_COLUMNS,col as unknown as Record<string,unknown>) }
  function getProjectBoardColumns(): BoardColumn[] {
    const pc=boardColumns.value.filter(c=>c.projectId===currentProjectId.value)
    if(pc.length===0) return [{id:'col_todo',projectId:currentProjectId.value,status:'todo',label:'To Do',color:'#8b8b9e',order:0},{id:'col_doing',projectId:currentProjectId.value,status:'doing',label:'In Progress',color:'#E6A23C',order:1},{id:'col_done',projectId:currentProjectId.value,status:'done',label:'Done',color:'#67C23A',order:2}]
    return pc.sort((a,b)=>a.order-b.order)
  }

  async function setTagColor(name: string, color: string) { const ex=tagConfigs.value.find(t=>t.name===name); if(ex) ex.color=color; else tagConfigs.value.push({name,color}); await dbPut(STORE_TAGS,{id:'tag_'+name,name,color} as unknown as Record<string,unknown>) }
  function getTagColor(name: string): string { return tagConfigs.value.find(t=>t.name===name)?.color||'#8b8b9e' }

  async function addDependency(taskId: string, dependsOnId: string) { const task=tasks.value.get(taskId); if(!task) return; const deps=task.dependencies||[]; if(!deps.includes(dependsOnId)){deps.push(dependsOnId); await updateTask(taskId,{dependencies:deps})} }
  async function removeDependency(taskId: string, dependsOnId: string) { const task=tasks.value.get(taskId); if(!task) return; const deps=(task.dependencies||[]).filter(d=>d!==dependsOnId); await updateTask(taskId,{dependencies:deps}) }
  function isDependencyMet(taskId: string): boolean { const task=tasks.value.get(taskId); if(!task?.dependencies?.length) return true; return task.dependencies.every(depId=>{const dep=tasks.value.get(depId); return dep?.status==='done'}) }

  function exportProjectData(): object { return { tasks:taskList.value, sections:projectSections.value, comments:Array.from(comments.value.values()).flat(), activities:Array.from(activities.value.values()).flat(), timeEntries:timeEntries.value.filter(e=>taskList.value.some(t=>t.id===e.taskId)), exportedAt:Date.now(), version:2 } }
  async function importProjectData(data: any) { if(!data.tasks) return; for(const task of data.tasks){task.projectId=currentProjectId.value; tasks.value.set(task.id,task); await dbPut(STORE_TASKS,task as unknown as Record<string,unknown>)}; if(data.sections){for(const section of data.sections){section.projectId=currentProjectId.value; sections.value.push(section); await dbPut(STORE_SECTIONS,section as unknown as Record<string,unknown>)}}; if(data.comments){for(const comment of data.comments) await dbPut(STORE_COMMENTS,comment as unknown as Record<string,unknown>); await loadComments()}; triggerRef(tasks) }
  function exportCSV(): string { const h=['ID','Title','Status','Priority','Due Date','Assignee','Progress','Tags','Created','Updated']; const rows=taskList.value.map(t=>[t.id,'"'+t.title.replace(/"/g,'""')+'"',t.status,t.priority,t.dueDate||'',t.assignee||'',t.progress||0,(t.tags||[]).join(';'),new Date(t.createdAt).toISOString(),new Date(t.updatedAt).toISOString()]); return [h.join(','),...rows.map(r=>r.join(','))].join('\n') }

  return {
    tasks,isLoaded,currentProjectId,currentFilter,currentSort,searchQuery,filterTags,
    selectedTaskIds,undoStack,redoStack,
    taskList,todayTasks,weekTasks,completedTasks,pendingTasks,upcomingTasks,overdueTasks,
    filteredTasks,allTags,projectSections,
    switchProject,loadFromDB,loadProjectData,
    createTask,updateTask,deleteTask,revertToNode,
    getTaskByNodeId,syncTitleFromNode,registerSyncCallback,
    getAllTasks,getTaskStats,undo,redo,
    toggleTaskSelection,selectAllVisible,clearSelection,
    batchUpdateStatus,batchDelete,batchSetPriority,
    reorderTasks,
    getTaskComments,addComment,deleteComment,
    getTaskActivities,
    startTimeEntry,stopTimeEntry,getTaskTimeEntries,
    createSection,deleteSection,reorderSections,
    completeRecurringTask,
    pomodoroTaskId,pomodoroStartTime,pomodoroRemaining,
    startPomodoro,stopPomodoro,
    setBoardColumns,getProjectBoardColumns,
    setTagColor,getTagColor,
    addDependency,removeDependency,isDependencyMet,
    exportProjectData,importProjectData,exportCSV,
  }
})

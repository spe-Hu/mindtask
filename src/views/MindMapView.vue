<script setup lang="ts">
/**
 * 思维导图视图
 * 集成 SimpleMindMap，提供节点转任务功能
 */
import { ref, computed, onMounted, onBeforeUnmount, nextTick, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useMindmapStore } from '@/stores/mindmap'
import { useTaskStore } from '@/stores/task'
import type { TaskPriority, TaskMetadata } from '@/types/task'
import type { MindMapLayout, MindMapTheme } from '@/types/mindmap'
import { CircleCheck, View, RefreshLeft } from '@element-plus/icons-vue'
import TaskDetailPanel from '@/components/task/TaskDetailPanel.vue'
import { useThemeStore } from '@/stores/theme'

import { useLocaleStore } from '@/stores/locale'

const mindmapStore = useMindmapStore()
const taskStore = useTaskStore()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()
const t = localeStore.t

const mindmapEl = ref<HTMLElement | null>(null)
const selectedNodeId = ref('')
const selectedNodeText = ref('')
const hasSelection = ref(false)

// 转任务对话框
const showConvertDialog = ref(false)
const convertForm = ref({
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium' as TaskPriority,
  assignee: '',
  tags: '' as string,
})

// 任务详情面板
const showTaskDetail = ref(false)
const detailTaskId = ref('')

/** 布局选项 */
const layouts = computed(() => [
  { label: localeStore.t('mindmap.layoutLogical'), value: 'logicalStructure' as MindMapLayout },
  { label: localeStore.t('mindmap.layoutMindMap'), value: 'mindMap' as MindMapLayout },
  { label: localeStore.t('mindmap.layoutCatalog'), value: 'catalogOrganization' as MindMapLayout },
  { label: localeStore.t('mindmap.layoutOrg'), value: 'organizationStructure' as MindMapLayout },
])

/** 主题选项 */
const themes = computed(() => [
  { label: localeStore.t('mindmap.themeDefault'), value: 'default' as MindMapTheme },
  { label: localeStore.t('mindmap.themeClassic'), value: 'classic' as MindMapTheme },
  { label: localeStore.t('mindmap.themeDark'), value: 'dark' as MindMapTheme },
  { label: localeStore.t('mindmap.themeSimple'), value: 'simple' as MindMapTheme },
  { label: localeStore.t('mindmap.themeColorful'), value: 'classic4' as MindMapTheme },
])

/** SimpleMindMap 实例引用 */
const mindMapInstance = shallowRef<any>(null)

/** MindMap class reference (for re-registering themes on app theme change) */
let _MindMapClass: any = null

/** Read a CSS variable value */
function cssVar(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** Register all custom mindmap themes using current app theme CSS variables */
function registerMindmapThemes(MindMap: any) {
  const primary = cssVar('--c-primary', '#3b82f6')
  const bg = cssVar('--c-bg', '#0f172a')
  const bg2 = cssVar('--c-bg-2', '#1e293b')
  const bg3 = cssVar('--c-bg-3', '#334155')
  const surfaceHover = cssVar('--c-surface-hover', '#334155')
  const border = cssVar('--c-border', '#334155')
  const borderLight = cssVar('--c-border-light', '#475569')
  const text = cssVar('--c-text', '#f8fafc')
  const text2 = cssVar('--c-text-2', '#94a3b8')
  const text3 = cssVar('--c-text-3', '#64748b')

  MindMap.defineTheme('classic', {
    root: { fillColor: primary, color: '#fff', borderColor: primary, borderWidth: 0, fontSize: 24, borderRadius: 5 },
    second: { fillColor: bg2, color: text, borderColor: primary, borderWidth: 1, fontSize: 18, borderRadius: 5 },
    node: { fillColor: bg3, color: text2, borderColor: border, borderWidth: 1, fontSize: 14, borderRadius: 5 },
    backgroundColor: bg,
    lineColor: border,
    lineWidth: 1,
  })

  MindMap.defineTheme('dark', {
    root: { fillColor: primary, color: '#fff', borderColor: primary, borderWidth: 0, fontSize: 24, borderRadius: 5 },
    second: { fillColor: bg2, color: text, borderColor: borderLight, borderWidth: 1, fontSize: 18, borderRadius: 5 },
    node: { fillColor: bg3, color: text2, borderColor: border, borderWidth: 1, fontSize: 14, borderRadius: 5 },
    backgroundColor: bg,
    lineColor: border,
    lineWidth: 1,
  })

  MindMap.defineTheme('simple', {
    root: { fillColor: 'transparent', color: text, borderColor: 'transparent', borderWidth: 0, fontSize: 22, borderRadius: 0 },
    second: { fillColor: 'transparent', color: text2, borderColor: 'transparent', borderWidth: 0, fontSize: 16, borderRadius: 0 },
    node: { fillColor: 'transparent', color: text3, borderColor: 'transparent', borderWidth: 0, fontSize: 14, borderRadius: 0 },
    backgroundColor: bg,
    lineColor: border,
    lineWidth: 1,
    lineStyle: 'direct',
  })

  MindMap.defineTheme('classic4', {
    root: { fillColor: primary, color: '#fff', borderColor: primary, borderWidth: 0, fontSize: 24, borderRadius: 5 },
    second: { fillColor: bg3, color: text, borderColor: borderLight, borderWidth: 1, fontSize: 18, borderRadius: 5 },
    node: { fillColor: surfaceHover, color: text2, borderColor: border, borderWidth: 1, fontSize: 14, borderRadius: 5 },
    backgroundColor: bg,
    lineColor: border,
    lineWidth: 2,
  })
}

/** MindMap class reference (for re-registering themes on app theme change) */

// 防止同步循环的标志
let _isSyncingFromMindmap = false

onMounted(async () => {
  // 先从 DB 加载保存的数据
  const hasData = await mindmapStore.loadFromDB()
  await taskStore.loadFromDB()

  // 注册双向同步回调：任务更新 → 导图节点同步
  taskStore.registerSyncCallback((task) => {
    if (_isSyncingFromMindmap) return // 避免循环
    mindmapStore.syncTaskToNode(task.id, {
      isTask: true,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || undefined,
      assignee: task.assignee,
      progress: task.progress,
      tags: task.tags,
    })
    // 如果标题也变了，同步到导图节点文字
    mindmapStore.syncTitleToNode(task.id, task.title)
  })

  await nextTick()
  if (mindmapEl.value) {
    initMindMap(mindmapEl.value, hasData)
  }
})

onBeforeUnmount(() => {
  if (mindMapInstance.value) {
    mindMapInstance.value.destroy()
    mindMapInstance.value = null
  }
})

/** 初始化 SimpleMindMap */
function initMindMap(el: HTMLElement, hasData: boolean) {
  import('simple-mind-map').then(MindMapModule => {
    const MindMap = MindMapModule.default

    // Store reference for re-registering themes later
    _MindMapClass = MindMap

    // Register all custom themes using current app theme colors
    registerMindmapThemes(MindMap)

    const data = hasData ? mindmapStore.currentData : {
      data: { text: localeStore.t('mindmap.centerTopic') },
      children: []
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instance = new (MindMap as any)({
      el,
      data,
      layout: mindmapStore.currentLayout,
      theme: mindmapStore.currentTheme,
      readonly: false,
      fit: true,
      nodeTextEditZIndex: 5000,
      openPerformance: false,
    })

    mindMapInstance.value = instance
    mindmapStore.mindMapInstance = instance

    // 监听数据变化，自动保存到 IndexedDB
    instance.on('data_change', (data: any) => {
      mindmapStore.currentData = data
      mindmapStore.saveToDB(data)
    })

    // 监听节点内容变更，同步到任务
    instance.on('node_text_change', (node: any) => {
      const uid = node.getData?.('uid')
      const newText = node.getData?.('text')
      if (uid && newText) {
        _isSyncingFromMindmap = true
        taskStore.syncTitleFromNode(uid, newText)
        _isSyncingFromMindmap = false
      }
    })

    // 监听节点选中事件
    instance.on('node_active', (_node: any, activeNodeList: any[]) => {
      if (activeNodeList && activeNodeList.length > 0) {
        const activeNode = activeNodeList[activeNodeList.length - 1]
        const uid = activeNode.getData?.('uid')
        selectedNodeId.value = uid || ''
        selectedNodeText.value = activeNode.getData?.('text') || ''
        hasSelection.value = true
      }
    })

    // 监听画布点击（取消选中）
    instance.on('draw_click', () => {
      hasSelection.value = false
      selectedNodeId.value = ''
      selectedNodeText.value = ''
      hideContextMenu()
    })

    // 监听节点删除事件，同步删除任务
    instance.on('node_delete', (node: any) => {
      const uid = node.getData?.('uid')
      if (uid) {
        const task = taskStore.getTaskByNodeId(uid)
        if (task) {
          taskStore.deleteTask(uid)
        }
      }
    })

    // 监听节点右键菜单（SimpleMindMap 的 node_contextmenu 事件参数为 (e, node)）
    instance.on('node_contextmenu', (e: MouseEvent, node: any) => {
      e.preventDefault()
      const uid = node.getData?.('uid')
      if (uid) {
        selectedNodeId.value = uid
        selectedNodeText.value = node.getData?.('text') || ''
        hasSelection.value = true
        showContextMenu(e.clientX, e.clientY)
      }
    })

    // 刷新已有任务节点的视觉样式（从 IndexedDB 恢复后）
    // 自动选中根节点，使方向键导航可用
    nextTick(() => {
      refreshTaskNodeStyles()
      const rootNode = instance.renderer?.root
      if (rootNode) {
        instance.execCommand('GO_TARGET_NODE', rootNode)
      }
    })
  }).catch(err => {
    console.error('Failed to load simple-mind-map:', err)
  })
}

/** 刷新所有任务节点在导图中的视觉样式（页面加载后恢复） */
function refreshTaskNodeStyles() {
  const instance = mindMapInstance.value
  if (!instance?.renderer?.root) return

  // 递归遍历所有节点，检查是否有 taskMetadata
  const walk = (node: any) => {
    const meta = node.getData?.('taskMetadata')
    if (meta?.isTask) {
      const borderColor = getPriorityBorderColor(meta.priority || 'medium')
      try {
        instance.execCommand('SET_NODE_STYLES', node, {
          borderColor,
          borderWidth: 2,
        })
      } catch (_e) {
        // SET_NODE_STYLES 可能对某些节点类型失败，忽略
      }
    }
    if (node.children?.length) {
      node.children.forEach((child: any) => walk(child))
    }
  }
  walk(instance.renderer.root)
}

/** 根据优先级获取边框颜色 */
function getPriorityBorderColor(priority: string): string {
  switch (priority) {
    case 'urgent': return '#FF4444'
    case 'high': return '#F56C6C'
    case 'medium': return '#E6A23C'
    case 'low': return '#67C23A'
    default: return '#E6A23C'
  }
}

/** 右键菜单状态 */
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

function showContextMenu(x: number, y: number) {
  contextMenuX.value = x
  contextMenuY.value = y
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
}

/** 点击"转为任务" */
function onConvertToTask() {
  hideContextMenu()
  if (!selectedNodeId.value) {
    ElMessage.warning(localeStore.t('mindmap.selectNodeFirst'))
    return
  }
  // 检查是否已经是任务
  if (taskStore.getTaskByNodeId(selectedNodeId.value)) {
    ElMessage.info(localeStore.t('mindmap.alreadyTask'))
    showTaskDetail.value = true
    detailTaskId.value = selectedNodeId.value
    return
  }
  convertForm.value = {
    title: selectedNodeText.value,
    description: '',
    dueDate: '',
    priority: 'medium',
    assignee: '',
    tags: '',
  }
  showConvertDialog.value = true
}

/** 从工具栏转为任务 */
function onToolbarConvertToTask() {
  if (!hasSelection.value || !selectedNodeId.value) {
    ElMessage.warning('请先选中一个节点')
    return
  }
  onConvertToTask()
}

/** 提交转任务 */
async function submitConvert() {
  if (!convertForm.value.title.trim()) {
    ElMessage.warning(localeStore.t('mindmap.enterTitle'))
    return
  }

  const tags = convertForm.value.tags
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const metadata: TaskMetadata = {
    isTask: true,
    status: 'todo',
    priority: convertForm.value.priority,
    dueDate: convertForm.value.dueDate || undefined,
    assignee: convertForm.value.assignee || undefined,
    tags,
    progress: 0,
  }

  // 在任务 Store 中创建任务
  await taskStore.createTask({
    id: selectedNodeId.value,
    title: convertForm.value.title,
    description: convertForm.value.description,
    dueDate: convertForm.value.dueDate || null,
    priority: convertForm.value.priority,
    tags,
    assignee: convertForm.value.assignee,
  })

  // 在思维导图节点上标记为任务
  mindmapStore.convertNodeToTask(selectedNodeId.value, metadata)

  showConvertDialog.value = false
  ElMessage.success(localeStore.t('mindmap.convertedToTask'))
}

/** 查看节点对应的任务详情 */
function onViewTaskDetail() {
  hideContextMenu()
  if (selectedNodeId.value) {
    detailTaskId.value = selectedNodeId.value
    showTaskDetail.value = true
  }
}

/** 从右侧面板打开任务详情 */
function openTaskFromSidebar(taskId: string) {
  detailTaskId.value = taskId
  showTaskDetail.value = true
}

/** 将任务节点{{ t("task.revertToNode") }} */
async function onRevertNode() {
  hideContextMenu()
  if (!selectedNodeId.value) return

  await taskStore.revertToNode(selectedNodeId.value)
  mindmapStore.revertNodeFromTask(selectedNodeId.value)
  ElMessage.success(localeStore.t('mindmap.revertedToNode'))
}

/** 切换布局 */
function onLayoutChange(layout: MindMapLayout) {
  mindmapStore.setLayout(layout)
}

/** 切换主题 */
function onThemeChange(theme: MindMapTheme) {
  mindmapStore.setTheme(theme)
}

/** 更新任务状态（从详情面板） */
async function onTaskStatusChange(status: string) {
  await taskStore.updateTask(detailTaskId.value, {
    status: status as TaskStatus,
    progress: status === 'done' ? 100 : status === 'todo' ? 0 : undefined,
  })
}

/** 更新任务字段（从详情面板） */
async function onTaskFieldUpdate(field: string, value: any) {
  await taskStore.updateTask(detailTaskId.value, { [field]: value })
}

/** 判断当前选中节点是否是任务 */
const isSelectedNodeTask = ref(false)

/** 抽屉面板中的任务对象（响应式 computed，确保数据更新时视图刷新） */
const drawerTask = computed(() => {
  if (!detailTaskId.value) return undefined
  return taskStore.getTaskByNodeId(detailTaskId.value)
})

// 监听应用主题变化，同步思维导图背景颜色和主题
watch(() => themeStore.currentTheme, (newTheme) => {
  const root = document.documentElement
  const colors = themeStore.themes[newTheme]?.colors
  if (colors) {
    root.style.setProperty('--mindmap-bg', colors['bg-2'] as string)
    root.style.setProperty('--mindmap-node-bg', colors['bg-3'] as string)
    root.style.setProperty('--mindmap-node-text', colors['text'] as string)
    root.style.setProperty('--mindmap-line', colors['border'] as string)
  }
  // 同步思维导图主题到匹配的预设
  const themeMap: Record<string, MindMapTheme> = {
    midnight: 'classic', ocean: 'classic', sunset: 'classic4',
    forest: 'classic', lavender: 'classic4', coral: 'classic4', slate: 'dark'
  }
  const mmTheme = themeMap[newTheme]
  if (mmTheme) {
    mindmapStore.setTheme(mmTheme)
    // Re-register mindmap themes with new app colors
    if (_MindMapClass) {
      registerMindmapThemes(_MindMapClass)
    }
    // Also re-apply on the instance so colors update live
    if (mindMapInstance.value) {
      mindMapInstance.value.setTheme(mmTheme)
    }
  }
})

// 监听项目切换
watch(() => mindmapStore.currentProjectId, async (newProjectId, oldProjectId) => {
  if (newProjectId && newProjectId !== oldProjectId) {
    // 重新加载任务列表
    await taskStore.switchProject(newProjectId)
    
    // 重新加载思维导图数据
    await mindmapStore.loadFromDB()
    
    // 更新思维导图实例
    if (mindMapInstance.value && mindmapStore.currentData) {
      mindMapInstance.value.setData(mindmapStore.currentData)
      mindMapInstance.value.setTheme(mindmapStore.currentTheme)
      mindMapInstance.value.setLayout(mindmapStore.currentLayout)
      
      // 重新刷新任务节点样式
      await nextTick()
      refreshTaskNodeStyles()
      
      // 重新选中根节点以启用方向键导航
      const rootNode = mindMapInstance.value.renderer?.root
      if (rootNode) {
        mindMapInstance.value.execCommand('GO_TARGET_NODE', rootNode)
      }
    }
  }
})

watch([selectedNodeId, () => taskStore.taskList.length], () => {
  if (selectedNodeId.value) {
    isSelectedNodeTask.value = !!taskStore.getTaskByNodeId(selectedNodeId.value)
  } else {
    isSelectedNodeTask.value = false
  }
}, { immediate: true })

// 导入 TaskStatus 类型用于 onTaskStatusChange
type TaskStatus = import('@/types/task').TaskStatus
</script>

<template>
  <div class="mindmap-view" @click="hideContextMenu">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">{{ t("mindmap.layout") }}</span>
        <el-select
          :model-value="mindmapStore.currentLayout"
          @change="onLayoutChange"
          size="small"
          style="width: 120px"
        >
          <el-option
            v-for="l in layouts"
            :key="l.value"
            :label="l.label"
            :value="l.value"
          />
        </el-select>
      </div>
      <div class="toolbar-group">
        <span class="toolbar-label">{{ t("mindmap.theme") }}</span>
        <el-select
          :model-value="mindmapStore.currentTheme"
          @change="onThemeChange"
          size="small"
          style="width: 100px"
        >
          <el-option
            v-for="t in themes"
            :key="t.value"
            :label="t.label"
            :value="t.value"
          />
        </el-select>
      </div>
      <div class="toolbar-divider" />
      <div class="toolbar-group">
        <el-button
          size="small"
          :disabled="!hasSelection"
          :type="isSelectedNodeTask ? 'warning' : 'primary'"
          @click="isSelectedNodeTask ? onViewTaskDetail() : onToolbarConvertToTask()"
        >
          <el-icon><CircleCheck /></el-icon>
          {{ isSelectedNodeTask ? t('task.viewTask') : t('task.convertToTask') }}
        </el-button>
        <el-button
          v-if="isSelectedNodeTask"
          size="small"
          type="danger"
          @click="onRevertNode"
        >
          <el-icon><RefreshLeft /></el-icon>
          {{ t("task.revertToNode") }}
        </el-button>
      </div>
      <div class="toolbar-spacer" />
      <div class="toolbar-group">
        <el-tag size="small" type="info">
          {{ t("mindmap.tasks") }}: {{ taskStore.taskList.length }}
        </el-tag>
      </div>
    </div>

    <!-- 主体区域：思维导图 + 右侧任务面板 -->
    <div class="mindmap-body">
      <div ref="mindmapEl" class="mindmap-container"></div>

      <!-- 右侧常驻任务面板 -->
      <aside class="task-sidebar">
        <div class="task-sidebar__header">
          <span class="task-sidebar__title">{{ t("task.taskList") }}</span>
          <el-tag size="small" type="info">{{ taskStore.taskList.length }}</el-tag>
        </div>
        <div class="task-sidebar__list">
          <div
            v-for="task in taskStore.taskList"
            :key="task.id"
            class="task-sidebar__item"
            :class="`task-sidebar__item--${task.priority}`"
            @click="openTaskFromSidebar(task.id)"
          >
            <div class="task-sidebar__item-title">{{ task.title }}</div>
            <div class="task-sidebar__item-meta">
              <span class="task-sidebar__status" :class="`task-sidebar__status--${task.status}`">
                {{ task.status === 'done' ? '✓' : task.status === 'doing' ? '●' : '○' }}
              </span>
              <span v-if="task.dueDate" class="task-sidebar__date">{{ task.dueDate }}</span>
            </div>
          </div>
          <div v-if="taskStore.taskList.length === 0" class="task-sidebar__empty">
            {{ t("task.noTaskHint") }}
          </div>
        </div>
      </aside>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
        @click.stop
      >
        <template v-if="!taskStore.getTaskByNodeId(selectedNodeId)">
          <div class="context-menu-item" @click="onConvertToTask">
            <el-icon><CircleCheck /></el-icon>
            {{ t("task.convertToTask") }}
          </div>
        </template>
        <template v-else>
          <div class="context-menu-item" @click="onViewTaskDetail">
            <el-icon><View /></el-icon>
            {{ t("task.viewTaskDetail") }}
          </div>
          <div class="context-menu-item context-menu-item--danger" @click="onRevertNode">
            <el-icon><RefreshLeft /></el-icon>
            {{ t("task.revertToNode") }}
          </div>
        </template>
      </div>
    </Teleport>

    <!-- 转任务对话框 -->
    <el-dialog
      v-model="showConvertDialog"
      :title="t('task.convertToTask')"
      width="460px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item :label="t('task.title')">
          <el-input v-model="convertForm.title" :placeholder="t('task.taskTitle')" />
        </el-form-item>
        <el-form-item :label="t('task.description')">
          <el-input
            v-model="convertForm.description"
            type="textarea"
            :rows="3"
            :placeholder="t('task.taskDescription')"
          />
        </el-form-item>
        <el-form-item :label="t('task.dueDate')">
          <el-date-picker
            v-model="convertForm.dueDate"
            type="date"
            :placeholder="t('task.selectDate')"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item :label="t('task.priority')">
          <el-select v-model="convertForm.priority" style="width: 100%">
            <el-option :label="t('priority.high')" value="high" />
            <el-option :label="t('priority.medium')" value="medium" />
            <el-option :label="t('priority.low')" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('task.assignee')">
          <el-input v-model="convertForm.assignee" :placeholder="t('task.assigneePlaceholder')" />
        </el-form-item>
        <el-form-item :label="t('task.tags')">
          <el-input v-model="convertForm.tags" :placeholder="t('task.tagsPlaceholder')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConvertDialog = false">{{ t("common.cancel") }}</el-button>
        <el-button type="primary" @click="submitConvert">{{ t("task.confirmConvert") }}</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情侧滑面板 -->
    <el-drawer
      v-model="showTaskDetail"
      direction="rtl"
      size="400px"
      :show-close="false"
      :close-on-click-modal="true"
      :close-on-press-escape="true"
      class="task-detail-drawer"
    >
      <template #header>
        <div class="drawer-header">
          <span class="drawer-header__title">{{ t('task.taskDetails') }}</span>
          <button class="drawer-header__close" @click="showTaskDetail = false" :title="localeStore.t('common.close')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      </template>
      <template v-if="drawerTask">
        <TaskDetailPanel
          :task="drawerTask"
          @status-change="onTaskStatusChange"
          @update="onTaskFieldUpdate"
          @close="showTaskDetail = false"
        />
      </template>
      <template v-else>
        <div style="padding: 24px; text-align: center; color: var(--c-text-3);">
          {{ t("task.noTaskData") }}
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.mindmap-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--c-bg);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-5);
  background: var(--c-bg-2);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.toolbar-label {
  font-size: var(--fs-sm);
  color: var(--c-text-2);
  font-weight: 500;
}

.toolbar-group :deep(.el-button) {
  font-size: 12px;
  padding: 5px 10px;
  height: 28px;
}

.toolbar-group :deep(.el-button .el-icon) {
  font-size: 14px;
  margin-right: 3px;
}

.toolbar-group :deep(.el-select .el-input__inner) {
  font-size: 12px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--c-border);
}

.toolbar-spacer {
  flex: 1;
}

.mindmap-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.mindmap-container {
  flex: 1;
  position: relative;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.task-sidebar {
  width: 260px;
  flex-shrink: 0;
  background: var(--c-bg-2);
  border-left: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--s-4) var(--s-4);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.task-sidebar__title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text);
}

.task-sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-2);
}

.task-sidebar__item {
  padding: var(--s-2) var(--s-3);
  border-radius: var(--r-md);
  cursor: pointer;
  transition: background var(--t-fast);
  margin-bottom: var(--s-1);
}

.task-sidebar__item:hover {
  background: var(--c-surface-hover);
}

.task-sidebar__item-title {
  font-size: var(--fs-base);
  color: var(--c-text);
  font-weight: 500;
  margin-bottom: var(--s-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-sidebar__item-meta {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--fs-sm);
}

.task-sidebar__status {
  font-weight: 600;
}

.task-sidebar__status--todo {
  color: var(--c-text-2);
}

.task-sidebar__status--doing {
  color: var(--c-warning);
}

.task-sidebar__status--done {
  color: var(--c-success);
}

.task-sidebar__date {
  color: var(--c-text-3);
}

.task-sidebar__empty {
  padding: var(--s-6) var(--s-4);
  text-align: center;
  color: var(--c-text-3);
  font-size: var(--fs-base);
}

/* 右键菜单 */
.context-menu {
  position: absolute;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  padding: var(--s-2);
  min-width: 160px;
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  animation: slideDown var(--t-fast) ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-2) var(--s-3);
  cursor: pointer;
  transition: all var(--t-fast);
  color: var(--c-text);
  border-radius: var(--r-sm);
  font-size: var(--fs-base);
}

.context-menu-item:hover {
  background: var(--c-primary-light);
  color: var(--c-primary);
}

.context-menu-item__icon {
  font-size: var(--fs-lg);
}

/* Drawer header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.drawer-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
}

.drawer-header__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  color: var(--c-text-2);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.drawer-header__close:hover {
  background: var(--c-danger-light);
  color: var(--c-danger);
}

/* Drawer body spacing fix */
:deep(.task-detail-drawer .el-drawer__body) {
  padding: 12px 16px;
  overflow-y: auto;
}

:deep(.task-detail-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--c-border);
}

/* 响应式 */
@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    padding: var(--s-2) var(--s-3);
    gap: var(--s-2);
  }

  .toolbar-group {
    gap: var(--s-2);
  }
}
</style>

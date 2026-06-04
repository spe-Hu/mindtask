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

const mindmapStore = useMindmapStore()
const taskStore = useTaskStore()

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
const layouts: { label: string; value: MindMapLayout }[] = [
  { label: '逻辑结构', value: 'logicalStructure' },
  { label: '思维导图', value: 'mindMap' },
  { label: '目录组织', value: 'catalogOrganization' },
  { label: '组织结构', value: 'organizationStructure' },
]

/** 主题选项 */
const themes: { label: string; value: MindMapTheme }[] = [
  { label: '默认', value: 'default' },
  { label: '经典', value: 'classic' },
  { label: '深色', value: 'dark' },
  { label: '简洁', value: 'simple' },
  { label: '多彩', value: 'classic4' },
]

/** SimpleMindMap 实例引用 */
const mindMapInstance = shallowRef<any>(null)

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

    // 注册自定义主题（库只内置了 default，其他主题必须先注册）
    MindMap.defineTheme('classic', {
      root: {
        fillColor: '#549688',
        color: '#fff',
        borderColor: '#549688',
        borderWidth: 0,
        fontSize: 24,
        borderRadius: 5,
      },
      second: {
        fillColor: '#e9f7ef',
        color: '#386b3c',
        borderColor: '#549688',
        borderWidth: 1,
        fontSize: 18,
        borderRadius: 5,
      },
      node: {
        fillColor: '#fff',
        color: '#333',
        borderColor: '#549688',
        borderWidth: 1,
        fontSize: 14,
        borderRadius: 5,
      },
      lineColor: '#549688',
      lineWidth: 1,
    })

    MindMap.defineTheme('dark', {
      root: {
        fillColor: '#667eea',
        color: '#fff',
        borderColor: '#667eea',
        borderWidth: 0,
        fontSize: 24,
        borderRadius: 5,
      },
      second: {
        fillColor: '#2d2d44',
        color: '#e0e0f0',
        borderColor: '#667eea',
        borderWidth: 1,
        fontSize: 18,
        borderRadius: 5,
      },
      node: {
        fillColor: '#1e1e36',
        color: '#b0b0c8',
        borderColor: '#3a3a5c',
        borderWidth: 1,
        fontSize: 14,
        borderRadius: 5,
      },
      backgroundColor: '#0f0f1a',
      lineColor: '#3a3a5c',
      lineWidth: 1,
    })

    MindMap.defineTheme('simple', {
      root: {
        fillColor: 'transparent',
        color: '#333',
        borderColor: 'transparent',
        borderWidth: 0,
        fontSize: 22,
        borderRadius: 0,
      },
      second: {
        fillColor: 'transparent',
        color: '#555',
        borderColor: 'transparent',
        borderWidth: 0,
        fontSize: 16,
        borderRadius: 0,
      },
      node: {
        fillColor: 'transparent',
        color: '#666',
        borderColor: 'transparent',
        borderWidth: 0,
        fontSize: 14,
        borderRadius: 0,
      },
      lineColor: '#ccc',
      lineWidth: 1,
      lineStyle: 'direct',
    })

    MindMap.defineTheme('classic4', {
      root: {
        fillColor: '#667eea',
        color: '#fff',
        borderColor: '#667eea',
        borderWidth: 0,
        fontSize: 24,
        borderRadius: 5,
      },
      second: {
        fillColor: '#764ba2',
        color: '#fff',
        borderColor: '#764ba2',
        borderWidth: 1,
        fontSize: 18,
        borderRadius: 5,
      },
      node: {
        fillColor: '#f093fb',
        color: '#fff',
        borderColor: '#f093fb',
        borderWidth: 1,
        fontSize: 14,
        borderRadius: 5,
      },
      lineColor: '#764ba2',
      lineWidth: 2,
    })

    const data = hasData ? mindmapStore.currentData : {
      data: { text: '中心主题' },
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
    nextTick(() => {
      refreshTaskNodeStyles()
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
    ElMessage.warning('请先选中一个节点')
    return
  }
  // 检查是否已经是任务
  if (taskStore.getTaskByNodeId(selectedNodeId.value)) {
    ElMessage.info('该节点已经是任务')
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
    ElMessage.warning('请输入任务标题')
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
  ElMessage.success('已转为任务')
}

/** 查看节点对应的任务详情 */
function onViewTaskDetail() {
  hideContextMenu()
  if (selectedNodeId.value) {
    detailTaskId.value = selectedNodeId.value
    showTaskDetail.value = true
  }
}

/** 将任务节点转回普通节点 */
async function onRevertNode() {
  hideContextMenu()
  if (!selectedNodeId.value) return

  await taskStore.revertToNode(selectedNodeId.value)
  mindmapStore.revertNodeFromTask(selectedNodeId.value)
  ElMessage.success('已转回普通节点')
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
        <span class="toolbar-label">布局</span>
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
        <span class="toolbar-label">主题</span>
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
          {{ isSelectedNodeTask ? '查看任务' : '转为任务' }}
        </el-button>
        <el-button
          v-if="isSelectedNodeTask"
          size="small"
          type="danger"
          @click="onRevertNode"
        >
          <el-icon><RefreshLeft /></el-icon>
          转回节点
        </el-button>
      </div>
      <div class="toolbar-spacer" />
      <div class="toolbar-group">
        <el-tag size="small" type="info">
          任务: {{ taskStore.taskList.length }}
        </el-tag>
      </div>
    </div>

    <!-- 思维导图容器 -->
    <div ref="mindmapEl" class="mindmap-container"></div>

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
            转为任务
          </div>
        </template>
        <template v-else>
          <div class="context-menu-item" @click="onViewTaskDetail">
            <el-icon><View /></el-icon>
            查看任务详情
          </div>
          <div class="context-menu-item context-menu-item--danger" @click="onRevertNode">
            <el-icon><RefreshLeft /></el-icon>
            转回普通节点
          </div>
        </template>
      </div>
    </Teleport>

    <!-- 转任务对话框 -->
    <el-dialog
      v-model="showConvertDialog"
      title="转为任务"
      width="460px"
      :close-on-click-modal="false"
    >
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="convertForm.title" placeholder="任务标题" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="convertForm.description"
            type="textarea"
            :rows="3"
            placeholder="任务描述（可选）"
          />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="convertForm.dueDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="convertForm.priority" style="width: 100%">
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="convertForm.assignee" placeholder="负责人（可选）" />
        </el-form-item>
        <el-form-item label="标签（逗号分隔）">
          <el-input v-model="convertForm.tags" placeholder="如：前端, 紧急" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConvertDialog = false">取消</el-button>
        <el-button type="primary" @click="submitConvert">确认转换</el-button>
      </template>
    </el-dialog>

    <!-- 任务详情侧滑面板 -->
    <el-drawer
      v-model="showTaskDetail"
      title="任务详情"
      direction="rtl"
      size="380px"
    >
      <template v-if="drawerTask">
        <TaskDetailPanel
          :task="drawerTask"
          @status-change="onTaskStatusChange"
          @update="onTaskFieldUpdate"
        />
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.mindmap-view {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: #1a1a2e;
  border-bottom: 1px solid #2d2d44;
  flex-shrink: 0;
  z-index: 10;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 13px;
  color: #8b8b9e;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #2d2d44;
}

.toolbar-spacer {
  flex: 1;
}

.mindmap-container {
  flex: 1;
  overflow: hidden;
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: #252540;
  border: 1px solid #3a3a5c;
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 14px;
  color: #e0e0f0;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.context-menu-item:hover {
  background: rgba(102, 126, 234, 0.15);
}

.context-menu-item--danger:hover {
  background: rgba(245, 108, 108, 0.15);
  color: #F56C6C;
}
</style>

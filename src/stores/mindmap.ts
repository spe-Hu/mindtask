/**
 * 思维导图状态管理
 * 管理 SimpleMindMap 实例、数据保存/加载、与 Task store 双向同步
 */
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { MindMapData, MindMapLayout, MindMapTheme } from '@/types/mindmap'
import type { TaskMetadata } from '@/types/task'
import { dbPut, dbGet, STORE_MINDMAP } from '@/utils/db'

/** 默认思维导图数据 */
const DEFAULT_MINDMAP_DATA: MindMapData = {
  data: { text: '中心主题' },
  children: []
}

const CURRENT_MAP_ID = 'current'

/** 深度克隆数据确保可以被 IndexedDB 结构化克隆 */
function cloneForDB<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch {
    return data
  }
}

export const useMindmapStore = defineStore('mindmap', () => {
  // SimpleMindMap 实例（用 shallowRef 避免深度代理导致性能问题）
  const mindMapInstance = shallowRef<any>(null)
  const currentData = ref<MindMapData>(DEFAULT_MINDMAP_DATA)
  const currentLayout = ref<MindMapLayout>('logicalStructure')
  const currentTheme = ref<MindMapTheme>('default')
  const isLoaded = ref(false)

  /** 保存到 IndexedDB */
  async function saveToDB(data?: MindMapData) {
    const saveData = cloneForDB(data || currentData.value)
    await dbPut(STORE_MINDMAP, {
      id: CURRENT_MAP_ID,
      data: saveData,
      layout: currentLayout.value,
      theme: currentTheme.value,
      updatedAt: Date.now(),
    } as unknown as Record<string, unknown>)
  }

  /** 从 IndexedDB 加载 */
  async function loadFromDB(): Promise<boolean> {
    const record = await dbGet<{
      id: string
      data: MindMapData
      layout: MindMapLayout
      theme: MindMapTheme
    }>(STORE_MINDMAP, CURRENT_MAP_ID)

    if (record) {
      currentData.value = record.data
      currentLayout.value = record.layout || 'logicalStructure'
      currentTheme.value = record.theme || 'default'
      return true
    }
    return false
  }

  /** 切换布局 */
  function setLayout(layout: MindMapLayout) {
    currentLayout.value = layout
    if (mindMapInstance.value) {
      mindMapInstance.value.setLayout(layout)
    }
    saveToDB()
  }

  /** 切换主题 */
  function setTheme(theme: MindMapTheme) {
    currentTheme.value = theme
    if (mindMapInstance.value) {
      mindMapInstance.value.setTheme(theme)
    }
    saveToDB()
  }

  /** 获取当前选中节点的数据 */
  function getActiveNodes(): any[] {
    if (!mindMapInstance.value) return []
    return mindMapInstance.value.renderer?.activeNodeList || []
  }

  /** 将节点转为任务节点 - 使用 execCommand SET_NODE_DATA */
  function convertNodeToTask(nodeId: string, metadata: TaskMetadata) {
    const instance = mindMapInstance.value
    if (!instance) return

    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return

    // 使用 execCommand SET_NODE_DATA 设置节点的 taskMetadata
    instance.execCommand('SET_NODE_DATA', node, {
      taskMetadata: { ...metadata, isTask: true }
    })

    // 使用 execCommand SET_NODE_STYLES 批量设置视觉样式
    const borderColor = getPriorityColor(metadata.priority || 'medium')
    instance.execCommand('SET_NODE_STYLES', node, {
      borderColor,
      borderWidth: 2,
    })
  }

  /** 更新节点上的任务元数据 - 从任务列表同步到导图 */
  function syncTaskToNode(nodeId: string, metadata: TaskMetadata) {
    const instance = mindMapInstance.value
    if (!instance) return

    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return

    // 更新 taskMetadata
    instance.execCommand('SET_NODE_DATA', node, {
      taskMetadata: { ...metadata, isTask: true }
    })

    // 同步更新视觉样式
    const borderColor = getPriorityColor(metadata.priority || 'medium')
    instance.execCommand('SET_NODE_STYLES', node, {
      borderColor,
      borderWidth: 2,
    })
  }

  /** 将任务节点转回普通节点 - 清除 taskMetadata 和样式 */
  function revertNodeFromTask(nodeId: string) {
    const instance = mindMapInstance.value
    if (!instance) return

    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return

    // 清除 taskMetadata
    instance.execCommand('SET_NODE_DATA', node, {
      taskMetadata: null
    })

    // 恢复默认样式
    instance.execCommand('SET_NODE_STYLES', node, {
      borderColor: 'transparent',
      borderWidth: 0,
    })
  }

  /** 同步任务标题到导图节点（双向同步：任务列表标题变更 → 导图节点） */
  function syncTitleToNode(nodeId: string, newTitle: string) {
    const instance = mindMapInstance.value
    if (!instance) return

    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return

    // 检查当前标题是否不同，避免死循环
    const currentText = node.getData?.('text')
    if (currentText !== newTitle) {
      instance.execCommand('SET_NODE_TEXT', node, newTitle)
    }
  }

  /** 导出数据（用于备份） */
  function exportData(): MindMapData {
    return mindMapInstance.value?.getData?.() || currentData.value
  }

  /** 导入数据（用于恢复） */
  function importData(data: MindMapData) {
    currentData.value = data
    if (mindMapInstance.value) {
      mindMapInstance.value.setData(data)
    }
    saveToDB(data)
  }

  return {
    mindMapInstance,
    currentData,
    currentLayout,
    currentTheme,
    isLoaded,
    saveToDB,
    loadFromDB,
    setLayout,
    setTheme,
    getActiveNodes,
    convertNodeToTask,
    syncTaskToNode,
    revertNodeFromTask,
    syncTitleToNode,
    exportData,
    importData,
  }
})

/** 根据优先级获取边框颜色 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#F56C6C'
    case 'medium': return '#E6A23C'
    case 'low': return '#67C23A'
    default: return '#E6A23C'
  }
}

/**
 * 思维导图状态管理
 * 管理 SimpleMindMap 实例、数据保存/加载、与 Task store 双向同步
 * 按项目隔离数据
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

/** 深度克隆数据确保可以被 IndexedDB 结构化克隆 */
function cloneForDB<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch {
    return data
  }
}

export const useMindmapStore = defineStore('mindmap', () => {
  const mindMapInstance = shallowRef<any>(null)
  const currentData = ref<MindMapData>(DEFAULT_MINDMAP_DATA)
  const currentLayout = ref<MindMapLayout>('logicalStructure')
  const currentTheme = ref<MindMapTheme>('default')
  const isLoaded = ref(false)
  const currentProjectId = ref('')

  /** 获取当前项目的 DB key */
  function getMapId(): string {
    return currentProjectId.value ? `mindmap_${currentProjectId.value}` : 'current'
  }

  /** 切换到指定项目并加载数据 */
  async function switchProject(projectId: string): Promise<boolean> {
    currentProjectId.value = projectId
    isLoaded.value = false
    mindMapInstance.value = null
    currentData.value = { ...DEFAULT_MINDMAP_DATA, data: { text: '中心主题' }, children: [] }
    currentLayout.value = 'logicalStructure'
    currentTheme.value = 'default'
    return loadFromDB()
  }

  /** 保存到 IndexedDB */
  async function saveToDB(data?: MindMapData) {
    const saveData = cloneForDB(data || currentData.value)
    await dbPut(STORE_MINDMAP, {
      id: getMapId(),
      projectId: currentProjectId.value,
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
    }>(STORE_MINDMAP, getMapId())

    if (record) {
      currentData.value = record.data
      currentLayout.value = record.layout || 'logicalStructure'
      currentTheme.value = record.theme || 'default'
      isLoaded.value = true
      return true
    }
    isLoaded.value = true
    return false
  }

  function setLayout(layout: MindMapLayout) {
    currentLayout.value = layout
    if (mindMapInstance.value) {
      mindMapInstance.value.setLayout(layout)
    }
    saveToDB()
  }

  function setTheme(theme: MindMapTheme) {
    currentTheme.value = theme
    if (mindMapInstance.value) {
      mindMapInstance.value.setTheme(theme)
    }
    saveToDB()
  }

  function getActiveNodes(): any[] {
    if (!mindMapInstance.value) return []
    return mindMapInstance.value.renderer?.activeNodeList || []
  }

  function convertNodeToTask(nodeId: string, metadata: TaskMetadata) {
    const instance = mindMapInstance.value
    if (!instance) return
    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return
    instance.execCommand('SET_NODE_DATA', node, {
      taskMetadata: { ...metadata, isTask: true }
    })
    const borderColor = getPriorityColor(metadata.priority || 'medium')
    instance.execCommand('SET_NODE_STYLES', node, {
      borderColor,
      borderWidth: 2,
    })
  }

  function syncTaskToNode(nodeId: string, metadata: TaskMetadata) {
    const instance = mindMapInstance.value
    if (!instance) return
    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return
    instance.execCommand('SET_NODE_DATA', node, {
      taskMetadata: { ...metadata, isTask: true }
    })
    const borderColor = getPriorityColor(metadata.priority || 'medium')
    instance.execCommand('SET_NODE_STYLES', node, {
      borderColor,
      borderWidth: 2,
    })
  }

  function revertNodeFromTask(nodeId: string) {
    const instance = mindMapInstance.value
    if (!instance) return
    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return
    instance.execCommand('SET_NODE_DATA', node, {
      taskMetadata: null
    })
    instance.execCommand('SET_NODE_STYLES', node, {
      borderColor: 'transparent',
      borderWidth: 0,
    })
  }

  function syncTitleToNode(nodeId: string, newTitle: string) {
    const instance = mindMapInstance.value
    if (!instance) return
    const node = instance.renderer?.findNodeByUid(nodeId) as any
    if (!node) return
    const currentText = node.getData?.('text')
    if (currentText !== newTitle) {
      instance.execCommand('SET_NODE_TEXT', node, newTitle)
    }
  }

  function exportData(): MindMapData {
    return mindMapInstance.value?.getData?.() || currentData.value
  }

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
    currentProjectId,
    switchProject,
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

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#F56C6C'
    case 'medium': return '#E6A23C'
    case 'low': return '#67C23A'
    default: return '#E6A23C'
  }
}

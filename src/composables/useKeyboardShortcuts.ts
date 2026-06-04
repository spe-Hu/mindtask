/**
 * 全局键盘快捷键 composable
 * 支持 Ctrl+F (搜索), Ctrl+S (保存), Ctrl+N (新建), Delete (删除)
 */
import { onMounted, onUnmounted } from 'vue'
import { useSearchStore } from '@/stores/search'
import { useMindmapStore } from '@/stores/mindmap'
import { useTaskStore } from '@/stores/task'

export function useKeyboardShortcuts() {
  const searchStore = useSearchStore()
  const mindmapStore = useMindmapStore()
  const taskStore = useTaskStore()

  function handleKeydown(event: KeyboardEvent) {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey
    
    // Ctrl/Cmd + F: 打开全局搜索
    if (isCtrlOrCmd && event.key === 'f') {
      event.preventDefault()
      searchStore.openSearch()
      return
    }
    
    // Ctrl/Cmd + S: 保存当前思维导图
    if (isCtrlOrCmd && event.key === 's') {
      event.preventDefault()
      mindmapStore.saveToDB()
      return
    }
    
    // Ctrl/Cmd + N: 新建任务（如果在任务列表视图）
    if (isCtrlOrCmd && event.key === 'n') {
      // 这里可以添加新建任务的逻辑
      // 暂时只是阻止默认行为
      event.preventDefault()
      return
    }
    
    // Escape: 关闭搜索框
    if (event.key === 'Escape') {
      if (searchStore.isOpen) {
        searchStore.closeSearch()
        return
      }
    }
    
    // Delete: 删除选中的思维导图节点（如果在思维导图视图且有选中节点）
    if (event.key === 'Delete' || event.key === 'Backspace') {
      // 检查是否在输入框中，如果是则不处理
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }
      
      // 这里可以添加删除选中节点的逻辑
      // 需要从 MindMapView 获取选中的节点
      return
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
}

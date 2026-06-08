import { useTaskStore } from '@/stores/task'
import { useMindmapStore } from '@/stores/mindmap'

export function useShortcuts() {
  const taskStore = useTaskStore()
  const mindmapStore = useMindmapStore()

  let focusedIndex = -1

  function handleGlobalKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

    // Quick Add - Q
    if (e.key === 'q' && !isInput) {
      e.preventDefault()
      document.dispatchEvent(new CustomEvent('quickadd:open'))
      return
    }

    // Search - Ctrl/Cmd + F
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      document.dispatchEvent(new CustomEvent('search:open'))
      return
    }

    // Undo - Ctrl/Cmd + Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      taskStore.undo()
      return
    }

    // Redo - Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
    if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'Z' || e.key === 'y')) {
      e.preventDefault()
      taskStore.redo()
      return
    }

    // Navigation in mind map view
    if (document.querySelector('.mindmap-container') && !isInput) {
      const activeNodes = mindmapStore.getActiveNodes()
      
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        // Mind map navigation is handled by the library, but we can dispatch events
        document.dispatchEvent(new CustomEvent('mindmap:navigate', { detail: { direction: e.key } }))
      }

      // Tab - Add child node
      if (e.key === 'Tab' && activeNodes.length > 0) {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mindmap:addChild'))
      }

      // Enter - Edit node
      if (e.key === 'Enter' && activeNodes.length > 0) {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mindmap:edit'))
      }

      // Delete/Backspace - Delete node
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeNodes.length > 0) {
        e.preventDefault()
        document.dispatchEvent(new CustomEvent('mindmap:delete'))
      }
    }

    // Task list navigation
    if (document.querySelector('.task-list') && !isInput) {
      const tasks = taskStore.filteredTasks
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusedIndex = Math.min(focusedIndex + 1, tasks.length - 1)
        document.dispatchEvent(new CustomEvent('task:focus', { detail: { index: focusedIndex } }))
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        focusedIndex = Math.max(focusedIndex - 1, 0)
        document.dispatchEvent(new CustomEvent('task:focus', { detail: { index: focusedIndex } }))
      }

      // Space - Toggle task status
      if (e.key === ' ' && focusedIndex >= 0 && focusedIndex < tasks.length) {
        e.preventDefault()
        const task = tasks[focusedIndex]
        taskStore.updateTask(task.id, { 
          status: task.status === 'done' ? 'todo' : 'done' 
        })
      }

      // Enter - Open task details
      if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < tasks.length) {
        e.preventDefault()
        const task = tasks[focusedIndex]
        document.dispatchEvent(new CustomEvent('task:openDetails', { detail: { taskId: task.id } }))
      }

      // Delete - Delete task
      if ((e.key === 'Delete' || e.key === 'Backspace') && focusedIndex >= 0 && focusedIndex < tasks.length) {
        e.preventDefault()
        const task = tasks[focusedIndex]
        if (confirm(`Delete task "${task.title}"?`)) {
          taskStore.deleteTask(task.id)
          focusedIndex = Math.max(0, focusedIndex - 1)
        }
      }
    }

    // Escape - Close any open modal
    if (e.key === 'Escape') {
      document.dispatchEvent(new CustomEvent('modal:close'))
    }
  }

  function init() {
    document.addEventListener('keydown', handleGlobalKeydown)
  }

  function destroy() {
    document.removeEventListener('keydown', handleGlobalKeydown)
  }

  return {
    init,
    destroy,
  }
}

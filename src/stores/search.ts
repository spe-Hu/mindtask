import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTaskStore } from './task'
import { useMindmapStore } from './mindmap'
import type { Task } from '@/types/task'

export interface SearchResult {
  id: string
  type: 'task' | 'mindmap-node'
  title: string
  description?: string
  route?: string
  nodeId?: string
}

export const useSearchStore = defineStore('search', () => {
  const searchQuery = ref('')
  const isOpen = ref(false)
  
  const taskStore = useTaskStore()
  const mindmapStore = useMindmapStore()

  const results = computed<SearchResult[]>(() => {
    if (!searchQuery.value.trim()) return []
    
    const query = searchQuery.value.toLowerCase()
    const taskResults: SearchResult[] = []
    const mindmapResults: SearchResult[] = []

    // Search tasks
    const tasks = taskStore.getAllTasks()
    tasks.forEach((task: Task) => {
      const matchesTitle = task.title.toLowerCase().includes(query)
      const matchesDescription = task.description?.toLowerCase().includes(query)
      const matchesTags = task.tags?.some(tag => tag.toLowerCase().includes(query))
      
      if (matchesTitle || matchesDescription || matchesTags) {
        taskResults.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: task.description,
          route: `/project/${task.projectId}/tasks`
        })
      }
    })

    // Search mindmap nodes (simplified - search current mindmap data)
    const mindmapData = mindmapStore.getMindmapData()
    if (mindmapData) {
      const searchNodes = (node: any, path: string[] = []) => {
        if (!node) return
        
        const text = node.data?.text || ''
        if (text.toLowerCase().includes(query)) {
          mindmapResults.push({
            id: node.data?.id || `node-${path.join('-')}`,
            type: 'mindmap-node',
            title: text,
            description: path.length > 0 ? `Path: ${path.join(' > ')}` : 'Root node',
            nodeId: node.data?.id
          })
        }
        
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any, index: number) => {
            searchNodes(child, [...path, text])
          })
        }
      }
      
      searchNodes(mindmapData.root)
    }

    return [...taskResults, ...mindmapResults].slice(0, 10) // Limit to 10 results
  })

  function openSearch() {
    isOpen.value = true
    searchQuery.value = ''
  }

  function closeSearch() {
    isOpen.value = false
    searchQuery.value = ''
  }

  function clearSearch() {
    searchQuery.value = ''
  }

  return {
    searchQuery,
    isOpen,
    results,
    openSearch,
    closeSearch,
    clearSearch
  }
})

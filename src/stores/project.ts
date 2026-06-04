/**
 * 项目管理 Store
 * 管理项目列表、当前选中项目
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project } from '@/types/project'
import { dbPut, dbDelete, dbGetAll, STORE_PROJECTS } from '@/utils/db'

function genProjectId(): string {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Map<string, Project>>(new Map())
  const currentProjectId = ref<string>('')
  const isLoaded = ref(false)

  const projectList = computed(() =>
    Array.from(projects.value.values()).sort((a, b) => a.createdAt - b.createdAt)
  )

  const currentProject = computed(() =>
    projects.value.get(currentProjectId.value) || null
  )

  async function loadFromDB() {
    if (isLoaded.value) return
    const list = await dbGetAll<Project>(STORE_PROJECTS)
    const newMap = new Map<string, Project>()
    list.forEach(p => newMap.set(p.id, p))
    projects.value = newMap

    // 如果没有项目，创建默认项目
    if (newMap.size === 0) {
      await createProject('默认项目')
    } else {
      // 默认选中第一个项目
      if (!currentProjectId.value && list.length > 0) {
        currentProjectId.value = list.sort((a, b) => a.createdAt - b.createdAt)[0].id
      }
    }
    isLoaded.value = true
  }

  async function createProject(name: string, description?: string): Promise<Project> {
    const project: Project = {
      id: genProjectId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    projects.value.set(project.id, project)
    await dbPut(STORE_PROJECTS, project as unknown as Record<string, unknown>)

    // 如果是第一个项目，自动选中
    if (!currentProjectId.value) {
      currentProjectId.value = project.id
    }
    return project
  }

  async function deleteProject(id: string) {
    projects.value.delete(id)
    await dbDelete(STORE_PROJECTS, id)

    // 如果删除的是当前项目，切换到第一个
    if (currentProjectId.value === id) {
      const remaining = projectList.value
      currentProjectId.value = remaining.length > 0 ? remaining[0].id : ''
    }
  }

  async function renameProject(id: string, name: string) {
    const project = projects.value.get(id)
    if (!project) return
    project.name = name
    project.updatedAt = Date.now()
    projects.value.set(id, project)
    await dbPut(STORE_PROJECTS, project as unknown as Record<string, unknown>)
  }

  function setCurrentProject(id: string) {
    currentProjectId.value = id
  }

  return {
    projects,
    currentProjectId,
    isLoaded,
    projectList,
    currentProject,
    loadFromDB,
    createProject,
    deleteProject,
    renameProject,
    setCurrentProject,
  }
})

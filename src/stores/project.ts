/**
 * Project Store with template support
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Project, ProjectTemplate, TemplateData } from '@/types/project'
import { dbPut, dbDelete, dbGetAll, STORE_PROJECTS } from '@/utils/db'

function genProjectId(): string {
  return 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9)
}

const BUILTIN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl_blank',
    name: 'Blank Project',
    description: 'Empty project to start fresh',
    data: { sections: [], boardColumns: [], tags: [] },
    createdAt: 0,
  },
  {
    id: 'tpl_sprint',
    name: 'Sprint Board',
    description: 'Kanban-style sprint with Backlog, In Progress, Review, Done sections',
    data: {
      sections: [
        { id: 'sec_backlog', name: 'Backlog', order: 0 },
        { id: 'sec_progress', name: 'In Progress', order: 1 },
        { id: 'sec_review', name: 'Review', order: 2 },
        { id: 'sec_done', name: 'Done', order: 3 },
      ],
      boardColumns: [],
      tags: [{ name: 'bug', color: '#F56C6C' }, { name: 'feature', color: '#67C23A' }, { name: 'improvement', color: '#E6A23C' }],
    },
    createdAt: 0,
  },
  {
    id: 'tpl_personal',
    name: 'Personal GTD',
    description: 'Getting Things Done with Inbox, Next Actions, Waiting, Someday sections',
    data: {
      sections: [
        { id: 'sec_inbox', name: 'Inbox', order: 0 },
        { id: 'sec_next', name: 'Next Actions', order: 1 },
        { id: 'sec_waiting', name: 'Waiting For', order: 2 },
        { id: 'sec_someday', name: 'Someday/Maybe', order: 3 },
      ],
      boardColumns: [],
      tags: [{ name: 'personal', color: '#3b82f6' }, { name: 'work', color: '#E6A23C' }, { name: 'urgent', color: '#F56C6C' }],
    },
    createdAt: 0,
  },
  {
    id: 'tpl_product',
    name: 'Product Launch',
    description: 'Product launch checklist with Research, Design, Development, Marketing sections',
    data: {
      sections: [
        { id: 'sec_research', name: 'Research', order: 0 },
        { id: 'sec_design', name: 'Design', order: 1 },
        { id: 'sec_dev', name: 'Development', order: 2 },
        { id: 'sec_marketing', name: 'Marketing', order: 3 },
        { id: 'sec_launch', name: 'Launch', order: 4 },
      ],
      boardColumns: [],
      tags: [{ name: 'critical', color: '#FF4444' }, { name: 'nice-to-have', color: '#67C23A' }, { name: 'blocked', color: '#F56C6C' }],
    },
    createdAt: 0,
  },
]

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

    if (newMap.size === 0) {
      await createProject('Default Project')
    } else {
      if (!currentProjectId.value && list.length > 0) {
        currentProjectId.value = list.sort((a, b) => a.createdAt - b.createdAt)[0].id
      }
    }
    isLoaded.value = true
  }

  async function createProject(name: string, description?: string, templateId?: string): Promise<Project> {
    const project: Project = {
      id: genProjectId(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    
    if (templateId) {
      const template = BUILTIN_TEMPLATES.find(t => t.id === templateId)
      if (template) {
        project.templateData = template.data
      }
    }
    
    projects.value.set(project.id, project)
    await dbPut(STORE_PROJECTS, project as unknown as Record<string, unknown>)

    if (!currentProjectId.value) {
      currentProjectId.value = project.id
    }
    return project
  }

  async function deleteProject(id: string) {
    projects.value.delete(id)
    await dbDelete(STORE_PROJECTS, id)

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

  function getBuiltinTemplates(): ProjectTemplate[] {
    return BUILTIN_TEMPLATES
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
    getBuiltinTemplates,
  }
})

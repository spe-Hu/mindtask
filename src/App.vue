<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useTaskStore } from '@/stores/task'
import { useMindmapStore } from '@/stores/mindmap'
import { useSearchStore } from '@/stores/search'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import GlobalSearch from '@/components/GlobalSearch.vue'
import QuickAdd from '@/components/QuickAdd.vue'
import { useThemeStore, type Theme } from '@/stores/theme'
import { useLocaleStore, type Locale } from '@/stores/locale'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const mindmapStore = useMindmapStore()
const searchStore = useSearchStore()
const themeStore = useThemeStore()
const localeStore = useLocaleStore()
const t = localeStore.t

useKeyboardShortcuts()

const showNewProjectDialog = ref(false)
const newProjectName = ref('')
const selectedTemplate = ref('tpl_blank')
const builtinTemplates = projectStore.getBuiltinTemplates()

onMounted(async () => {
  localeStore.loadLocale()
  themeStore.loadTheme()
  await projectStore.loadFromDB()
  await taskStore.loadFromDB()
  if (projectStore.currentProjectId && !taskStore.currentProjectId) {
    taskStore.currentProjectId = projectStore.currentProjectId
    mindmapStore.currentProjectId = projectStore.currentProjectId
  }
  const routeProjectId = route.params.projectId as string
  if (routeProjectId && projectStore.currentProjectId !== routeProjectId) {
    projectStore.setCurrentProject(routeProjectId)
  }
})

watch(() => route.params.projectId, async (projectId) => {
  if (projectId && projectId !== projectStore.currentProjectId) {
    projectStore.setCurrentProject(projectId as string)
    await taskStore.switchProject(projectId as string)
    await mindmapStore.switchProject(projectId as string)
  }
}, { immediate: true })

function selectProject(projectId: string) { router.push('/project/' + projectId + '/mindmap') }
function getProjectView(projectId: string, view: string) { return '/project/' + projectId + '/' + view }

const currentView = ref<string>('mindmap')
watch(() => route.name, (name) => {
  if (name === 'Tasks' || name === 'TasksDefault') currentView.value = 'tasks'
  else if (name === 'Board' || name === 'BoardDefault') currentView.value = 'board'
  else if (name === 'Calendar' || name === 'CalendarDefault') currentView.value = 'calendar'
  else if (name === 'Dashboard' || name === 'DashboardDefault') currentView.value = 'dashboard'
  else currentView.value = 'mindmap'
}, { immediate: true })

async function createProject() {
  if (!newProjectName.value.trim()) { ElMessage.warning(t('common.pleaseEnterProjectName')); return }
  const project = await projectStore.createProject(newProjectName.value.trim(), '', selectedTemplate.value)
  newProjectName.value = ''
  showNewProjectDialog.value = false
  selectedTemplate.value = 'tpl_blank'
  router.push('/project/' + project.id + '/mindmap')
  ElMessage.success(t('common.projectCreated'))
}

const showThemeDropdown = ref(false)
function cycleTheme() { showThemeDropdown.value = !showThemeDropdown.value }
function selectTheme(theme: Theme) { themeStore.setTheme(theme); showThemeDropdown.value = false }
function closeThemeDropdown(e: MouseEvent) { const target = e.target as HTMLElement; if (!target.closest('.theme-switcher') && !target.closest('.locale-switcher')) showThemeDropdown.value = false }
onMounted(() => { document.addEventListener('click', closeThemeDropdown) })

async function deleteProject(projectId: string) {
  if (projectStore.projectList.length <= 1) { ElMessage.warning(t('common.keepAtLeastOne')); return }
  await projectStore.deleteProject(projectId)
  ElMessage.success(t('common.projectDeleted'))
}

function toggleLocale() {
  const newLocale: Locale = localeStore.currentLocale === 'zh' ? 'en' : 'zh'
  localeStore.setLocale(newLocale)
}
</script>

<template>
  <div class="app-layout">
    <aside class="project-sidebar">
      <div class="sidebar-header"><h1 class="app-title">Todo PM</h1></div>
      <div class="sidebar-projects">
        <div v-for="project in projectStore.projectList" :key="project.id" class="project-item" :class="{'project-item--active': projectStore.currentProjectId === project.id}">
          <div class="project-item__row">
            <div class="project-item__name" @click="selectProject(project.id)">{{ project.name }}</div>
            <button class="project-item__delete" @click.stop="deleteProject(project.id)" title="删除">&times;</button>
          </div>
          <div class="project-item__views" v-if="projectStore.currentProjectId === project.id">
            <router-link :to="getProjectView(project.id, 'mindmap')" class="view-link" :class="{'view-link--active': currentView === 'mindmap'}">{{ t('nav.mindmap') }}</router-link>
            <router-link :to="getProjectView(project.id, 'tasks')" class="view-link" :class="{'view-link--active': currentView === 'tasks'}">{{ t('nav.tasks') }}</router-link>
            <router-link :to="getProjectView(project.id, 'board')" class="view-link" :class="{'view-link--active': currentView === 'board'}">{{ t('nav.board') }}</router-link>
            <router-link :to="getProjectView(project.id, 'calendar')" class="view-link" :class="{'view-link--active': currentView === 'calendar'}">{{ t('nav.calendar') }}</router-link>
            <router-link :to="getProjectView(project.id, 'dashboard')" class="view-link" :class="{'view-link--active': currentView === 'dashboard'}">{{ t('nav.dashboard') }}</router-link>
          </div>
        </div>
      </div>
      <div class="sidebar-footer"><button class="btn-new-project" @click="showNewProjectDialog = true">+ {{ t('common.newProject') }}</button></div>
    </aside>
    <div class="app-main-wrapper">
      <header class="app-header">
        <div class="header-left">
          <span class="app-subtitle">{{ t('app.subtitle') }}</span>
          <span class="current-project-name" v-if="projectStore.currentProject">— {{ projectStore.currentProject.name }}</span>
        </div>
        <div class="header-right">
          <div class="locale-switcher">
            <button class="locale-btn" @click="toggleLocale" title="切换语言">
              {{ localeStore.currentLocale === 'zh' ? '中/EN' : 'EN/中' }}
            </button>
          </div>
          <div class="theme-switcher">
            <button class="theme-btn" @click="cycleTheme" title="主题">
              <span class="theme-dot" :style="{ background: themeStore.themes[themeStore.currentTheme]?.colors.primary }"></span>
              <span class="theme-label">{{ themeStore.themes[themeStore.currentTheme]?.label }}</span>
            </button>
            <div class="theme-dropdown" v-if="showThemeDropdown" @click.stop>
              <button v-for="theme in Object.values(themeStore.themes)" :key="theme.name" class="theme-option" :class="{'theme-option--active': themeStore.currentTheme === theme.name}" @click="selectTheme(theme.name as Theme)">
                <span class="theme-option-dot" :style="{ background: theme.colors.primary }"></span><span>{{ theme.label }}</span>
              </button>
            </div>
          </div>
        </div>
        <nav class="header-nav" v-if="projectStore.currentProjectId">
          <router-link :to="getProjectView(projectStore.currentProjectId, 'mindmap')" class="nav-link" active-class="nav-link--active">{{ t('nav.mindmap') }}</router-link>
          <router-link :to="getProjectView(projectStore.currentProjectId, 'tasks')" class="nav-link" active-class="nav-link--active">{{ t('nav.tasks') }}</router-link>
          <router-link :to="getProjectView(projectStore.currentProjectId, 'board')" class="nav-link" active-class="nav-link--active">{{ t('nav.board') }}</router-link>
          <router-link :to="getProjectView(projectStore.currentProjectId, 'calendar')" class="nav-link" active-class="nav-link--active">{{ t('nav.calendar') }}</router-link>
          <router-link :to="getProjectView(projectStore.currentProjectId, 'dashboard')" class="nav-link" active-class="nav-link--active">{{ t('nav.dashboard') }}</router-link>
        </nav>
      </header>
      <main class="app-main"><router-view /></main>
    </div>
    <Teleport to="body">
      <div v-if="showNewProjectDialog" class="dialog-overlay" @click.self="showNewProjectDialog = false">
        <div class="dialog-box">
          <h3>{{ t('common.newProject') }}</h3>
          <input v-model="newProjectName" :placeholder="t('common.projectName')" class="dialog-input" @keyup.enter="createProject" autofocus />
          <div class="template-section">
            <label class="template-label">{{ t('template.title') }}</label>
            <div class="template-grid">
              <div v-for="tpl in builtinTemplates" :key="tpl.id" class="template-card" :class="{'template-card--active': selectedTemplate === tpl.id}" @click="selectedTemplate = tpl.id">
                <div class="template-card__name">{{ tpl.name }}</div>
                <div class="template-card__desc">{{ tpl.description }}</div>
              </div>
            </div>
          </div>
          <div class="dialog-actions">
            <button class="btn-cancel" @click="showNewProjectDialog = false">{{ t('common.cancel') }}</button>
            <button class="btn-confirm" @click="createProject">{{ t('common.create') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
    <GlobalSearch />
    <QuickAdd />
  </div>
</template>

<style scoped>
.app-layout { display: flex; height: 100vh; overflow: hidden }
.project-sidebar { width: 220px; background: var(--c-bg-2); border-right: 1px solid var(--c-border); display: flex; flex-direction: column; flex-shrink: 0 }
.sidebar-header { padding: 16px; border-bottom: 1px solid var(--c-border) }
.app-title { font-size: 18px; font-weight: 600; margin: 0; color: var(--c-text) }
.sidebar-projects { flex: 1; overflow-y: auto; padding: 8px 0 }
.project-item { display: flex; flex-direction: column; padding: 8px 12px; margin: 0 8px; border-radius: 6px; cursor: default; transition: background 0.15s }
.project-item:hover { background: var(--c-surface-hover) }
.project-item--active { background: var(--c-primary-light) }
.project-item__row { display: flex; align-items: center; width: 100% }
.project-item__name { flex: 1; font-size: 14px; color: var(--c-text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer }
.project-item:hover .project-item__name { color: var(--c-text) }
.project-item--active .project-item__name { color: var(--c-primary); font-weight: 500 }
.project-item__views { display: flex; gap: 2px; margin-top: 6px; width: 100% }
.view-link { font-size: 11px; flex: 1; text-align: center; color: var(--c-text-3); padding: 3px 4px; border-radius: 4px; text-decoration: none; transition: all 0.15s; font-weight: 500 }
.view-link:hover { background: var(--c-bg-3); color: var(--c-text) }
.view-link--active { background: var(--c-primary); color: white }
.project-item__delete { background: none; border: none; color: var(--c-text-3); font-size: 16px; cursor: pointer; padding: 2px 8px; opacity: 0; flex-shrink: 0; transition: all 0.15s; border-radius: 4px }
.project-item__delete:hover { color: var(--c-danger); background: var(--c-danger-light) }
.project-item:hover .project-item__delete { opacity: 1 }
.sidebar-footer { padding: 12px; border-top: 1px solid var(--c-border) }
.btn-new-project { width: 100%; padding: 8px; background: var(--c-primary); border: none; border-radius: 6px; color: white; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s }
.btn-new-project:hover { background: var(--c-primary-hover); transform: translateY(-1px) }
.app-main-wrapper { flex: 1; display: flex; flex-direction: column; overflow: hidden }
.app-header { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 52px; background: var(--c-bg-2); border-bottom: 1px solid var(--c-border); flex-shrink: 0 }
.header-left { display: flex; align-items: center; gap: 10px }
.header-right { display: flex; align-items: center; gap: 8px }
.app-subtitle { font-size: 13px; color: var(--c-text-3); font-weight: 500 }
.current-project-name { font-size: 14px; color: var(--c-text); font-weight: 600 }
.header-nav { display: flex; gap: 6px }
.nav-link { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 14px; color: var(--c-text-2); text-decoration: none; transition: all 0.15s; font-weight: 500 }
.nav-link:hover { background: var(--c-surface-hover); color: var(--c-text) }
.nav-link--active { background: var(--c-primary-light); color: var(--c-primary) }
.app-main { flex: 1; overflow: hidden; background: var(--c-bg) }
.dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999 }
.dialog-box { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 12px; padding: 24px; min-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.5) }
.dialog-box h3 { margin: 0 0 16px; color: var(--c-text); font-size: 18px; font-weight: 600 }
.dialog-input { width: 100%; padding: 8px 12px; background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 6px; color: var(--c-text); font-size: 14px; outline: none; box-sizing: border-box }
.dialog-input:focus { border-color: var(--c-primary); box-shadow: 0 0 0 3px var(--c-primary-light) }
.dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px }
.btn-cancel, .btn-confirm { padding: 6px 16px; border-radius: 6px; border: none; font-size: 14px; font-weight: 500; cursor: pointer }
.btn-cancel { background: var(--c-bg-3); color: var(--c-text) }
.btn-confirm { background: var(--c-primary); color: white }
.btn-confirm:hover { background: var(--c-primary-hover) }
.theme-switcher { position: relative }
.theme-btn { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--c-bg-3); border: 1px solid var(--c-border); border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--c-text-2) }
.theme-btn:hover { background: var(--c-surface-hover); color: var(--c-text) }
.theme-dot { width: 12px; height: 12px; border-radius: 50% }
.theme-label { white-space: nowrap }
.theme-dropdown { position: absolute; top: calc(100% + 4px); right: 0; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 6px; padding: 6px; min-width: 130px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 100 }
.theme-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 10px; background: none; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; color: var(--c-text-2) }
.theme-option:hover { background: var(--c-surface-hover); color: var(--c-text) }
.theme-option--active { color: var(--c-primary) }
.theme-option-dot { width: 10px; height: 10px; border-radius: 50% }
.locale-switcher { position: relative }
.locale-btn { padding: 6px 12px; background: var(--c-bg-3); border: 1px solid var(--c-border); border-radius: 6px; cursor: pointer; font-size: 13px; color: var(--c-text-2); font-weight: 500 }
.locale-btn:hover { background: var(--c-surface-hover); color: var(--c-text) }
.template-section { margin: 16px 0 }
.template-label { font-size: 13px; color: var(--c-text-2); font-weight: 500; margin-bottom: 8px; display: block }
.template-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px }
.template-card { padding: 10px; background: var(--c-bg); border: 1px solid var(--c-border); border-radius: 8px; cursor: pointer; transition: all 0.15s }
.template-card:hover { border-color: var(--c-primary); background: var(--c-primary-light) }
.template-card--active { border-color: var(--c-primary); background: var(--c-primary-light) }
.template-card__name { font-size: 13px; font-weight: 600; color: var(--c-text); margin-bottom: 4px }
.template-card__desc { font-size: 11px; color: var(--c-text-3); line-height: 1.4 }
</style>

<script setup lang="ts">
/**
 * 根组件 - 左侧项目导航 + 顶部导航 + 路由视图
 */
import { onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useTaskStore } from '@/stores/task'
import { useMindmapStore } from '@/stores/mindmap'
import { useSearchStore } from '@/stores/search'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import GlobalSearch from '@/components/GlobalSearch.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()
const taskStore = useTaskStore()
const mindmapStore = useMindmapStore()
const searchStore = useSearchStore()

// 初始化全局键盘快捷键
useKeyboardShortcuts()

const showNewProjectDialog = ref(false)
const newProjectName = ref('')

onMounted(async () => {
  await projectStore.loadFromDB()
  await taskStore.loadFromDB()

  // 如果有当前项目但 store 还没设置，设置一下
  if (projectStore.currentProjectId && !taskStore.currentProjectId) {
    taskStore.currentProjectId = projectStore.currentProjectId
    mindmapStore.currentProjectId = projectStore.currentProjectId
  }

  // 如果当前路由有 projectId，同步到 store
  const routeProjectId = route.params.projectId as string
  if (routeProjectId && projectStore.currentProjectId !== routeProjectId) {
    projectStore.setCurrentProject(routeProjectId)
  }
})

// 只监听路由变化（用户主动导航时），同步项目状态
watch(() => route.params.projectId, async (projectId) => {
  if (projectId && projectId !== projectStore.currentProjectId) {
    projectStore.setCurrentProject(projectId as string)
    await taskStore.switchProject(projectId as string)
    await mindmapStore.switchProject(projectId as string)
  }
}, { immediate: true })

// 删除了 projectStore.currentProjectId 的 watch，避免自动重定向

function selectProject(projectId: string) {
  projectStore.setCurrentProject(projectId)
  // 手动导航到当前项目的导图视图
  router.push(`/project/${projectId}/mindmap`)
}

function getProjectView(projectId: string, view: string) {
  return `/project/${projectId}/${view}`
}

const currentView = ref<'mindmap' | 'tasks' | 'board' | 'dashboard'>('mindmap')

watch(() => route.name, (name) => {
  currentView.value = (name === 'Tasks' || name === 'TasksDefault') ? 'tasks' : 'mindmap'
}, { immediate: true })

async function createProject() {
  if (!newProjectName.value.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  const project = await projectStore.createProject(newProjectName.value.trim())
  newProjectName.value = ''
  showNewProjectDialog.value = false
  projectStore.setCurrentProject(project.id)
  ElMessage.success('项目创建成功')
}

async function deleteProject(projectId: string) {
  if (projectStore.projectList.length <= 1) {
    ElMessage.warning('至少保留一个项目')
    return
  }
  await projectStore.deleteProject(projectId)
  ElMessage.success('项目已删除')
}
</script>

<template>
  <div class="app-layout">
    <!-- 左侧项目导航栏 -->
    <aside class="project-sidebar">
      <div class="sidebar-header">
        <h1 class="app-title">ToDo PM</h1>
      </div>
      <div class="sidebar-projects">
        <div
          v-for="project in projectStore.projectList"
          :key="project.id"
          class="project-item"
          :class="{ 'project-item--active': projectStore.currentProjectId === project.id }"
        >
          <div class="project-item__row">
            <div class="project-item__name" @click="selectProject(project.id)">
              {{ project.name }}
            </div>
            <button
              class="project-item__delete"
              @click.stop="deleteProject(project.id)"
              title="删除项目"
            >
              ×
            </button>
          </div>
          <div class="project-item__views" v-if="projectStore.currentProjectId === project.id">
            <router-link
              :to="getProjectView(project.id, 'mindmap')"
              class="view-link"
              :class="{ 'view-link--active': currentView === 'mindmap' }"
            >
              导图
            </router-link>
            <router-link
              :to="getProjectView(project.id, 'tasks')"
              class="view-link"
              :class="{ 'view-link--active': currentView === 'tasks' }"
            >
              任务
            </router-link>
            <router-link
              :to="getProjectView(project.id, 'board')"
              class="view-link"
              :class="{ 'view-link--active': currentView === 'board' }"
            >
              看板
            </router-link>
            <router-link
              :to="getProjectView(project.id, 'dashboard')"
              class="view-link"
              :class="{ 'view-link--active': currentView === 'dashboard' }"
            >
              统计
            </router-link>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <button class="btn-new-project" @click="showNewProjectDialog = true">
          + 新建项目
        </button>
      </div>
    </aside>

    <!-- 右侧主内容 -->
    <div class="app-main-wrapper">
      <header class="app-header">
        <div class="header-left">
          <span class="app-subtitle">思维导图 + 任务管理</span>
          <span class="current-project-name" v-if="projectStore.currentProject">
            — {{ projectStore.currentProject.name }}
          </span>
        </div>
        <nav class="header-nav" v-if="projectStore.currentProjectId">
          <router-link
            :to="getProjectView(projectStore.currentProjectId, 'mindmap')"
            class="nav-link"
            active-class="nav-link--active"
          >
            思维导图
          </router-link>
          <router-link
            :to="getProjectView(projectStore.currentProjectId, 'tasks')"
            class="nav-link"
            active-class="nav-link--active"
          >
            任务列表
          </router-link>
          <router-link
            :to="getProjectView(projectStore.currentProjectId, 'board')"
            class="nav-link"
            active-class="nav-link--active"
          >
            看板
          </router-link>
          <router-link
            :to="getProjectView(projectStore.currentProjectId, 'dashboard')"
            class="nav-link"
            active-class="nav-link--active"
          >
            统计
          </router-link>
        </nav>
      </header>
      <main class="app-main">
        <router-view />
      </main>
    </div>

    <!-- 新建项目对话框 -->
    <Teleport to="body">
      <div v-if="showNewProjectDialog" class="dialog-overlay" @click.self="showNewProjectDialog = false">
        <div class="dialog-box">
          <h3>新建项目</h3>
          <input
            v-model="newProjectName"
            placeholder="项目名称"
            class="dialog-input"
            @keyup.enter="createProject"
            autofocus
          />
          <div class="dialog-actions">
            <button class="btn-cancel" @click="showNewProjectDialog = false">取消</button>
            <button class="btn-confirm" @click="createProject">创建</button>
          </div>
        </div>
      </div>
    </Teleport>
    <!-- 全局搜索对话框 -->
    <GlobalSearch />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧项目导航 */
.project-sidebar {
  width: 200px;
  background: #12122a;
  border-right: 1px solid #2d2d44;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #2d2d44;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-projects {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.project-item {
  display: flex;
  flex-direction: column;
  padding: 6px 12px;
  cursor: default;
  transition: all 0.15s;
}

.project-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.project-item--active {
  background: rgba(102, 126, 234, 0.12);
}

.project-item__row {
  display: flex;
  align-items: center;
  width: 100%;
}

.project-item__name {
  flex: 1;
  font-size: 14px;
  color: #b0b0c8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.project-item--active .project-item__name {
  color: #667eea;
  font-weight: 500;
}

.project-item__views {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  width: 100%;
}

.view-link {
  font-size: 11px;
  flex: 1;
  text-align: center;
  color: #8b8b9e;
  padding: 3px 0;
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.15s;
}

.view-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e0e0f0;
}

.view-link--active {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.project-item__delete {
  background: none;
  border: none;
  color: #f56c6c;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  opacity: 0;
  flex-shrink: 0;
}

.project-item:hover .project-item__delete {
  opacity: 1;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #2d2d44;
}

.btn-new-project {
  width: 100%;
  padding: 8px;
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 6px;
  color: #667eea;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-new-project:hover {
  background: rgba(102, 126, 234, 0.25);
}

/* 右侧主内容 */
.app-main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 48px;
  background: #1a1a2e;
  color: #fff;
  border-bottom: 1px solid #2d2d44;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.app-subtitle {
  font-size: 13px;
  color: #8b8b9e;
}

.current-project-name {
  font-size: 14px;
  color: #e0e0f0;
  font-weight: 500;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  color: #b0b0c8;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.nav-link--active {
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
}

.app-main {
  flex: 1;
  overflow: hidden;
  background: #0f0f1a;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog-box {
  background: #1e1e36;
  border: 1px solid #3a3a5c;
  border-radius: 12px;
  padding: 24px;
  min-width: 360px;
}

.dialog-box h3 {
  margin: 0 0 16px;
  color: #e0e0f0;
  font-size: 18px;
}

.dialog-input {
  width: 100%;
  padding: 10px 12px;
  background: #0f0f1a;
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  color: #e0e0f0;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.dialog-input:focus {
  border-color: #667eea;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn-cancel, .btn-confirm {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel {
  background: #2d2d44;
  color: #b0b0c8;
}

.btn-confirm {
  background: #667eea;
  color: #fff;
}
</style>

/* 移动端适配 */
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
    max-height: 60px;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }

  .sidebar.sidebar--expanded {
    max-height: 400px;
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
  }

  .toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-group {
    flex: 1;
    min-width: 120px;
  }

  .nav-tabs {
    flex-wrap: wrap;
    gap: 4px;
  }

  .nav-tab {
    flex: 1;
    min-width: 80px;
    font-size: 12px;
    padding: 8px 12px;
  }
}

/* 平板适配 */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 200px;
  }
}

/* 触摸优化 */
@media (hover: none) and (pointer: coarse) {
  button, .clickable {
    min-height: 44px;
    min-width: 44px;
  }

  .task-card, .board-card {
    min-height: 60px;
  }
}

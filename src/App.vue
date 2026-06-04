<script setup lang="ts">
/**
 * 根组件 - 顶部导航 + 路由视图
 */
import { onMounted } from 'vue'
import { useTaskStore } from '@/stores/task'

// 应用启动时从 IndexedDB 加载任务数据
const taskStore = useTaskStore()
onMounted(() => {
  taskStore.loadFromDB()
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">ToDo PM</h1>
        <span class="app-subtitle">思维导图 + 任务管理</span>
      </div>
      <nav class="header-nav">
        <router-link to="/mindmap" class="nav-link" active-class="nav-link--active">
          <el-icon><Grid /></el-icon>
          思维导图
        </router-link>
        <router-link to="/tasks" class="nav-link" active-class="nav-link--active">
          <el-icon><List /></el-icon>
          任务列表
        </router-link>
      </nav>
    </header>
    <main class="app-main">
      <router-view />
    </main>
  </div>
</template>

<script lang="ts">
import { Grid, List } from '@element-plus/icons-vue'
export default {
  components: { Grid, List },
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: #1a1a2e;
  color: #fff;
  border-bottom: 1px solid #2d2d44;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: 13px;
  color: #8b8b9e;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
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
</style>

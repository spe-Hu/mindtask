# MindTask 系统架构

## 整体架构

MindTask 采用 **Vue 3 + Pinia** 的单页应用架构，数据持久化使用 IndexedDB，桌面版本基于 Electron。

```
┌─────────────────────────────────────────────────────────┐
│                    用户界面层 (Views)                     │
│  MindMapView | TaskListView | BoardView | CalendarView   │
│                    DashboardView                         │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  组件层 (Components)                      │
│  GlobalSearch | KeyboardShortcuts | TaskDetailPanel      │
│  MarkdownEditor | QuickAdd                               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│               状态管理层 (Pinia Stores)                   │
│  taskStore | mindmapStore | localeStore | themeStore     │
│  projectStore | searchStore                              │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                  数据持久化层 (IndexedDB)                 │
│  tasks | mindmaps | projects | comments | activities     │
│  timeEntries | sections | boardColumns | tags            │
└─────────────────────────────────────────────────────────┘
```

## 核心数据流

### 1. 思维导图 ↔ 任务双向同步

```
用户操作思维导图节点
        ↓
mindmapStore 捕获节点变更事件
        ↓
调用 bindNodeToTask() 建立绑定
        ↓
taskStore 更新任务数据
        ↓
dbPut() 写入 IndexedDB
        ↓
UI 响应式更新
```

**反向流程**（任务列表修改 → 思维导图更新）：

```
用户在任务列表修改任务属性
        ↓
taskStore 更新任务数据
        ↓
触发 mindmapStore 监听器
        ↓
查找绑定的思维导图节点
        ↓
更新节点显示（标题、状态标记、优先级颜色）
        ↓
mindmapStore 保存更新后的思维导图数据
```

### 2. 多项目数据隔离

每个项目通过 `projectId` 隔离数据：

- **思维导图**：`mindmaps` 表，`projectId` 字段
- **任务**：`tasks` 表，`projectId` 字段
- **评论/活动**：关联到 `taskId`，间接隔离
- **看板列配置**：`boardColumns` 表，`projectId` 字段

路由参数 `:projectId` 决定当前上下文，Store 根据此参数过滤数据。

## Store 详细设计

### taskStore

**职责**：任务全生命周期管理

**核心状态**：
```typescript
{
  tasks: Map<string, Task>           // taskId → Task 映射
  currentProjectId: string           // 当前项目
  currentView: 'mindmap' | 'tasks' | 'board' | 'calendar' | 'dashboard'
  selectedTaskIds: Set<string>       // 多选任务
}
```

**关键方法**：
- `addTask(task)` - 创建任务，自动分配 ID，写入 IndexedDB
- `updateTask(id, updates)` - 更新任务，触发思维导图同步
- `deleteTask(id)` - 删除任务，清理关联数据（评论、活动、时间记录）
- `getTasksByProject(projectId)` - 按项目过滤任务
- `bindTaskToNode(taskId, nodeId)` - 建立任务与思维导图节点绑定

**状态流转**：
```
todo → doing → done
 ↑              │
 └──────────────┘
```

### mindmapStore

**职责**：思维导图实例管理与节点-任务绑定

**核心状态**：
```typescript
{
  mindmapInstance: SimpleMindMap | null  // SimpleMindMap 实例
  nodeToTaskMap: Map<string, string>     // nodeId → taskId
  taskToNodeMap: Map<string, string>     // taskId → nodeId
  currentProjectId: string
}
```

**关键方法**：
- `initMindMap(container)` - 初始化 SimpleMindMap 实例
- `bindNodeToTask(nodeId, taskId)` - 建立双向绑定
- `updateNodeDisplay(nodeId, task)` - 根据任务状态更新节点样式
- `saveMindMap(projectId, data)` - 保存思维导图数据到 IndexedDB

**节点样式规则**：
- **待办任务**：蓝色边框
- **进行中任务**：黄色边框 + 进度标记
- **已完成任务**：绿色边框 + 删除线
- **高优先级**：边框加粗

### localeStore

**职责**：国际化状态管理

**核心状态**：
```typescript
{
  currentLocale: 'zh' | 'en'
  messages: Record<string, Record<string, string>>  // 翻译词条
}
```

**翻译函数**：
```typescript
t(key: string): string {
  return messages[currentLocale][key] || key
}
```

**使用方式**：
```vue
<script setup>
const t = useT()
</script>
<template>
  <button>{{ t('common.save') }}</button>
</template>
```

### themeStore

**职责**：主题切换与 CSS 变量注入

**预设主题**：
1. 默认（蓝灰色调）
2. 经典（绿灰色调）
3. 深色（暗黑色调）
4. 简洁（浅灰色调）
5. 多彩（紫粉色调）
6. 森林（绿色调）
7. 日落（橙红色调）

**CSS 变量**：
```css
--c-primary      /* 主色调 */
--c-bg-1         /* 背景色 1 */
--c-bg-2         /* 背景色 2 */
--c-bg-3         /* 背景色 3 */
--c-text-1       /* 文本色 1 */
--c-text-2       /* 文本色 2 */
--c-text-3       /* 文本色 3 */
--c-border       /* 边框色 */
```

## 路由系统

### 多项目路由

```typescript
/project/:projectId/mindmap   // 项目思维导图
/project/:projectId/tasks     // 项目任务列表
/project/:projectId/board     // 项目看板
/project/:projectId/calendar  // 项目日历
/project/:projectId/dashboard // 项目统计

/mindmap                      // 默认思维导图（无项目）
/tasks                        // 默认任务列表（无项目）
/board                        // 默认看板（无项目）
/calendar                     // 默认日历（无项目）
/dashboard                    // 默认统计（无项目）
```

### 路由守卫

- 访问 `/` 重定向到 `/mindmap`
- 访问不存在的项目 ID 显示 404
- 项目切换时自动加载对应数据

## IndexedDB 数据模型

### mindmaps 表

```typescript
{
  id: string           // mindmap_${projectId}
  projectId: string    // 项目 ID
  data: {              // SimpleMindMap 数据
    root: {
      text: string
      children: Node[]
    }
  }
  updatedAt: number    // 时间戳
}
```

### tasks 表

```typescript
{
  id: string              // 唯一 ID
  projectId: string       // 所属项目
  title: string           // 标题
  description: string     // 描述（Markdown）
  status: 'todo' | 'doing' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate: string | null  // ISO 日期字符串
  assignee: string | null // 负责人
  tags: string[]          // 标签
  progress: number        // 0-100
  parentId: string | null // 父任务 ID（子任务）
  createdAt: number       // 创建时间戳
  updatedAt: number       // 更新时间戳
}
```

### projects 表

```typescript
{
  id: string           // 唯一 ID
  name: string         // 项目名称
  description: string  // 项目描述
  createdAt: number    // 创建时间戳
  updatedAt: number    // 更新时间戳
}
```

### comments 表

```typescript
{
  id: string           // 唯一 ID
  taskId: string       // 关联任务
  content: string      // 评论内容
  author: string       // 作者
  createdAt: number    // 创建时间戳
}
```

### activities 表

```typescript
{
  id: string           // 唯一 ID
  taskId: string       // 关联任务
  type: 'comment' | 'status_change' | 'priority_change' | 'assignee_change'
  content: string      // 活动描述
  createdAt: number    // 创建时间戳
}
```

### timeEntries 表

```typescript
{
  id: string           // 唯一 ID
  taskId: string       // 关联任务
  startTime: number    // 开始时间戳
  endTime: number      // 结束时间戳
  duration: number     // 持续时间（毫秒）
}
```

## 快捷键系统

### 架构分层

1. **全局快捷键**（App.vue）：`?` 显示帮助
2. **视图快捷键**（各 View 组件）：视图特定操作
3. **快捷键管理**（useKeyboardShortcuts composable）：统一注册与分发

### 快捷键冲突处理

优先级：视图快捷键 > 全局快捷键

当用户在输入框中时，所有快捷键禁用（避免干扰文本编辑）。

## Electron 集成

### 进程架构

```
┌─────────────────────────────────────┐
│         Main Process                │
│  (electron/main.js)                 │
│  - 窗口管理                         │
│  - 原生菜单                         │
│  - 应用生命周期                     │
└──────────────┬──────────────────────┘
               │ IPC
┌──────────────▼──────────────────────┐
│       Renderer Process              │
│  (Vue 应用)                         │
│  - 完整 Web 功能                    │
│  - 通过 preload.js 访问 Node API    │
└─────────────────────────────────────┘
```

### preload.js 安全模型

使用 Context Isolation，Renderer 进程无法直接访问 Node API，只能通过 `window.electronAPI` 调用预定义方法：

```typescript
window.electronAPI = {
  platform: string,
  minimize: () => void,
  maximize: () => void,
  close: () => void
}
```

## 性能优化

### 1. 虚拟滚动（任务列表）

任务列表超过 100 条时启用虚拟滚动，只渲染可见区域。

### 2. 思维导图懒加载

思维导图节点超过 50 个时，折叠深层节点，用户展开时再加载。

### 3. IndexedDB 批量写入

多个任务同时更新时，使用事务批量写入，减少 I/O 次数。

### 4. 主题切换优化

主题切换只更新 CSS 变量，不重新渲染组件，利用浏览器原生 CSS 变量机制实现零成本切换。

## 已知限制

1. **无后端**：所有数据存储在本地 IndexedDB，无法跨设备同步
2. **无用户系统**：单用户模式，无权限管理
3. **无实时协作**：不支持多人同时编辑
4. **思维导图导出**：仅支持 JSON 格式，不支持图片/PDF 导出

## 未来扩展方向

1. **云同步**：接入 Firebase / Supabase 实现跨设备同步
2. **协作模式**：WebSocket 实时协作编辑
3. **插件系统**：允许用户扩展功能
4. **移动端适配**：PWA + 响应式设计
5. **AI 辅助**：智能任务拆分、优先级建议

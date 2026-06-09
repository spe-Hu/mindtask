# MindTask - AI Agent 开发指南

## 项目概述

MindTask 是一款基于 Vue 3 + TypeScript 的思维导图任务管理应用。核心功能是将思维导图节点转换为可追踪的任务，并提供多维度视图（任务列表、看板、日历、统计）。

**技术栈**：Vue 3.5, TypeScript 6.0, Vite 8.0, Pinia 3.0, Element Plus, SimpleMindMap, Electron

**关键特性**：
- 思维导图与任务双向同步
- 多项目支持（projectId 路由隔离）
- 完整国际化（中文/英文，182+ 词条）
- 7 种主题，自动应用到所有视图
- 快捷键系统（按 `?` 查看帮助）
- IndexedDB 本地持久化
- Electron 桌面应用

## 项目结构

```
src/
├── components/          # 可复用 UI 组件
├── composables/         # Vue 组合式函数（快捷键、通知等）
├── stores/              # Pinia 状态管理（核心逻辑）
├── views/               # 页面视图（5 个主视图）
├── router/              # Vue Router 配置
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数（dateParser, db）
```

## 开发规范

### 必须遵守

1. **类型安全**：所有代码必须通过 `vue-tsc` 类型检查
   ```bash
   npm run build  # 包含类型检查
   ```

2. **国际化**：所有用户可见文本必须使用 `t()` 函数
   ```vue
   <script setup>
   const t = useT()
   </script>
   <template>
     <button>{{ t('common.save') }}</button>
   </template>
   ```
   - 新增词条必须同时添加中文和英文翻译到 `src/stores/locale.ts`

3. **主题兼容**：所有颜色必须使用 CSS 变量
   ```css
   /* ✅ 正确 */
   color: var(--c-primary);
   background: var(--c-bg-2);
   
   /* ❌ 错误 */
   color: #059669;
   background: white;
   ```

4. **数据持久化**：所有数据变更必须同步到 IndexedDB
   - 使用 `src/utils/db.ts` 中的 `dbPut`, `dbGet`, `dbDelete` 函数
   - 思维导图数据按 `projectId` 隔离存储

### 禁止事项

1. **不要硬编码文本**：所有 UI 文本必须国际化
2. **不要硬编码颜色**：所有颜色必须使用主题变量
3. **不要直接操作 DOM**：使用 Vue 响应式系统
4. **不要在组件中直接调用 IndexedDB**：通过 stores 层封装
5. **不要修改 SimpleMindMap 内部状态**：通过官方 API 操作

## 核心 Store 说明

### taskStore (src/stores/task.ts)
任务管理的核心逻辑，包含：
- 任务 CRUD 操作
- 状态流转（todo → doing → done）
- 子任务管理
- 时间追踪
- 撤销/重做

**关键方法**：
- `addTask(task)` - 添加任务
- `updateTask(id, updates)` - 更新任务
- `deleteTask(id)` - 删除任务
- `getTasksByProject(projectId)` - 获取项目任务

### mindmapStore (src/stores/mindmap.ts)
思维导图状态管理，包含：
- SimpleMindMap 实例管理
- 节点与任务的双向绑定
- 思维导图数据持久化

**关键方法**：
- `initMindMap(container)` - 初始化思维导图
- `bindNodeToTask(nodeId, taskId)` - 绑定节点到任务
- `saveMindMap(projectId, data)` - 保存数据

### localeStore (src/stores/locale.ts)
国际化状态管理，包含：
- 当前语言（zh/en）
- 翻译函数 `t(key)`
- 182+ 条翻译词条

### themeStore (src/stores/theme.ts)
主题状态管理，包含：
- 7 种预设主题
- 主题切换逻辑
- CSS 变量注入

## 路由系统

应用支持多项目，路由结构：

```typescript
// 项目上下文路由
/project/:projectId/mindmap
/project/:projectId/tasks
/project/:projectId/board
/project/:projectId/calendar
/project/:projectId/dashboard

// 默认路由（无项目上下文）
/mindmap
/tasks
/board
/calendar
/dashboard
```

**注意**：组件中获取 projectId 必须使用 `useRoute()`：
```typescript
const route = useRoute()
const projectId = route.params.projectId
```

## 添加新功能检查清单

### 添加新视图
1. 在 `src/views/` 创建视图组件
2. 在 `src/router/index.ts` 添加路由（项目上下文 + 默认）
3. 在 `src/stores/locale.ts` 添加视图名称翻译
4. 在 `src/components/KeyboardShortcuts.vue` 更新快捷键帮助（如有）

### 添加新 Store
1. 在 `src/stores/` 创建 store 文件
2. 使用 Pinia `defineStore` 定义
3. 在 `src/main.ts` 中注册（如需要全局使用）
4. 添加 TypeScript 类型定义到 `src/types/`

### 添加新组件
1. 在 `src/components/` 创建组件文件
2. 使用 `<script setup lang="ts">` 语法
3. 所有文本使用 `t()` 函数国际化
4. 所有颜色使用 CSS 变量
5. 添加 Props 类型定义

### 添加新快捷键
1. 在 `src/composables/useShortcuts.ts` 定义快捷键逻辑
2. 在 `src/components/KeyboardShortcuts.vue` 更新帮助文档
3. 在 `src/stores/locale.ts` 添加快捷键描述翻译

## 调试技巧

### 查看 Store 状态
```typescript
// 在组件中
const taskStore = useTaskStore()
console.log(taskStore.tasks)

// 在浏览器控制台（需要 Vue DevTools）
$store0.tasks  // 查看所有 store
```

### 查看 IndexedDB 数据
1. 打开浏览器开发者工具
2. Application → IndexedDB
3. 查看 `mindtask-db` 数据库

### 调试思维导图
```typescript
// 获取 SimpleMindMap 实例
const mindmapStore = useMindmapStore()
const mindmap = mindmapStore.mindmapInstance

// 调用 SimpleMindMap API
mindmap.execCommand('ADD_NODE', '新节点')
```

## 测试

### 运行 E2E 测试
```bash
npm test  # 运行所有测试
npm run test:ui  # UI 模式（可视化）
```

### 测试覆盖范围
- 思维导图基础操作
- 任务 CRUD
- 视图切换
- 国际化切换
- 主题切换
- 快捷键
- 数据持久化

## 构建与部署

### Web 版本
```bash
npm run build
# 输出到 dist/
# 部署到任何静态服务器
```

### 桌面应用
```bash
# macOS
npm run electron:build:mac
# 输出到 dist-electron/

# Windows
npm run electron:build:win

# Linux
npm run electron:build:linux
```

## 常见问题

**Q: 为什么我的文本不显示？**
A: 检查是否使用了 `t()` 函数，以及翻译词条是否存在于 `locale.ts`

**Q: 为什么颜色不随主题变化？**
A: 检查是否使用了 CSS 变量（`var(--c-primary)`），而非硬编码颜色

**Q: 数据没有保存？**
A: 检查是否调用了 `dbPut` 函数，以及 projectId 是否正确传递

**Q: 思维导图不渲染？**
A: 检查容器元素是否已挂载，以及 SimpleMindMap 实例是否正确初始化

## 相关文档

- [Vue 3 官方文档](https://vuejs.org/)
- [Pinia 状态管理](https://pinia.vuejs.org/)
- [Element Plus 组件库](https://element-plus.org/)
- [SimpleMindMap](https://github.com/wanglin2/mind-map)
- [Electron](https://www.electronjs.org/)

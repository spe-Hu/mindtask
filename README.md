# MindTask - 思维导图任务管理工具

一款基于 Vue 3 + TypeScript 的思维导图任务管理应用，支持将思维导图节点直接转换为任务，并提供看板、日历、统计等多维度视图。

## 核心特性

### 🧠 思维导图
- 基于 SimpleMindMap 的完整思维导图功能
- 4 种布局模式：逻辑结构图、思维导图、目录组织图、组织结构图
- 5 种主题风格：默认、经典、深色、简洁、多彩
- 节点自由编辑、拖拽、快捷键操作
- **方向键导航**：使用 ↑↓←→ 在节点间快速移动

### 📋 任务管理
- 将任意思维导图节点一键转换为任务
- 完整的任务属性：优先级、截止日期、负责人、标签、进度
- 5 种视图模式：
  - **思维导图**：可视化节点管理
  - **任务列表**：传统任务视图，支持筛选和排序
  - **看板**：拖拽式状态流转（待办/进行中/已完成）
  - **日历**：按时间维度查看任务
  - **统计仪表板**：任务完成率和效率分析
- 子任务支持，自动计算父任务进度
- 任务评论、时间追踪、番茄工作法

### 🌍 国际化
- **双语支持**：中文/英文完整翻译
- 右上角一键切换语言
- 182+ 条翻译词条覆盖所有 UI 文本

### 🎨 主题系统
- 7 种预设主题：午夜蓝、海洋蓝、日落橙、森林绿、薰衣草紫、珊瑚粉、石墨灰
- 主题自动应用到所有视图（思维导图、任务列表、看板等）
- 支持自定义主题色

### ⌨️ 快捷键
- 按 `?` 显示完整快捷键列表
- `Q` - 快速添加任务
- `Ctrl/Cmd + F` - 全局搜索
- `↑↓←→` - 思维导图节点导航
- `Tab` - 添加子节点
- `Enter` - 编辑节点
- `Delete` - 删除节点
- `Ctrl/Cmd + Z/Y` - 撤销/重做

### 💾 数据持久化
- IndexedDB 本地存储，数据安全
- 自动保存，无需手动操作
- 支持导入/导出 JSON 格式

### 🖥️ 桌面应用
- 基于 Electron 的跨平台桌面应用
- 支持 macOS、Windows、Linux
- 完整的原生菜单和窗口控制

## 技术栈

- **框架**：Vue 3.5 + TypeScript 6.0
- **构建工具**：Vite 8.0
- **状态管理**：Pinia 3.0
- **UI 组件库**：Element Plus 2.14
- **思维导图引擎**：SimpleMindMap 0.14
- **Markdown 渲染**：Marked 18.0
- **桌面应用**：Electron 42.3
- **测试**：Playwright 1.60

## 项目结构

```
todo-pm/
├── src/
│   ├── components/          # 可复用组件
│   │   ├── GlobalSearch.vue       # 全局搜索
│   │   ├── KeyboardShortcuts.vue  # 快捷键覆盖层
│   │   ├── MarkdownEditor.vue     # Markdown 编辑器
│   │   ├── QuickAdd.vue           # 快速添加任务
│   │   └── task/
│   │       └── TaskDetailPanel.vue # 任务详情面板
│   ├── composables/         # 组合式函数
│   │   ├── useKeyboardShortcuts.ts # 快捷键管理
│   │   ├── useNotifications.ts     # 通知系统
│   │   └── useShortcuts.ts         # 快捷键逻辑
│   ├── stores/              # Pinia 状态管理
│   │   ├── locale.ts        # 国际化 (zh/en)
│   │   ├── theme.ts         # 主题系统 (7 种主题)
│   │   ├── task.ts          # 任务管理
│   │   ├── mindmap.ts       # 思维导图
│   │   ├── project.ts       # 项目管理
│   │   └── search.ts        # 搜索功能
│   ├── views/               # 页面视图
│   │   ├── MindMapView.vue        # 思维导图视图
│   │   ├── TaskListView.vue       # 任务列表视图
│   │   ├── BoardView.vue          # 看板视图
│   │   ├── CalendarView.vue       # 日历视图
│   │   └── DashboardView.vue      # 统计仪表板
│   ├── router/              # 路由配置
│   │   └── index.ts         # 支持多项目路由
│   ├── types/               # TypeScript 类型定义
│   ├── utils/               # 工具函数
│   └── App.vue              # 根组件
├── electron/                # Electron 桌面应用
│   ├── main.js              # 主进程
│   ├── preload.js           # 预加载脚本
│   └── entitlements.mac.plist # macOS 权限
└── e2e/                     # Playwright 端到端测试
```

## 快速开始

### 开发模式

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建生产版本

```bash
# 构建 Web 版本
npm run build

# 预览构建结果
npm run preview
```

### 构建桌面应用

```bash
# 开发模式运行 Electron
npm run electron:dev

# 构建 macOS 应用
npm run electron:build:mac

# 构建 Windows 应用
npm run electron:build:win

# 构建 Linux 应用
npm run electron:build:linux
```

### 运行测试

```bash
# 运行所有 E2E 测试
npm test

# 运行特定测试
npm run test:ui  # UI 模式（可视化）
```

## 路由说明

应用支持多项目管理，路由结构如下：

- `/` - 重定向到默认思维导图视图
- `/project/:projectId/mindmap` - 项目思维导图
- `/project/:projectId/tasks` - 项目任务列表
- `/project/:projectId/board` - 项目看板
- `/project/:projectId/calendar` - 项目日历
- `/project/:projectId/dashboard` - 项目统计
- `/mindmap` - 默认思维导图（无项目上下文）
- `/tasks` - 默认任务列表（无项目上下文）
- `/board` - 默认看板（无项目上下文）
- `/calendar` - 默认日历（无项目上下文）
- `/dashboard` - 默认统计（无项目上下文）

## 数据存储

所有数据存储在浏览器本地 IndexedDB 中：

- `mindmaps` - 思维导图数据（按 projectId 隔离）
- `tasks` - 任务数据
- `projects` - 项目元数据
- `comments` - 任务评论
- `activities` - 任务活动日志
- `timeEntries` - 时间追踪记录
- `sections` - 项目分组
- `boardColumns` - 看板列配置
- `tags` - 标签配置

## 国际化

项目支持中英文双语，语言配置存储在 localStorage：

```typescript
// 切换语言
const localeStore = useLocaleStore()
localeStore.currentLocale = 'zh' // 或 'en'
```

所有 UI 文本通过 `t()` 函数翻译：

```vue
<template>
  <button>{{ t('common.save') }}</button>
</template>
```

## 主题定制

7 种预设主题，支持自定义：

```typescript
const themeStore = useThemeStore()

// 切换预设主题
themeStore.currentTheme = 'forest' // 森林绿

// 自定义主题色
themeStore.setCustomColor('primary', '#059669')
```

## 快捷键开发

快捷键系统分为三层：

1. **全局快捷键**：在 `App.vue` 中监听（如 `?` 显示帮助）
2. **视图快捷键**：在各视图组件中监听（如思维导图的 `Tab`、`Enter`）
3. **快捷键管理**：`useKeyboardShortcuts` composable 统一注册

添加新快捷键步骤：

1. 在 `composables/useShortcuts.ts` 中定义快捷键逻辑
2. 在 `components/KeyboardShortcuts.vue` 中更新帮助文档
3. 在 `stores/locale.ts` 中添加翻译词条

## 已知限制

1. **Electron 构建**：由于网络原因，Electron 打包可能超时。建议使用国内镜像：
   ```bash
   export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
   npm run electron:build:mac
   ```

2. **路径中文字符**：项目路径包含中文可能导致某些工具出错。建议移动到纯英文路径：
   ```bash
   mv /path/to/todo-pm ~/Projects/todo-pm
   ```

3. **macOS 签名**：本地测试已禁用 hardened runtime，正式发布需要配置开发者签名。

## 许可证

MIT License

## 更新日志

- **2026-06-09**：添加 Electron 桌面应用支持
- **2026-06-08**：完成中英文国际化，添加快捷键系统
- **2026-06-07**：添加看板、日历、统计视图
- **2026-06-06**：实现主题系统，统一 UI 风格
- **2026-06-05**：添加多项目管理功能
- **2026-06-04**：初始版本，思维导图 + 任务列表基础功能

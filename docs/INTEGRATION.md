# MindTask 集成指南

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 9+ 或 pnpm 8+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
# 访问 http://localhost:5174
```

### 生产构建

```bash
npm run build
# 输出到 dist/ 目录
```

## 作为静态网站部署

### 部署到 Vercel

1. 安装 Vercel CLI：
   ```bash
   npm install -g vercel
   ```

2. 部署：
   ```bash
   vercel --prod
   ```

### 部署到 Netlify

1. 安装 Netlify CLI：
   ```bash
   npm install -g netlify-cli
   ```

2. 部署：
   ```bash
   netlify deploy --prod --dir=dist
   ```

### 部署到 GitHub Pages

1. 修改 `vite.config.ts`：
   ```typescript
   export default defineConfig({
     base: '/mindtask/',  // 仓库名
     // ...
   })
   ```

2. 构建并推送：
   ```bash
   npm run build
   git add dist -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

## 作为 Electron 桌面应用

### 开发模式

```bash
npm run electron:dev
```

### 构建 macOS 应用

```bash
# 设置国内镜像（推荐，加速下载）
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 构建
npm run electron:build:mac
```

输出文件：
- `dist-electron/MindTask-darwin-arm64/MindTask.app` - 应用程序
- `dist-electron/MindTask-1.0.0-arm64.dmg` - 安装包

### 构建 Windows 应用

```bash
npm run electron:build:win
```

输出文件：
- `dist-electron/MindTask-win32-x64/` - 应用程序目录
- `dist-electron/MindTask Setup 1.0.0.exe` - 安装程序

### 构建 Linux 应用

```bash
npm run electron:build:linux
```

输出文件：
- `dist-electron/MindTask-linux-x64/` - 应用程序目录
- `dist-electron/MindTask-1.0.0.AppImage` - AppImage 格式

## 数据存储位置

### Web 版本

数据存储在浏览器 IndexedDB 中：
- 数据库名：`mindtask-db`
- 表：`mindmaps`, `tasks`, `projects`, `comments`, `activities`, `timeEntries`, `sections`, `boardColumns`, `tags`

**注意**：清除浏览器数据会丢失所有任务！

### Electron 版本

数据同样存储在 IndexedDB 中，位置：
- **macOS**: `~/Library/Application Support/MindTask/`
- **Windows**: `%APPDATA%/MindTask/`
- **Linux**: `~/.config/MindTask/`

## 导入/导出数据

### 导出 JSON

在任务列表视图，点击右上角导出按钮，选择 JSON 格式。

导出内容：
- 所有任务（含子任务）
- 思维导图数据
- 评论和活动记录
- 时间追踪记录

### 导入 JSON

在任务列表视图，点击导入按钮，选择之前导出的 JSON 文件。

**注意**：导入会覆盖现有数据，请先备份！

## 自定义主题

### 添加新主题

在 `src/stores/theme.ts` 中添加：

```typescript
const themes = {
  // ... 现有主题
  custom: {
    name: 'custom',
    label: '自定义主题',
    colors: {
      primary: '#your-color',
      bg1: '#your-bg1',
      bg2: '#your-bg2',
      bg3: '#your-bg3',
      text1: '#your-text1',
      text2: '#your-text2',
      text3: '#your-text3',
      border: '#your-border',
    }
  }
}
```

### 运行时切换主题

```typescript
const themeStore = useThemeStore()
themeStore.currentTheme = 'custom'
```

## 国际化扩展

### 添加新语言

在 `src/stores/locale.ts` 中添加：

```typescript
export type Locale = 'zh' | 'en' | 'ja'  // 添加日语

const messages: Record<Locale, Record<string, string>> = {
  zh: { /* 中文 */ },
  en: { /* 英文 */ },
  ja: { /* 日语翻译 */ }
}
```

### 添加新词条

1. 在 `locale.ts` 中添加词条：
   ```typescript
   const messages = {
     zh: {
       'newFeature.title': '新功能标题',
       'newFeature.description': '新功能描述'
     },
     en: {
       'newFeature.title': 'New Feature Title',
       'newFeature.description': 'New Feature Description'
     }
   }
   ```

2. 在组件中使用：
   ```vue
   <template>
     <h1>{{ t('newFeature.title') }}</h1>
     <p>{{ t('newFeature.description') }}</p>
   </template>
   ```

## 快捷键扩展

### 添加新快捷键

1. 在 `src/composables/useShortcuts.ts` 中添加：
   ```typescript
   const shortcuts = {
     // ... 现有快捷键
     'ctrl+shift+n': {
       handler: () => {
         // 新建任务
         taskStore.addTask({ title: '新任务' })
       },
       description: 'shortcuts.newTask'
     }
   }
   ```

2. 在 `src/stores/locale.ts` 中添加描述：
   ```typescript
   const messages = {
     zh: {
       'shortcuts.newTask': '新建任务'
     },
     en: {
       'shortcuts.newTask': 'New Task'
     }
   }
   ```

3. 在 `src/components/KeyboardShortcuts.vue` 中更新帮助文档

## 嵌入其他应用

### 作为 iframe 嵌入

```html
<iframe 
  src="https://your-domain.com/mindtask" 
  width="100%" 
  height="600px"
  frameborder="0"
></iframe>
```

### 通过 postMessage 通信

```javascript
// 父页面发送消息
iframe.contentWindow.postMessage({
  type: 'LOAD_PROJECT',
  projectId: 'proj_123'
}, '*')

// 监听 MindTask 消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'TASK_COMPLETED') {
    console.log('任务完成:', event.data.taskId)
  }
})
```

## API 集成（未来）

MindTask 当前为纯前端应用，无后端 API。未来计划提供：

1. **REST API**：任务 CRUD、项目查询
2. **WebSocket API**：实时协作
3. **Webhook**：任务变更通知

## 常见问题

**Q: 数据如何备份？**

A: 定期导出 JSON 文件，或使用浏览器开发者工具导出 IndexedDB 数据。

**Q: 能否多人协作？**

A: 当前版本不支持，所有数据存储在本地。未来版本将支持云同步和实时协作。

**Q: 如何迁移到新版？**

A: 导出旧版数据，安装新版后导入。数据结构保持向后兼容。

**Q: Electron 版本如何更新？**

A: 重新构建并替换旧版本，IndexedDB 数据会自动保留。

## 技术支持

- GitHub Issues: https://github.com/spe-Hu/mindtask/issues
- 文档: https://github.com/spe-Hu/mindtask/tree/main/docs

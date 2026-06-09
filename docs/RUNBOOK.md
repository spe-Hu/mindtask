# MindTask 运维手册

## 环境要求

### 最低配置
- **CPU**: 2 核
- **内存**: 4 GB
- **存储**: 1 GB（含 node_modules）
- **网络**: 首次安装需要网络，运行时可离线

### 推荐配置
- **CPU**: 4 核
- **内存**: 8 GB
- **存储**: 2 GB
- **网络**: 稳定的互联网连接（用于 Electron 构建）

## 部署检查清单

### Web 版本部署

- [ ] Node.js 18+ 已安装
- [ ] 依赖已安装 (`npm install`)
- [ ] 构建成功 (`npm run build`)
- [ ] `dist/` 目录已生成
- [ ] 静态文件服务器已配置
- [ ] HTTPS 证书已配置（生产环境）
- [ ] CORS 策略已配置（如需要）

### Electron 版本部署

- [ ] Node.js 18+ 已安装
- [ ] Electron 依赖已安装
- [ ] 构建成功 (`npm run electron:build:mac/win/linux`)
- [ ] 安装包已生成
- [ ] 代码签名证书已配置（正式发布）
- [ ] 自动更新服务已配置（可选）

## 启动命令

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5174
```

### 生产环境（Web）

```bash
# 构建
npm run build

# 使用静态服务器
npx serve dist -p 8080

# 或使用 nginx/apache 配置指向 dist/ 目录
```

### 生产环境（Electron）

```bash
# 构建 macOS 应用
npm run electron:build:mac

# 安装应用
open dist-electron/MindTask-1.0.0-arm64.dmg
```

## 健康检查

### Web 版本

```bash
# 检查服务是否运行
curl -I http://localhost:8080

# 检查页面加载
curl -s http://localhost:8080 | grep -q "MindTask" && echo "OK" || echo "FAIL"
```

### Electron 版本

```bash
# macOS - 检查应用是否运行
pgrep -f "MindTask" && echo "Running" || echo "Not running"

# 检查日志
tail -f ~/Library/Application\ Support/MindTask/logs/main.log
```

## 数据备份

### 手动备份

```bash
# Web 版本 - 导出 IndexedDB
# 1. 打开浏览器开发者工具
# 2. Application → IndexedDB → mindtask-db
# 3. 右键导出

# Electron 版本 - 复制数据目录
# macOS
cp -r ~/Library/Application\ Support/MindTask/ ~/backup/mindtask-$(date +%Y%m%d)/

# Windows
xcopy "%APPDATA%\MindTask" "C:\backup\mindtask-%date:~0,4%%date:~5,2%%date:~8,2%" /E /I

# Linux
cp -r ~/.config/MindTask/ ~/backup/mindtask-$(date +%Y%m%d)/
```

### 自动备份脚本

```bash
#!/bin/bash
# backup-mindtask.sh

BACKUP_DIR="$HOME/backup/mindtask"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

mkdir -p "$BACKUP_PATH"

# macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  cp -r "$HOME/Library/Application Support/MindTask/" "$BACKUP_PATH/"
fi

# Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  cp -r "$HOME/.config/MindTask/" "$BACKUP_PATH/"
fi

echo "Backup completed: $BACKUP_PATH"
```

设置定时任务（每天凌晨 2 点）：
```bash
crontab -e
# 添加：
0 2 * * * /path/to/backup-mindtask.sh
```

## 故障排查

### 问题 1: 页面空白或加载失败

**症状**：打开页面后显示空白

**排查步骤**：
1. 打开浏览器控制台（F12）
2. 查看 Console 标签页的错误信息
3. 检查 Network 标签页，确认所有资源加载成功
4. 清除浏览器缓存并刷新

**常见原因**：
- JavaScript 错误
- 资源路径错误
- CORS 问题

### 问题 2: 数据丢失

**症状**：任务或思维导图数据消失

**排查步骤**：
1. 打开浏览器开发者工具
2. Application → IndexedDB → mindtask-db
3. 检查数据是否存在
4. 如果数据为空，从备份恢复

**恢复步骤**：
```bash
# 1. 停止应用
# 2. 删除当前数据
# macOS
rm -rf ~/Library/Application\ Support/MindTask/

# 3. 从备份恢复
cp -r ~/backup/mindtask/20260609/ ~/Library/Application\ Support/MindTask/

# 4. 重启应用
```

### 问题 3: Electron 应用无法启动

**症状**：双击应用无响应或闪退

**排查步骤**：
```bash
# macOS - 从终端启动查看日志
/Applications/MindTask.app/Contents/MacOS/MindTask

# 查看日志文件
tail -f ~/Library/Application\ Support/MindTask/logs/main.log
```

**常见原因**：
- 权限问题：`chmod +x` 可执行文件
- 依赖缺失：重新安装应用
- 数据损坏：从备份恢复

### 问题 4: 构建失败

**症状**：`npm run build` 或 `npm run electron:build:mac` 失败

**排查步骤**：
1. 检查 Node.js 版本：`node -v`（需要 18+）
2. 清理缓存：`npm cache clean --force`
3. 删除 node_modules：`rm -rf node_modules package-lock.json`
4. 重新安装：`npm install`
5. 重新构建：`npm run build`

**Electron 构建特殊处理**：
```bash
# 使用国内镜像
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# 跳过签名（仅测试）
export CSC_IDENTITY_AUTO_DISCOVERY=false

# 重新构建
npm run electron:build:mac
```

## 性能监控

### Web 版本

```bash
# 使用 Lighthouse 审计
npx lighthouse http://localhost:8080 --view

# 检查性能指标
# - First Contentful Paint (FCP)
# - Largest Contentful Paint (LCP)
# - Cumulative Layout Shift (CLS)
```

### Electron 版本

```bash
# 监控内存使用
# macOS Activity Monitor → MindTask

# 使用 Chrome DevTools
# Electron 应用内按 Ctrl+Shift+I
```

## 日志管理

### Web 版本

浏览器控制台日志：
```javascript
// 开发环境 - 启用详细日志
localStorage.setItem('DEBUG', 'true')

// 生产环境 - 关闭日志
localStorage.removeItem('DEBUG')
```

### Electron 版本

日志位置：
- **macOS**: `~/Library/Application Support/MindTask/logs/`
- **Windows**: `%APPDATA%\MindTask\logs\`
- **Linux**: `~/.config/MindTask/logs/`

日志轮转：
```bash
# 手动清理旧日志
find ~/Library/Application\ Support/MindTask/logs/ -name "*.log" -mtime +30 -delete
```

## 安全建议

### Web 版本

1. **HTTPS**：生产环境必须使用 HTTPS
2. **CSP**：配置 Content Security Policy
3. **CORS**：限制跨域请求来源
4. **输入验证**：所有用户输入必须验证和转义

### Electron 版本

1. **代码签名**：正式发布必须签名
2. **沙箱模式**：启用 renderer 进程沙箱
3. **Context Isolation**：保持开启
4. **Node Integration**：保持关闭

## 更新流程

### Web 版本

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install

# 3. 构建
npm run build

# 4. 部署 dist/ 目录
rsync -avz dist/ user@server:/var/www/mindtask/
```

### Electron 版本

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 更新版本号
npm version patch  # 或 minor / major

# 3. 构建
npm run electron:build:mac

# 4. 分发安装包
# 上传到 GitHub Releases 或内部服务器
```

## 回滚流程

### Web 版本

```bash
# 1. 切换到旧版本
git checkout v1.0.0

# 2. 重新构建
npm install
npm run build

# 3. 部署
rsync -avz dist/ user@server:/var/www/mindtask/
```

### Electron 版本

```bash
# 1. 切换到旧版本
git checkout v1.0.0

# 2. 重新构建
npm install
npm run electron:build:mac

# 3. 分发旧版安装包
```

## 联系支持

- **技术问题**：查看 [INTEGRATION.md](./INTEGRATION.md)
- **架构问题**：查看 [ARCHITECTURE.md](./ARCHITECTURE.md)
- **GitHub Issues**：https://github.com/spe-Hu/mindtask/issues

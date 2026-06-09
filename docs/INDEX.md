# MindTask 文档索引

欢迎来到 MindTask 项目文档。本目录包含项目的完整技术文档，面向开发者、运维人员和未来接手的贡献者。

## 📚 文档导航

### 快速开始

如果你是第一次接触这个项目，建议按以下顺序阅读：

1. **[README.md](../README.md)** - 项目概览、功能特性、快速开始
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统架构、数据流、核心设计
3. **[INTEGRATION.md](./INTEGRATION.md)** - 集成指南、API 使用、部署方式

### 按角色阅读

#### 开发者

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 理解系统设计和数据模型
- **[INTEGRATION.md](./INTEGRATION.md)** - 学习如何调用 API 和集成
- **[../AGENTS.md](../AGENTS.md)** - 开发规范、代码组织、常见陷阱

#### 运维人员

- **[RUNBOOK.md](./RUNBOOK.md)** - 部署检查清单、故障排查、备份恢复
- **[INTEGRATION.md](./INTEGRATION.md)** - 部署方式和环境配置

#### 项目经理 / 产品经理

- **[CHANGELOG.md](./CHANGELOG.md)** - 版本历史和更新日志
- **[README.md](../README.md)** - 功能特性和用户价值

#### 新接手的 AI Agent

- **[../AGENTS.md](../AGENTS.md)** - **必读**：开发规范、禁止事项、命令速查
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 系统全貌和技术细节
- **[RUNBOOK.md](./RUNBOOK.md)** - 运维操作和故障处理

## 📖 文档详细说明

### [ARCHITECTURE.md](./ARCHITECTURE.md)

**受众**：开发者、架构师、技术负责人

**内容**：
- 系统整体架构图
- 核心数据流（思维导图 ↔ 任务双向同步）
- 多项目数据隔离机制
- Store 详细设计（taskStore、mindmapStore、localeStore、themeStore）
- IndexedDB 数据模型
- 快捷键系统架构
- Electron 集成方式
- 性能优化策略
- 已知限制和未来扩展方向

**何时阅读**：
- 首次接手项目
- 需要理解系统工作原理
- 准备添加新功能
- 排查复杂问题

### [INTEGRATION.md](./INTEGRATION.md)

**受众**：集成开发者、部署工程师、下游项目

**内容**：
- 环境要求和安装步骤
- Web 版本部署（Vercel、Netlify、GitHub Pages）
- Electron 桌面应用构建（macOS、Windows、Linux）
- 数据存储位置和备份
- 导入/导出数据
- 自定义主题和国际化扩展
- 快捷键扩展
- 嵌入其他应用（iframe、postMessage）
- 常见问题解答

**何时阅读**：
- 部署应用
- 构建桌面版本
- 集成到其他系统
- 扩展功能

### [RUNBOOK.md](./RUNBOOK.md)

**受众**：运维人员、DevOps 工程师

**内容**：
- 环境要求（最低/推荐配置）
- 部署检查清单
- 启动命令
- 健康检查
- 数据备份（手动/自动）
- 故障排查（5 个常见问题）
- 性能监控
- 日志管理
- 安全建议
- 更新和回滚流程

**何时阅读**：
- 首次部署
- 日常运维
- 处理故障
- 版本升级

### [CHANGELOG.md](./CHANGELOG.md)

**受众**：所有利益相关者

**内容**：
- 版本历史（遵循 Keep a Changelog）
- 每个版本的新增、改进、修复
- 升级指南
- 已知问题
- 未来计划

**何时阅读**：
- 了解最新功能
- 准备版本升级
- 追踪问题修复

## 🔗 相关文档

### 项目根目录

- **[README.md](../README.md)** - 项目概览和快速开始
- **[AGENTS.md](../AGENTS.md)** - AI 开发指南（规范、禁止事项、命令速查）
- **[COMPREHENSIVE_TEST_PLAN.md](../COMPREHENSIVE_TEST_PLAN.md)** - 完整测试清单

### 代码内文档

- **src/stores/** - 每个 Store 文件顶部有职责说明
- **src/composables/** - 组合式函数有 JSDoc 注释
- **src/types/** - TypeScript 类型定义有详细注释

## 📝 文档维护原则

### 更新时机

以下情况必须同步更新文档：

1. **新增功能** → 更新 ARCHITECTURE.md 和 INTEGRATION.md
2. **修改数据模型** → 更新 ARCHITECTURE.md 的 IndexedDB 数据模型
3. **新增路由** → 更新 ARCHITECTURE.md 的路由系统
4. **新增 Store** → 更新 ARCHITECTURE.md 的 Store 详细设计
5. **修改部署方式** → 更新 INTEGRATION.md 和 RUNBOOK.md
6. **发布新版本** → 更新 CHANGELOG.md
7. **发现故障** → 更新 RUNBOOK.md 的故障排查

### 文档质量检查

每次更新文档后，检查：

- [ ] 无相对时间（"今天"、"最近"、"上周"）
- [ ] 所有链接可访问
- [ ] 代码示例可运行
- [ ] 命令已验证
- [ ] 与代码一致

### 文档风格

- **面向读者**：假设读者只有 5 分钟时间
- **简洁优先**：避免冗长描述，多用代码示例
- **实用导向**：提供可直接使用的命令和代码
- **保持更新**：过时的文档比没有文档更糟糕

## 🤝 贡献文档

### 添加新文档

1. 在 `docs/` 目录创建 `.md` 文件
2. 遵循 Markdown 格式规范
3. 在本 INDEX.md 添加链接和说明
4. 提交 PR 并说明文档用途

### 修改现有文档

1. 确保修改与代码一致
2. 更新相关章节，避免遗漏
3. 检查所有链接仍然有效
4. 提交 PR 并说明修改原因

## 📞 获取帮助

- **文档问题**：在对应文档的 PR 中评论
- **技术问题**：查看 [AGENTS.md](../AGENTS.md) 的常见问题
- **运维问题**：查看 [RUNBOOK.md](./RUNBOOK.md) 的故障排查
- **GitHub Issues**：https://github.com/spe-Hu/mindtask/issues

---

**最后更新**：2026-06-09  
**维护者**：MindTask 团队

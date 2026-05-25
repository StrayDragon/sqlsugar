## Tasks

### T001: 修复临时文件清理机制

- [x] 在 `TempFileManager` 中添加 `registerCloseListener` 方法
- [x] `onDidCloseTextDocument` 触发 `cleanupTempFile`
- [x] 实现 `cleanupOnClose: false` 模式（save 后清理）
- [x] 将 `TempFileManager` 注册到 `context.subscriptions`
- [x] 添加单元测试验证清理行为

estimated: 2h
depends: none

### T002: WebView 渲染对齐

- [x] 抽取 `src/shared/nunjucks-setup.ts` 共享模块
- [x] 模块包含 `installJinjaCompat()` + 全部自定义 filter + globals
- [x] 模块导出 `buildNestedContext()` 函数
- [x] WebView 端 `jinja2-editor-v2.ts` 使用共享模块初始化 Nunjucks
- [x] 移除多余的 `<script src="nunjucks.min.js">` 标签
- [x] 添加对比测试确保两端渲染结果一致

estimated: 4h
depends: none

### T003: UI 组件拆分

- [x] 从 `jinja2-editor-v2.ts` 提取 `TemplatePanel` 组件
- [x] 从 `jinja2-editor-v2.ts` 提取 `VariableEditor` 组件
- [x] 从 `jinja2-editor-v2.ts` 提取 `SQLPreview` 组件（复用已有 `sql-preview-v2.ts`）
- [x] 从 `jinja2-editor-v2.ts` 提取 `Toolbar` 组件
- [x] 定义组件间通信接口（事件/属性）
- [x] 集成已有的 `variable-popover.ts` 和 `keyboard-navigation-manager.ts`
- [x] 确保拆分后功能与现有行为一致

estimated: 8h
depends: T002

### T004: 测试覆盖率提升

- [x] 补充 `temp-file-manager` 单元测试（含清理流程）
- [x] 补充 `language-handler` 边界情况测试
- [x] 补充推断系统全分支覆盖测试
- [x] 补充 `sqlalchemy.ts` 占位符处理测试
- [x] 恢复 CI 测试步骤并确保通过
- [x] 达到整体 50%→80% 覆盖率目标

estimated: 6h
depends: T001, T002

### T005: Provider 架构基础

- [x] 定义 `src/core/provider-registry.ts` 接口
- [x] 实现 `LanguageProvider` 接口定义
- [x] 实现 `InferenceProvider` 接口定义
- [x] 创建 `LanguageHandlerAdapter` 包装现有 LanguageHandler
- [x] 创建 `PatternInferenceAdapter` 包装现有推断逻辑
- [x] 在 `extension.ts` 中双写注册（DI + Registry）
- [x] 添加 Provider 注册和查找的单元测试

estimated: 6h
depends: T004

### T006: JS/TS 引号升级

- [x] 实现 `selectJavaScriptQuote` 多行自动升级为模板字面量
- [x] 实现 `selectTypeScriptQuote` 同步逻辑
- [x] 处理 `${...}` 内容的转义
- [x] 添加单元测试

estimated: 2h
depends: none

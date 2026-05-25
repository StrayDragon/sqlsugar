## Why

当前 SQLSugar v0.1.0 存在多个已知问题影响可靠性和可维护性：临时文件清理机制未接线、WebView 渲染与 Extension 端不一致、UI 单体组件 2780 行难以扩展、测试覆盖率极低且 CI 中测试被禁用。这些问题如果不解决，后续新功能的开发将在不稳定的基础上进行，技术债务会指数增长。

## What Changes

- 修复临时文件清理：接入 `onDidCloseTextDocument` hook 使配置项 `tempFileCleanup` 和 `cleanupOnClose` 实际生效
- WebView 渲染对齐：WebView 端 Nunjucks 环境加载 `installJinjaCompat()` + 全部自定义 filter + `buildNestedContext()`
- UI 组件拆分：将 `jinja2-editor-v2.ts` 单体拆分为 `TemplatePanel`、`VariableEditor`、`SQLPreview`、`Toolbar` 独立 Lit 组件
- 测试体系建设：达到整体 80%、推断系统 90% 的覆盖率；启用 CI 测试步骤
- Provider 架构准备：设计并实现基础 `ProviderRegistry`、`LanguageProvider`、`InferenceProvider` 接口，从现有 DI 容器平滑迁移
- JS/TS 引号升级：实现多行内容时自动升级为模板字面量

## Non-Goals

- 不引入新的用户可见功能
- 不改变现有 API 和配置项的行为
- 不引入新的运行时依赖

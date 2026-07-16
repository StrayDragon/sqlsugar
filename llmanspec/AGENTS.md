# llmanspec AGENTS.md

此文件由根目录的 `AGENTS.md` 托管块引用。可在此添加项目特定的规则、
上下文或约定，以便 AI 代理遵守。

<!-- 在此行下方添加你的规则 -->

## 项目上下文

项目: SQLSugar - VS Code 扩展，提供内联 SQL 编辑和 Jinja2 模板可视化处理
技术栈: TypeScript, Lit (WebView UI), esbuild, Vitest, Nunjucks, pnpm
目标定位: 全能型 SQL 开发辅助平台（嵌入式 SQL 专家 + 轻量 SQL 工作台 + 模板平台 + AI 助手）
架构模式: 双构建目标 (CJS extension + ESM webview), DI 容器, Feature 模块化, Provider 注册模式(规划中)

## Artifact 规则

- proposal: 必须说明与现有功能的关系
- tasks: 必须包含可验证的完成标准

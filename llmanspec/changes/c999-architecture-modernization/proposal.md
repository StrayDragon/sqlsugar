## Why

随着功能扩展，SQLSugar 需要从 VS Code 扩展进化为跨编辑器 SQL 开发平台。LSP 抽取让 Neovim、JetBrains 等编辑器也能受益；CLI 工具让 SQL 质量控制进入 CI/CD；插件文档和 Extension API 让社区参与成为可能。这个阶段是从产品到平台的转变。

## What Changes

- LSP 抽取：将 SQL intelligence 核心逻辑抽取为独立 Language Server Protocol 服务
- CLI 工具：`sqlsugar lint`、`sqlsugar format`、`sqlsugar test` 用于 CI/CD
- 完整的 Provider 接口文档和插件开发指南
- 公开 VS Code Extension API（contributes 扩展点）
- 实时双向同步：inline-sql 临时文件与源文件实时同步（不仅限保存时）
- 多语言扩展：通过 LanguageProvider 接口支持 Go/Rust/Java/Ruby 等
- Monaco Editor 集成：可视化编辑器中使用 Monaco 替代纯文本
- 可拖拽多面板布局

## Non-Goals

- 不独立发布 LSP server 到 npm（初版随扩展分发）
- 不实现自己的语法高亮引擎（复用 TextMate grammars）
- 不构建 Web 版独立编辑器

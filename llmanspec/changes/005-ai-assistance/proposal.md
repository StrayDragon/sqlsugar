## Why

AI 能力能显著降低 SQL 编写门槛。自然语言转 SQL 让非 SQL 专家也能快速生成查询；SQL 解释帮助理解遗留代码；优化建议帮助写出更高效的查询。通过 Provider 抽象适配多种 AI 后端（VS Code LM API、Ollama 本地模型等），用户可按需选择，兼顾便利性和隐私。

## What Changes

- 实现 `AIProvider` 抽象接口，支持流式输出
- 内置 VS Code Language Model API Provider（零配置、与用户现有 Copilot 等整合）
- 内置 Ollama Provider（本地模型、完全离线）
- 自然语言 → SQL 生成：输入描述 + 可选 schema 上下文 → 生成 SQL
- SQL 解释：选中 SQL → Hover/CodeLens 展示自然语言解释
- 优化建议：分析查询结构建议索引、重写、分页策略
- AI 增强的变量类型推断：分析代码上下文修正名称模式推断
- 多轮对话支持：基于前序查询持续优化
- 隐私控制：用户可选择发送给 AI 的信息范围
- 在 Jinja2 可视化编辑器中增加 AI 辅助输入框

## Non-Goals

- 不训练自有模型
- 不存储用户代码或查询
- 不强制要求 AI 功能（所有 AI 功能可完全禁用）

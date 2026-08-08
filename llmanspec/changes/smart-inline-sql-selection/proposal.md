---
depends_on: []
---

# 智能选区：光标扩选字符串与引号容错

## Why

两大命令当前强制非空选区（`Please select SQL text`）。多行三引号 / 模板字符串手选容易少选或多选引号；`looksLikeSQL` 误判时弹 modal 劝退。这是每天最高频的摩擦，也是「好用」的最大门槛。

与现有功能关系：增强 Inline SQL 与 Templated SQL 的**触发前置**（LanguageHandler / 命令入口），不改保存回写与 WebView 渲染核心。

## What Changes

- 光标位于字符串字面量内且选区为空时，自动扩选到完整 SQL 字面量内容（可配置是否含引号）
- 选区多含/少含引号、前缀（`f`/`r`/`b`/`fr` 等）时自动归一，避免回写破坏源码
- 改进「不像 SQL」提示：非阻塞、可一键继续，减少 modal 打断
- 覆盖 Python 三引号 / f-string、JS/TS 模板字符串的扩选边界
- 与右键 `editorHasSelection` 菜单策略协调（空选区时仍可通过命令/快捷键触发）

## Capabilities

1. **光标扩选**：当活动编辑器选区为空且光标在支持的字符串字面量内时，系统 MUST 自动扩选到该字面量的 SQL 内容后再进入编辑流程
2. **引号容错**：系统 MUST 在选区意外包含或遗漏引号/语言前缀时纠正边界，保证回写引号样式正确
3. **温和校验**：系统 SHOULD 在 `looksLikeSQL` 失败时使用非强制打断的确认，而非仅依赖 modal 阻断
4. **语言覆盖（首期）**：系统 MUST 至少支持 Python 与 JavaScript/TypeScript 的常见字面量形态

## Impact

- 触及：`src/features/inline-sql/`（command-handler、language-handler）、Templated SQL 命令入口选区逻辑、测试
- 风险：中；错误扩选可能编辑到非 SQL 字符串——需明确边界规则与回退
- 不改：临时文件路径、WebView UI
- 建议与 `improve-discovery-onboarding` 同波体验验收，但代码可独立合入

---
depends_on:
- fix-array-tuple-sql-literal-rendering
branch: sdd/templated-editor-workflow-closure
base_sha: 76f8c45f6585753c8c494cd93a8ce4cba51580b3
checkpointed: true
checkpoint_sha: 76f8c45f6585753c8c494cd93a8ce4cba51580b3
---

# Templated 编辑器工作流闭环：统一入口、写回与复制

## Why

今日路径割裂：含 Jinja2 时开 WebView；纯 `:param`（SQLAlchemy-only）走 InputBox 逐个填再直接复制。命令名暗示 Copy，实际常是编辑；编辑结果主要进剪贴板，**无法写回源选区模板或替换为渲染 SQL**，调试闭环断开。

与现有功能关系：落实/强化 `R-J2E-019`（单一可视化入口）精神，扩展写回与复制动作；依赖 `fix-array-tuple-sql-literal-rendering`，避免闭环后仍因列表字面量渲染错误导致「写回也是错的」。

## What Changes

- 纯 SQLAlchemy / 仅参数占位符场景也统一进入 WebView（移除或降级 InputBox 主路径）
- 工具栏动作明确拆分：「复制渲染 SQL」「复制模板」「写回源选区（模板）」；可选「用渲染结果替换选区」
- 复制成功反馈短、可撤销提示；失败信息可操作（如安装 wl-clipboard）
- 命令标题/文档与 `improve-discovery-onboarding` 对齐（本 change 负责行为闭环，命名可协作）

## Capabilities

1. **单一可视化入口**：系统 MUST 对 Jinja2、混合模板与纯参数占位符模板统一打开可视化编辑器，不得以 InputBox 作为主路径
2. **写回源选区**：系统 MUST 支持将当前模板（用户编辑后）写回触发命令时的源选区
3. **渲染结果替换（可选动作）**：系统 SHOULD 支持用渲染后的 SQL 替换源选区（显式用户动作，防误触）
4. **复制动作可区分**：系统 MUST 区分「复制渲染结果」与「复制模板原文」，并给出明确成功反馈

## Impact

- 触及：`command-handler.ts`、webview 消息协议、toolbar UI、可能的 TextEditor 写回
- 风险：中；写回需处理缩进/引号（可复用 LanguageHandler）；替换渲染 SQL 会丢模板——必须二次确认
- 依赖：建议先合入数组/元组字面量修复，再验收本闭环
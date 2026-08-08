---
depends_on: []
branch: sdd/improve-discovery-onboarding
base_sha: 76f8c45f6585753c8c494cd93a8ce4cba51580b3
checkpointed: false
---

# 发现与上手：快捷键、引导与命令命名

## Why

新用户装完扩展后很难发现两大能力：必须先选中文本，右键菜单才出现；无默认快捷键；命令名 `Copy To Templated SQL (Editor)` 听起来像「直接复制」却打开编辑器；`displayName`/`categories` 不利于 Marketplace 搜索。日常用户靠肌肉记忆触发的路径缺失，导致功能「有但用不上」。

与现有功能关系：不改变 Inline SQL / Templated SQL 的核心编辑与渲染语义，只改善触发、命名与首次引导。

## What Changes

- 为 `sqlsugar.editInlineSQL` / `sqlsugar.copyTemplatedSql` 提供默认可覆盖快捷键（`keybindings` contribute）
- 增加 VS Code Walkthrough（或一次性状态栏/通知引导），说明两步工作流
- 重命名命令标题，对齐真实行为（如 Open Templated SQL Editor）；统一中英提示文案策略
- 调整 `package.json` 元数据：`displayName`、`categories`、简短 description，便于发现
- 可选：命令面板分类 / 菜单分组微调（仍要求选区的约束留给 `smart-inline-sql-selection`）

## Capabilities

1. **默认可发现触发**：系统 MUST 为两大主命令贡献默认可覆盖的键盘快捷键
2. **首次引导**：系统 MUST 提供 Walkthrough 或等价首次引导，说明 Inline SQL 与 Templated SQL 各自用途与触发方式
3. **命令命名对齐行为**：系统 MUST 使用不暗示「仅复制」的命令标题描述 Templated SQL 编辑器入口
4. **扩展元数据可发现**：系统 SHOULD 使用可读 `displayName` 与更合适的 Marketplace categories

## Impact

- 触及：`package.json` contributes、可能新增 walkthrough 资源、少量文案
- 不改：选区算法、临时文件、渲染引擎
- 风险：低；快捷键冲突需选用较少占用的组合并允许用户改
- 后续：与 `smart-inline-sql-selection` 叠加后「零选区触发」体验更完整
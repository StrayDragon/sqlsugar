# Future — refactor-rename-to-templated-sql-editor

本变更刻意收敛在「编辑器实体层」重命名。以下为「逐步优化代码和逻辑流程」的候选后续工作。

## now

（暂无；待本 change apply 并验证后评估。）

## later

- **目录迁移**（建议后续 change `refactor-move-templated-sql-dir`）：`src/features/jinja2/` → `src/features/templated-sql/`，含 vitest 别名 `@jinja2/` → `@templated-sql/`、全量 import 路径、测试 fixtures。
  - 触发信号：本 change 已合入且稳定；准备一次性大 diff。
- **引擎/处理层类名重命名**（建议后续 change `refactor-engine-naming`）：评估 `Jinja2NunjucksHandler` / `Jinja2NunjucksProcessor` / `Jinja2Variable` 是否改名。注意 Jinja2/Nunjucks 是真实技术栈名，重命名需权衡信息量损失。
  - 触发信号：与目录迁移同步进行，避免两次大 diff。
- **mode 清理**（建议后续 change `remove-legacy-editor-modes`）：删除未接线的 `quick` / `wizard` / `defaults` 分支与相关 dead code；`mode` 枚举简化。
  - 触发信号：确认无外部 / 测试依赖这些分支。
- **SDD spec capability 改名**：`jinja2-visual-editor` → `templated-sql-editor`（main spec 目录迁移；SDD 无 rename-capability op，需手工移动 + 重建 baseline）。
  - 触发信号：目录迁移完成后，保持 spec id 与代码目录一致。
- **dist 清理**：移除历史 `dist/jinja2-editor-v2/`。
  - 触发信号：新构建产物稳定后。

## drop

（暂无。）

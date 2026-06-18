# remove-legacy-editor-modes

## Why

`src/features/jinja2/command-handler.ts` 的 `handleCopyTemplatedSql(mode)` 声明支持 `quick / wizard / webview / defaults` 四种模式，但 `index.ts` 只把 `webview` 接到命令 `sqlsugar.copyTemplatedSql` 上。`quick/wizard/defaults` 是早于可视化编辑器的遗留非可视化路径（默认值渲染复制 / QuickPick），现：

- 无任何调用方（唯一入口 `index.ts` 恒传 `'webview'`）；
- 无测试引用（已核实 `src/test`、`src/tests`）；
- 属 dead code。

它们让命令处理流程"看起来多模式、实为单模式"，与"逐步优化代码和逻辑流程"相悖。来源：已归档变更 `refactor-rename-to-templated-sql-editor` 的 `future.md` 候选项 A。

## What Changes

- `handleCopyTemplatedSql` / `processTemplate` 去掉 `mode` 参数（唯一入口即 webview）。
- 删除 `processTemplate` 中的 `switch(mode)` 与 `quick/wizard/defaults` case，直接调用 `handleWebviewMode`。
- 删除私有方法 `handleQuickMode` / `handleWizardMode` / `handleDefaultsMode`。
- 删除仅被上述死分支使用的辅助方法：`getDefaultValues`、`promptForVariable`、`formatDefaultValue`（已核实无其他引用，详见 `design.md`）。
- 保留：`handleWebviewMode`（唯一可视化入口）、`handleSQLAlchemyOnly`（纯 SQLAlchemy 占位符时的交互 QuickPick，非 mode）、`copyToClipboard*`、`promptForSQLAlchemyVariable`、`extractVariables` 等公共/共享方法。

## Capabilities

- `jinja2-visual-editor`：新增 `R-J2E-019`（单一可视化入口，移除遗留模式）。

## Impact

- 代码：仅 `src/features/jinja2/command-handler.ts`（净删减约 200 行 dead code）与 `src/features/jinja2/index.ts`（去实参）。
- 行为：无变化（被删分支从未被调用）。
- 用户/外部：无（命令 ID、配置、UI 均不变）。

## 与现有功能的关系（rules.proposal）

是已归档变更 `refactor-rename-to-templated-sql-editor` 的后续"逐步优化"。R-J2E-003（可视化编辑器）等既有需求不受影响；R-J2E-018（编辑器实体命名）已确立 webview 为唯一产品入口，本变更是其在代码层的清理落实。引擎层（`Jinja2NunjucksHandler` 类名等）仍不动，留待 `future.md` B。

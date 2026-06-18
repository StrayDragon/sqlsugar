# refactor-rename-to-templated-sql-editor

## Why

代码库中 `jinja2` 一词同时承担两个不同含义且未做区分，导致「Jinja2 Template Editor V2」这个编辑器产品实体定位混乱：

1. **模板引擎技术**（合理保留）：`jinja2-patterns.ts`、`Jinja2NunjucksProcessor`、`Jinja2Variable`、Nunjucks 渲染流水线 —— 描述「用什么语法渲染」的实现细节。
2. **编辑器产品实体**（定位混乱的来源）：`Jinja2EditorV2`、`jinja2-editor-v2`、`sqlsugar.jinja2EditorV2`、`sqlsugar.v2Editor.*`、命令标题 `Copy Jinja2 Template SQL (Visual Editor)`、README 中的 `Jinja2 Editor V2`。

产品名直接挂在引擎技术名上，使「它到底是个 Jinja2 工具，还是个 SQL 编辑器」语义模糊。将产品实体升级为 **Templated SQL Editor**，把产品名与底层 Jinja2/Nunjucks 引擎名解耦：产品叫 Templated SQL Editor，引擎仍是 Jinja2/Nunjucks。

## What Changes

将「编辑器产品实体」的命名统一改为 Templated SQL Editor，覆盖命令 ID、配置键、视图类型、UI 标题、组件标识符与文档展示名。**硬切重命名，不保留旧别名**（已与用户确认）。核心渲染逻辑不变。

重命名映射（细节见 `design.md`）：

| 类别 | 旧 | 新 |
|---|---|---|
| 命令 ID | `sqlsugar.copyJinja2Template` | `sqlsugar.copyTemplatedSql` |
| 命令标题 | `SQLSugar: Copy Jinja2 Template SQL (Visual Editor)` | `SQLSugar: Copy To Templated SQL (Editor)` |
| 视图类型 | `sqlsugar.jinja2EditorV2` | `sqlsugar.templatedSqlEditor` |
| 配置段 | `sqlsugar.v2Editor.*`（8 键） | `sqlsugar.templatedSqlEditor.*` |
| 编辑器类 | `Jinja2EditorV2` | `TemplatedSqlEditor` |
| 预览类 | `SqlPreviewV2` | `TemplatedSqlPreview` |
| 配置类 | `V2EditorConfig` | `TemplatedSqlEditorConfig` |
| Webview App | `SqlsugarWebviewV2App` | `TemplatedSqlWebviewApp` |
| Webview 宿主 | `Jinja2WebviewEditorV2` | `TemplatedSqlWebviewEditor` |
| UI 原子 | `V2Button`/`V2Input`/`V2Select` | `TseButton`/`TseInput`/`TseSelect` |
| element tag | `jinja2-editor-v2` / `sql-preview-v2` / `sqlsugar-webview-v2-app` | `templated-sql-editor` / `templated-sql-preview` / `sqlsugar-templated-sql-app` |
| mode 枚举 | `'webviewV2'` | `'webview'` |
| 展示名 | `Jinja2 Template Editor V2` / `Jinja2 V2 Template Editor` | `Templated SQL Editor` |
| 构建产物 | `jinja2-editor-v2`（esbuild 入口/输出） | `templated-sql-editor` |
| 类型 | `EditorV2Config` / `EditorV2State` / `*EventV2` / `CompleteEditorV2Config` | 去掉 `V2`，归入 `TemplatedSqlEditor*` |

**不在本次范围（显式保留，登记于 `future.md`）**：

- 代码目录 `src/features/jinja2/` → `src/features/templated-sql/`
- 引擎/处理层类名：`Jinja2NunjucksHandler`、`Jinja2NunjucksProcessor`、`Jinja2Variable`、`Jinja2Analyzer`、`jinja2-patterns.ts`
- SDD spec capability id `jinja2-visual-editor` → `templated-sql-editor`
- 未接线的遗留 mode 分支 `quick` / `wizard` / `defaults` 清理
- `dist/` 历史产物清理

## Capabilities

- `jinja2-visual-editor`：新增需求 `R-J2E-018`（编辑器实体命名）。现有 15 条需求描述的是引擎/编辑器行为，本次不改其行为语义。

## Impact

- **用户（破坏性）**：命令 ID 与配置键硬切。已绑定 `sqlsugar.copyJinja2Template` 的快捷键、`sqlsugar.v2Editor.*` 的用户设置将失效，需迁移到新名。无迁移别名（已确认）。README 将给出迁移说明。
- **代码**：编辑器 UI 层（`src/features/jinja2/ui/`、`webview.ts`、`command-handler.ts` 的 webview 分支、`index.ts` 命令注册、`esbuild.js` 入口）标识符重命名；引擎处理层不动。
- **文档**：README、`src/features/jinja2/ui/README.md` 展示名更新。
- **构建**：esbuild 的 webview 入口/输出名调整；旧 `dist/jinja2-editor-v2/` 由后续清理。

## 与现有功能的关系（rules.proposal）

本次变更是 `jinja2-visual-editor` capability 所述**同一个可视化编辑器产品**的命名/再定位，不改变其渲染逻辑、变量推断、SQL 预览、剪贴板复制等既有行为（R-J2E-001..017 不受影响），仅新增 R-J2E-018 约束产品实体命名。命名解耦后，引擎仍为 Jinja2/Nunjucks，保留在处理层；产品层独立为 Templated SQL Editor，为后续「逐步优化代码和逻辑流程」（目录迁移、mode 清理、handler/processor 重命名）铺路。

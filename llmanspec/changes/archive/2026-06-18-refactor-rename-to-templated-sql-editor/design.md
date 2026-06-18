# Design — refactor-rename-to-templated-sql-editor

## 设计原则：产品名与引擎名解耦

- **产品层（Templated SQL Editor）**：用户感知的编辑器实体 —— 命令、配置、视图、UI 组件、文档。本次全部重命名。
- **引擎层（Jinja2/Nunjucks）**：模板解析/渲染/变量提取的实现细节。本次保留原名，留待后续优化。

边界清晰后，未来即使引擎从 Nunjucks 换成别的实现，产品名 Templated SQL Editor 也不必再改。

## 权衡：为何硬切不留别名

已与用户确认采用硬切（直接用新名，不保留 `copyJinja2Template` / `v2Editor.*` 别名）。理由：

- 项目处于活跃早期迭代（见 git 历史，主题/高亮仍在频繁调整），用户基数小，别名维护成本 > 兼容收益。
- 别名会让「旧名/新名并存」延续定位混乱，与本次解耦目标相悖。
- 迁移影响面已明确：仅命令 ID + 8 个配置键，README 给出迁移说明即可。

## 权衡：为何本次不迁移目录与引擎类名

- 目录迁移 `src/features/jinja2/` → `templated-sql/` 涉及全量 import 路径与测试别名（vitest `@jinja2/`），改动大、diff 噪声高，与「逐步优化」节奏冲突。
- 引擎类名（`Jinja2NunjucksProcessor` 等）描述的是真实技术栈，保留无歧义；强行改名反而损失信息量。
- 这些项登记在 `future.md`，作为后续独立 change 推进。

## 边界细则

- `Jinja2NunjucksHandler`（command-handler.ts）：**保留**。它是命令处理与处理流水线编排入口，引擎属性强；命令 ID 虽改为 `copyTemplatedSql`，handler 类名暂不动。其 webview 分支内的展示标题字符串会更新。
- `Jinja2WebviewEditorV2`（webview.ts）：**重命名** → `TemplatedSqlWebviewEditor`。它是 webview 编辑器宿主，属产品实体层。
- mode 枚举 `'webviewV2'` → `'webview'`：唯一被 index.ts 接线的 mode；其余 `quick` / `wizard` / `defaults` 为未接线遗留分支，本次仅改字面量标识，不删分支（留待 mode 清理 change）。
- UI 原子组件 `V2Button/Input/Select` → `TseButton/Input/Select`（Tse = Templated Sql Editor）。该前缀为次要命名选择，如偏好其他前缀可在 apply 阶段微调。

## 历史点核查（V1）

代码中无并存的 V1 webview 类。`webviewV2` 的「V2」仅为版本标记；`quick/wizard/defaults` 是早于 webview 的非可视化遗留路径，已不接线。故本次重命名无 V1 兼容顾虑。

## 迁移说明（写入 README）

- 命令：`SQLSugar: Copy Jinja2 Template SQL (Visual Editor)` → `SQLSugar: Copy To Templated SQL (Editor)`；命令 ID `sqlsugar.copyJinja2Template` → `sqlsugar.copyTemplatedSql`。需重新绑定快捷键。
- 配置：`sqlsugar.v2Editor.*` → `sqlsugar.templatedSqlEditor.*`（8 键，键名不变，仅段名变）。需更新 settings.json。

## 验证标准

- 残留检查（处理层保留项除外）无命中：
  ```bash
  rg -n "copyJinja2Template|sqlsugar\.v2Editor|jinja2-editor-v2|jinja2EditorV2|Jinja2EditorV2|SqlPreviewV2|V2EditorConfig|SqlsugarWebviewV2App|webviewV2" src package.json esbuild.js
  ```
- `pnpm run check-types` 通过。
- `pnpm test` 通过。
- `just spec-validate` 通过。

## 实施备注（apply 阶段实际落地的命名）

apply 时为消解重命名碰撞并完成再定位，相对上表做了如下调整（均已通过校验）：

- **Config 类/接口碰撞**：原表写 `V2EditorConfig→TemplatedSqlEditorConfig`。实际：接口（原 `EditorV2Config`，配置形状，多处用作类型）保留清洁名 `TemplatedSqlEditorConfig`；管理器类（原 `V2EditorConfig`）改为 `TemplatedSqlEditorConfigManager`（仅自引用 + barrel 导出，无外部调用）。
- **TemplateRenderEvent 碰撞**：原「去 V2」使 `TemplateRenderEventV2` 与无外部引用的基接口 `TemplateRenderEvent` 撞名自引用。实际：删除该死基接口，字段并入唯一的 `interface TemplateRenderEvent`。
- **handler 方法**：类 `Jinja2NunjucksHandler` 保留；其命令入口方法 `handleCopyJinja2Template→handleCopyTemplatedSql`（与新命令 ID 一致），随 `copyJinja2Template→copyTemplatedSql` token 一并完成。
- **额外清理（实体层，确保 R-J2E-018）**：webview↔editor 消息协议 `V2_EDITOR_*→TSE_EDITOR_*`、全局 API `initializeV2Editor→initializeTemplatedSqlEditor`、`mode 'webviewV2'→'webview'`，以及注释/日志/配置描述/面板标题中的 "V2 editor / V2 Jinja2 Visual Editor / Jinja2 V2 模板编辑器" → Templated SQL Editor。
- **引擎层确实未动**：`Jinja2NunjucksHandler`(类) / `Jinja2NunjucksProcessor` / `Jinja2Variable` / `Jinja2Analyzer` / `jinja2-patterns.ts` / 目录 `src/features/jinja2/` 全部保留，留待 future.md 中的后续 change。

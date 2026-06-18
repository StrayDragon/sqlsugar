## Tasks

> 范围：编辑器产品实体层重命名为 Templated SQL Editor，硬切无别名。
> 引擎层（processor / Jinja2Variable / handler / 目录 / spec id）保留，见 future.md。

### T001: package.json（命令 + 配置键）

- [x] 命令 ID `sqlsugar.copyJinja2Template` → `sqlsugar.copyTemplatedSql`
- [x] 命令标题 → `SQLSugar: Copy To Templated SQL (Editor)`
- [x] menus 中命令引用同步
- [x] 配置段 `sqlsugar.v2Editor.*`（popoverPlacement / highlightStyle / autoPreview / keyboardNavigation / animationsEnabled / showSuggestions / autoFocusFirst / scrollSyncEnabled）→ `sqlsugar.templatedSqlEditor.*`

estimated: 1h
depends: none

### T002: 命令注册与处理入口

- [x] `src/features/jinja2/index.ts`：注册命令 ID 改 `sqlsugar.copyTemplatedSql`
- [x] `command-handler.ts`：mode 枚举 `'webviewV2'` → `'webview'`（含类型联合与 switch 分支、`handleWebviewV2Mode` 调用）；webview 分支标题字符串 `V2 Jinja2 Template:` → `Templated SQL Editor:`

estimated: 1h
depends: T001

### T003: Webview 宿主与配置读取

- [x] `webview.ts`：类 `Jinja2WebviewEditorV2` → `TemplatedSqlWebviewEditor`；view type `sqlsugar.jinja2EditorV2` → `sqlsugar.templatedSqlEditor`；配置段读取 `'sqlsugar.v2Editor'` → `'sqlsugar.templatedSqlEditor'`

estimated: 1h
depends: T002

### T004: UI 组件层（src/features/jinja2/ui/）

- [x] `components/jinja2-editor-v2.ts` → 文件名 `templated-sql-editor.ts`；类 `Jinja2EditorV2` → `TemplatedSqlEditor`；tag `jinja2-editor-v2` → `templated-sql-editor`；title 属性 → `Templated SQL Editor`
- [x] `components/sql-preview-v2.ts` → `templated-sql-preview.ts`；类 `SqlPreviewV2` → `TemplatedSqlPreview`；tag `sql-preview-v2` → `templated-sql-preview`
- [x] `webview-app.ts`：类 `SqlsugarWebviewV2App` → `TemplatedSqlWebviewApp`；tag `sqlsugar-webview-v2-app` → `sqlsugar-templated-sql-app`；title prop 同步
- [x] `components/ui/{button,input,select}.ts`：`V2Button` / `V2Input` / `V2Select` → `TseButton` / `TseInput` / `TseSelect`
- [x] `config/v2-editor-config.ts` → `templated-sql-editor-config.ts`；类 `V2EditorConfig` → `TemplatedSqlEditorConfig`；常量 `V2_CONFIG_SECTION` 值改 `'sqlsugar.templatedSqlEditor'`
- [x] `utils/preference-manager.ts`：配置段常量同步
- [x] `types.ts` / `types/config.ts`：`EditorV2Config` / `EditorV2State` / `VariableChangeEventV2` / `TemplateRenderEventV2` / `CompleteEditorV2Config` 去掉 V2，归入 `TemplatedSqlEditor*`
- [x] 更新所有 import 与引用（含 `ui/index.ts` 入口）

estimated: 4h
depends: T003

### T005: 构建

- [x] `esbuild.js`：webview 入口/输出 `jinja2-editor-v2` → `templated-sql-editor`（含注释）
- [x] webview HTML / 资源引用路径同步

estimated: 1h
depends: T004

### T006: 文档

- [x] `README.md`：展示名、命令标题更新；新增命令 ID 与配置键迁移说明
- [x] `src/features/jinja2/ui/README.md`：标题与命令引用更新为 Templated SQL Editor

estimated: 1h
depends: T001

### T007: 校验（完成标准）

- [x] 残留检查无命中：`rg -n "copyJinja2Template|sqlsugar\.v2Editor|jinja2-editor-v2|jinja2EditorV2|Jinja2EditorV2|SqlPreviewV2|V2EditorConfig|SqlsugarWebviewV2App|webviewV2" src package.json esbuild.js`
- [x] `pnpm run check-types` 通过
- [x] `pnpm test` 通过
- [x] `just spec-validate` 通过（含本 change delta）
- [x] `just build` 通过；扩展可激活且 `Copy To Templated SQL (Editor)` 命令可打开编辑器

estimated: 1h
depends: T001, T002, T003, T004, T005, T006

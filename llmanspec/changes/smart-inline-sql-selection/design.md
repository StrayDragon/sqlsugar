# Design — smart-inline-sql-selection

## 目标

空选区时从光标扩选宿主语言字符串字面量；选区引号/前缀容错；`looksLikeSQL` 失败时非 modal 确认。Inline SQL 与 Templated SQL 共用同一扩选/归一入口。

## 方案

1. **`resolveSqlSelection(editor)`**（`LanguageHandler` 或同级模块）  
   - 选区非空：尝试 `normalizeSelectionQuotes`（多含/少含引号与 `f`/`r`/`b`/`fr`/`rf` 等前缀）  
   - 选区为空：在光标位置向左右扫描，识别 Python 三引号/前缀字符串、JS/TS `` ` `` / `'`` / `"` 字面量；失败则保持空选区并提示  
   - 返回 `{ selection, text, quoteMeta }` 供后续临时文件/回写使用

2. **命令入口**  
   - `InlineSQLCommandHandler.execute` 与 `TemplatedSqlHandler.processTemplate` 在读选区前调用 `resolveSqlSelection`  
   - 扩选成功后 `editor.selection = resolved`（可见反馈）

3. **温和校验**  
   - `looksLikeSQL` 失败：`showWarningMessage(..., { modal: false }, 'Continue')`  
   - 与 R-ISE-006 对齐：允许继续，但不强制 modal

4. **配置（可选、默认合理）**  
   - `sqlsugar.selection.autoExpand`（default true）  
   - `sqlsugar.selection.includeSurroundingQuotes`（default false：扩选内容不含外层引号，与现有 temp 提取一致）

## 不做

- Go/Java 字面量（留给 `expand-param-style-and-host-languages`）  
- 写回模板/渲染替换（`templated-editor-workflow-closure`）  
- 改 `editorHasSelection` 菜单 when（空选区仍靠命令/快捷键）

## 测试 seam

- `LanguageHandler`（或抽取的 `resolveSqlSelection`）纯函数/单测：给定 document text + 光标/选区 → 期望 range/text  
- 命令层：mock editor，空选区扩选成功/失败路径  
- `looksLikeSQL` 确认：断言调用非 modal WarningMessage（可 spy `vscode.window.showWarningMessage`）

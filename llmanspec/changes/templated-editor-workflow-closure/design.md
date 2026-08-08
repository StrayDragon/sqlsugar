# Design — templated-editor-workflow-closure

## 目标

纯参数占位符也进 WebView；工具栏区分复制模板 / 复制渲染 SQL；支持写回源选区模板与（显式确认后）用渲染 SQL 替换选区。

## 方案

1. **统一入口**  
   - 删除 `handleSQLAlchemyOnly` InputBox 主路径  
   - `:param` only → 构造 `paramPattern` 变量列表 → `handleWebviewMode`

2. **源选区上下文**  
   - `TemplatedSqlWebviewEditor.showEditor` 接收 `SourceEditContext`：`documentUri`、`selection`、`originalQuoted`、`language`  
   - 写回时用 `LanguageHandler.wrapLikeIntelligent` 保持引号/前缀

3. **WebView → Host 消息**  
   - `copyToClipboard`（已有，强化 `isTemplate` 文案）  
   - `writeBackTemplate`：`{ template }` → 替换源选区为包装后的模板  
   - `replaceWithRendered`：先 `showWarningMessage` 确认 → 替换为包装后的渲染 SQL

4. **工具栏**  
   - 文案：「复制模板」「复制渲染 SQL」「写回模板」「替换为渲染 SQL」  
   - 后两者通过 `vscode.postMessage` 发往 host

## 不做

- ORM 补全、Go/Java 字面量  
- 改分析器默认（`expand-param-style`）

## 测试 seam

- `handleSQLAlchemyOnly` 不再被调用 / 纯 named 模板走 webview 变量构造单测  
- Host 消息处理：mock WorkspaceEdit / TextEditor（或纯函数 `buildWriteBackText`）  
- UI：按钮触发 postMessage（轻量）

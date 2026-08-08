# Design — temp-file-and-settings-hygiene

## 目标

临时 SQL 文件默认不污染仓库；清理设置可读；外观类设置降噪。

## 方案

1. **默认路径**：`TempFileManager` 默认写到 `context.globalStorageUri` 或 `os.tmpdir()` 下的 `sqlsugar/`；保留配置项切回工作区相对路径（现有 `.vscode/sqlsugar/temp/`）供需要 SQL 扩展扫工作区的用户。
2. **工作区模式**：若用户选择工作区路径，写入时确保目录约定清晰；README 提示加入 ignore（可选自动检测 `.gitignore` 是否已忽略——实现时选低侵入方案）。
3. **设置文案**：重写 `tempFileCleanup` / `cleanupOnClose` description；外观项用 `sqlsugar.templatedSqlEditor` 高级语意或 markdown 分组说明「高级」。
4. **语言服务**：改路径后验证临时 `.sql` 仍能被打开并关联 SQL 扩展（手工）。

## 不做

- 选区扩选、模板渲染修复

## 测试 seam

- `TempFileManager` 路径选择逻辑单测（mock vscode env）
- 手工：默认路径不在仓库内；关闭/保存清理仍生效

---
depends_on: []
branch: sdd/temp-file-and-settings-hygiene
base_sha: 76f8c45f6585753c8c494cd93a8ce4cba51580b3
checkpointed: false
---

# 临时文件与设置卫生

## Why

Inline SQL 临时文件落在工作区 `.vscode/sqlsugar/temp/`，易污染 Git、出现在文件树噪音中；`tempFileCleanup` / `cleanupOnClose` 文案对用户不直观。同时 `sqlsugar.templatedSqlEditor.*` 等外观项偏多，新用户设置页噪音大，掩盖真正影响行为的少数开关。

与现有功能关系：只改临时文件落盘/清理策略与配置呈现，不改同步回写算法本身。

## What Changes

- 默认将临时 `.sql` 放到扩展全局存储或 OS temp（可配置仍用工作区目录）
- 若仍写入工作区：自动确保被 ignore（`.gitignore` 建议或写入已被 ignore 的路径）
- 用白话重组清理相关设置说明；合并/降级纯外观设置为「高级」分组
- 核对默认值：`showSQLPreview` 等与真实主路径一致

## Capabilities

1. **默认不污染仓库**：系统 MUST 默认将 Inline SQL 临时文件写在工作区之外（扩展 storage 或系统临时目录）
2. **工作区模式可选**：系统 SHOULD 允许用户选择工作区相对路径模式，并 MUST 避免临时文件被误提交（ignore 或明确路径约定）
3. **清理语义可读**：系统 MUST 用清晰描述区分「关闭时删」与「保存时删」等行为
4. **设置面收敛**：系统 SHOULD 将不影响核心行为的外观项归入高级分组，降低设置噪音

## Impact

- 触及：`temp-file-manager.ts`、`package.json` configuration、可能的 README
- 风险：低–中；改路径后需验证 SQL 语言服务仍能附着临时文档
- 独立于选区/WebView，可与 Wave 1 其他 change 并行
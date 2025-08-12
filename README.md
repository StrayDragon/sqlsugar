# SQLSugar

[![Test](https://github.com/straydragon/sqlsugar/actions/workflows/test.yml/badge.svg)](https://github.com/straydragon/sqlsugar/actions/workflows/test.yml)
[![Release](https://github.com/straydragon/sqlsugar/actions/workflows/release.yml/badge.svg)](https://github.com/straydragon/sqlsugar/actions/workflows/release.yml)
<!-- [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/localsqlsugar.sqlsugar?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=localsqlsugar.sqlsugar)
[![VS Code Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/localsqlsugar.sqlsugar)](https://marketplace.visualstudio.com/items?itemName=localsqlsugar.sqlsugar)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/localsqlsugar.sqlsugar)](https://marketplace.visualstudio.com/items?itemName=localsqlsugar.sqlsugar) -->

在多语言代码中编辑内联 SQL 字符串，并通过 sqls 语言服务器获得补全与悬停信息。专注于"选中即编辑、保存即回写"，不内置格式化。

## 功能
- 在编辑器中选中 SQL 字符串，右键或命令面板执行“Edit Inline SQL”，在侧边打开临时 .sql 文件进行专注编辑。
- 保存临时 .sql 后，自动将更改回写到原始字符串，保留原有引号/三引号包裹。
- 集成 sqls LSP，提供补全与悬停信息；首次运行命令时自动启动 sqls 语言服务器（可配置路径与配置文件）。
- ORM 风格占位符支持：临时把 `:name` 转换为可编辑的字符串字面量，保存时还原为 `:name`，避免误把时间如 `12:34` 或 Postgres `::type` 当作占位符。
- 临时文件自动清理：支持保存时或关闭编辑器时删除临时文件。

## 前置条件
- 安装 [sqls-server/sqls: SQL language server written in Go.](https://github.com/sqls-server/sqls) 并可在 PATH 中找到，或在设置中指定绝对路径。
- 如需使用数据库语义，请在 `sqls` 配置中指向可用的数据库。本仓库提供了基于 Docker 的 MySQL 示例（见 `docker/`）。

## 使用方法
1. 在代码中选中要编辑的 SQL 字符串（支持单引号、双引号、三引号）。
2. 右键选择“Edit Inline SQL”，或在命令面板执行同名命令。
3. 在打开的 .sql 临时文件中编辑，享受补全/悬停等能力。
4. 保存（Ctrl/Cmd+S）后，修改将写回原始字符串位置。

## 设置
- `sqlsugar.sqlsPath`: sqls 可执行文件路径（默认：`sqls`）。
- `sqlsugar.sqlsConfigPath`: sqls 配置文件路径；支持 `${workspaceFolder}` 与 `${env:VAR_NAME}` 变量。
- `sqlsugar.tempFileCleanup`: 是否自动清理临时文件（默认：true）。
- `sqlsugar.cleanupOnClose`: 为 true 时在关闭临时编辑器时删除；为 false 时在保存后删除（需启用 `tempFileCleanup`）。

示例工作区设置：
```json
{
  "sqlsugar.sqlsConfigPath": "${workspaceFolder}/docker/sqls-config.yml",
  "sqlsugar.tempFileCleanup": true,
  "sqlsugar.cleanupOnClose": true
}
```

## 格式化与校验
扩展不内置 SQL 格式化与 lint。建议配合 SQLFluff 等扩展使用（本仓库附带 `.sqlfluff` 示例）。

## 已知限制
- 需要手动选中 SQL 字符串；SQL 检测为启发式，可能提示继续/取消。
- 不解析字符串拼接/模板变量，仅对所选字符串块生效。
- 依赖本地 `sqls` 与其配置；若未安装或配置错误，将无法获得 LSP 能力。

## 版本
- 0.0.1：首个预览版，支持内联编辑、sqls 路径/配置、占位符兼容与临时文件清理。

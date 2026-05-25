## Why

当前 SQLSugar 对 SQL 内容的理解仅限于关键词启发式检测，无法区分方言差异、验证语法正确性或提供格式化。用户在编辑 SQL 时得不到任何实时反馈，与专业 SQL IDE 差距明显。集成 SQL parser 是提升核心竞争力的关键一步。

## What Changes

- 集成 `node-sql-parser` 支持 PostgreSQL/MySQL/SQLite/SQL Server/BigQuery 多方言 AST 解析
- 集成 `sql-formatter` 提供可配置的 SQL 格式化，注册为 VS Code Format Document provider
- 实现实时语法验证，通过 VS Code Diagnostics API 展示错误
- 状态栏方言指示器，支持点击切换
- 智能处理 Jinja2 模板语法，避免模板部分产生误报
- 为 inline-sql 临时文件提供实时验证
- 实现 `DialectProvider` 接口，允许后续扩展新方言

## Non-Goals

- 不提供基于数据库连接的 schema 补全（属于 004-database-connectivity）
- 不实现完整的 IntelliSense（如 JOIN 补全、子查询建议）
- 不支持存储过程和 PL/SQL 方言

---
llman_spec_valid_scope:
  - src/features/sql-intelligence/
  - src/core/providers/
  - src/test/
llman_spec_valid_commands:
  - pnpm run test
  - pnpm run check-types
llman_spec_evidence:
  - "单元测试: 多方言 SQL 解析和验证通过"
  - "集成测试: 格式化输出与期望一致"
---

```toon
kind: llman.sdd.spec
name: "sql-intelligence"
purpose: "为 SQL 编辑提供方言感知的智能能力，包括语法验证、格式化、补全提示，让用户在 VS Code 中获得专业 SQL IDE 级别的编辑体验。"
requirements[6]{req_id,title,statement}:
  R-SQL-001,多方言支持,系统 MUST 支持 PostgreSQL/MySQL/SQLite/SQL Server/BigQuery 方言解析
  R-SQL-002,语法验证,系统 MUST 实时验证 SQL 语法并通过 VS Code Diagnostics 展示错误
  R-SQL-003,SQL 格式化,系统 MUST 提供 SQL 格式化功能并支持多种风格配置
  R-SQL-004,方言切换,系统 MUST 在状态栏提供方言指示器并支持快速切换
  R-SQL-005,Provider 接口,系统 MUST 通过 DialectProvider 接口允许插件扩展新方言
  R-SQL-006,片段识别,系统 SHALL 识别不完整 SQL 片段并提供合理的验证处理
scenarios[6]{req_id,id,given,when,then}:
  R-SQL-001,baseline,"用户正在编辑 SQL 文件","系统检测到 PostgreSQL 方言","按 PostgreSQL 规则验证语法"
  R-SQL-002,baseline,"用户使用了 MySQL 特有语法但方言设为 PostgreSQL","用户保存文件","相关语法标记为方言不兼容错误"
  R-SQL-003,baseline,"用户选中未格式化的 SQL","用户执行格式化命令","SQL 按配置风格重新排版"
  R-SQL-004,baseline,"用户需要切换到 MySQL 方言","用户点击状态栏方言指示器","弹出方言选择列表并切换成功"
  R-SQL-005,baseline,"第三方扩展注册了新 DialectProvider","用户编辑对应方言 SQL","新方言的验证规则生效"
  R-SQL-006,baseline,"Jinja2 模板中包含 SQL 片段","系统进行语法验证","智能跳过模板语法仅验证 SQL 部分"
```

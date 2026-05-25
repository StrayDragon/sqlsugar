---
llman_spec_valid_scope:
  - src/features/database/
  - src/core/providers/
  - src/test/
llman_spec_valid_commands:
  - pnpm run test
  - pnpm run check-types
llman_spec_evidence:
  - "集成测试: 连接建立与查询执行通过"
  - "手动测试: Schema 浏览器展示正确结构"
---

```toon
kind: llman.sdd.spec
name: "database-connectivity"
purpose: "在 VS Code 内提供轻量级数据库连接能力，支持执行 SQL 查询、浏览 Schema 结构、导出结果，让用户无需离开编辑器即可验证 SQL。"
requirements[8]{req_id,title,statement}:
  R-DBC-001,多数据库连接,系统 MUST 支持 PostgreSQL/MySQL/SQLite 数据库连接配置
  R-DBC-002,安全凭证存储,系统 MUST 使用 VS Code SecretStorage 安全存储连接凭证
  R-DBC-003,结果表格展示,系统 MUST 在 WebView 中展示查询结果表格并支持虚拟滚动
  R-DBC-004,Schema 浏览器,系统 MUST 提供 TreeView 侧边栏展示数据库 Schema
  R-DBC-005,超时与取消,系统 MUST 支持查询执行超时控制和取消操作
  R-DBC-006,结果导出,系统 MUST 支持将结果导出为 CSV/JSON/Markdown/INSERT 语句
  R-DBC-007,查询历史,系统 SHALL 记录查询历史并支持收藏和搜索
  R-DBC-008,只读模式,系统 SHALL 支持可选只读模式防止误操作修改数据
scenarios[8]{req_id,id,given,when,then}:
  R-DBC-001,baseline,"用户已配置 PostgreSQL 连接","用户打开 Schema 浏览器","侧边栏展示所有表和列信息"
  R-DBC-002,baseline,"用户输入数据库密码","系统存储凭证","密码通过 SecretStorage 加密存储而非明文"
  R-DBC-003,baseline,"用户在编辑器中编辑完 SQL","用户点击执行按钮","WebView 结果表格展示查询结果"
  R-DBC-004,baseline,"数据库连接成功","用户展开 TreeView 中的表节点","展示表的列名/类型/约束信息"
  R-DBC-005,baseline,"查询执行超过配置的超时时间","系统检测到超时","提示用户选择取消或继续等待"
  R-DBC-006,baseline,"查询结果已展示","用户选择导出为 CSV","CSV 文件生成且格式正确"
  R-DBC-007,baseline,"用户已执行多条查询","用户打开查询历史面板","按时间倒序展示历史查询可搜索"
  R-DBC-008,baseline,"只读模式已启用","用户尝试执行 DELETE 语句","操作被拦截并提示切换模式"
```

## Design

> **状态：已推迟 (priority 999)**
> 待核心功能稳定后再设计具体方案。以下为初步方向。

### 初步方向

- 基于 `DatabaseProvider` 接口抽象不同数据库
- 连接凭证使用 VS Code `SecretStorage` API 安全存储
- 查询结果通过 WebView 表格展示
- Schema 浏览器使用 VS Code TreeView API

### 待决策

- [ ] 是否依赖外部 driver（pg, mysql2）还是走 extension host 隔离？
- [ ] 结果集大小限制策略
- [ ] 与 SQL Intelligence 的集成方式

## Why

验证 SQL 正确性的最终方式是在真实数据库上执行。当前用户必须离开 VS Code 使用外部工具执行 SQL。如果 SQLSugar 能提供轻量级数据库连接和查询执行能力，用户的"编写 → 验证 → 迭代"循环将大幅加速，特别是与 Jinja2 编辑器的集成（渲染后直接执行）将是独特竞争优势。

## What Changes

- 实现 `DatabaseProvider` 接口和连接生命周期管理（建立/测试/关闭/池化）
- 内置 PostgreSQL、MySQL、SQLite 三个 DatabaseProvider
- VS Code SecretStorage 安全存储连接凭证
- 多连接管理：配置和切换多个数据库连接
- WebView 结果表格（虚拟滚动支持大数据集）
- TreeView 侧边栏 Schema 浏览器
- 查询执行超时控制和取消
- 结果导出（CSV、JSON、Markdown table、INSERT 语句）
- 查询历史记录（收藏 + 搜索）
- 可选只读模式
- EXPLAIN 查询计划可视化
- 利用数据库 schema 信息提供表名/列名补全
- 从 Jinja2 编辑器直接执行渲染后的 SQL

## Non-Goals

- 不替代专业数据库管理工具（不支持数据编辑、表结构修改）
- 不支持 SSH 隧道或高级网络配置（初版）
- 不实现数据库迁移功能

## Why

大多数开发者的 SQL 并非凭空编写，而是在 ORM 框架（SQLAlchemy、Django、TypeORM 等）的上下文中产生。如果 SQLSugar 能理解项目中的 ORM model 定义，就能将变量推断从名称猜测升级为 schema 感知推断，并提供 ORM ↔ SQL 双向转换预览，大幅提升开发效率。

## What Changes

- 实现 `ORMProvider` 接口和 `ORMDiscoveryService` 统一管理
- 内置 SQLAlchemy Model 静态分析器：提取表名、列名、列类型、关系
- 内置 Django Model 静态分析器
- 可选 TypeORM/Prisma schema 解析支持
- Schema 感知推断：利用已发现的 model 信息增强 Jinja2 变量类型推断
- 选中 ORM 查询 → Hover 展示等价 SQL
- 选中 raw SQL → CodeAction 建议等价 ORM 写法
- 统一处理多种参数绑定风格（?、$1、:name、%(name)s）
- 工作区扫描 + FileWatcher 增量更新 + 本地缓存

## Non-Goals

- 不执行 ORM 查询（无运行时调用）
- 不支持 ORM migration 管理
- 不实现完整的 ORM 代码生成

---
llman_spec_valid_scope:
  - src/features/orm/
  - src/core/providers/
  - src/test/
llman_spec_valid_commands:
  - pnpm run test
  - pnpm run check-types
llman_spec_evidence:
  - "单元测试: Model 解析与 Schema 提取正确"
  - "集成测试: ORM 查询转 SQL 预览正确"
---

```toon
kind: llman.sdd.spec
name: "orm-integration"
purpose: 深度集成主流 ORM 框架，从项目中的 Model 定义提取数据库 schema 信息，提供 ORM 到 SQL 双向转换预览，增强变量推断的上下文感知能力。
requirements[11]{req_id,title,statement}:
  "R-ORM-001",SQLAlchemy 解析,系统 MUST 静态分析 SQLAlchemy Model 类定义提取表名/列名/类型
  "R-ORM-002",Django 解析,系统 MUST 静态分析 Django Model 类定义提取 schema
  "R-ORM-003",TypeORM/Prisma 解析,系统 SHALL 静态分析 TypeORM Entity 和 Prisma schema 定义
  "R-ORM-004",Schema 推断增强,系统 MUST 利用 Model schema 增强 Jinja2 变量类型推断
  "R-ORM-005",ORM 转 SQL 预览,系统 MUST 支持选中 ORM 查询展示等价 SQL
  "R-ORM-006",SQL 转 ORM 建议,系统 SHALL 选中 raw SQL 时通过 CodeAction 建议等价 ORM 写法
  "R-ORM-007",Provider 接口,系统 MUST 通过 ORMProvider 接口支持插件扩展新 ORM
  "R-ORM-008",工作区扫描,系统 MUST 在激活时扫描工作区发现 ORM model 文件并建立 schema 索引
  "R-ORM-009",增量更新,系统 MUST 监听文件变化增量更新 schema 索引而非全量重扫
  "R-ORM-010",多绑定风格,"系统 MUST 统一处理 ?/$1/:name/%(name)s 等参数绑定风格"
  "R-ORM-011",Schema 缓存,系统 MUST 将解析的 schema 缓存到工作区存储避免重复解析
scenarios[11]{req_id,id,given,when,then}:
  "R-ORM-001",baseline,项目中定义了 SQLAlchemy User model,系统扫描工作区,正确提取 users 表的列定义和类型
  "R-ORM-002",baseline,项目中定义了 Django UserProfile model,系统扫描工作区,正确提取 user_profiles 表结构
  "R-ORM-003",baseline,项目中定义了 Prisma schema 文件,系统扫描工作区,正确提取 Prisma model 中的表和列
  "R-ORM-004",baseline,已提取 User model 含 Integer 类型 id 列,用户编辑含 user_id 变量的 Jinja2 模板,user_id 自动推断为 number 类型
  "R-ORM-005",baseline,用户选中 Django queryset 代码,用户触发 SQL 预览命令,Hover 展示生成的 SQL 含参数绑定
  "R-ORM-006",baseline,用户选中 SELECT * FROM users WHERE age > 18,用户查看 CodeAction,列表中包含等价 ORM 写法建议
  "R-ORM-007",baseline,开发者实现了自定义 ORMProvider,Provider 注册到系统,新 ORM 的 model 被正确发现和解析
  "R-ORM-008",S001,项目包含 SQLAlchemy models.py,扩展激活,后台扫描完成后 schema 索引包含所有表定义
  "R-ORM-009",S001,用户修改了 model 文件添加新列,文件保存触发 watcher,schema 索引增量更新包含新列
  "R-ORM-010",S001,"模板中混用 :name 和 %(name)s 占位符",系统处理模板,两种风格都被正确识别和替换
  "R-ORM-011",S001,扩展重新激活且 model 文件未变化,系统加载缓存,schema 从缓存恢复无需重新解析
```

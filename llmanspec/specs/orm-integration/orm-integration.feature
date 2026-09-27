# language: zh-CN
# capability: orm-integration
# purpose: 深度集成主流 ORM 框架，从项目中的 Model 定义提取数据库 schema 信息，提供 ORM 到 SQL 双向转换预览，增强变量推断的上下文感知能力。
# scope: src/test/

功能: orm-integration

  @req:r31
  规则: SQLAlchemy 解析
    系统 MUST 静态分析 SQLAlchemy Model 类定义提取表名/列名/类型

    场景: baseline
      假如 项目中定义了 SQLAlchemy User model
      当 系统扫描工作区
      那么 正确提取 users 表的列定义和类型

  @req:r32
  规则: Django 解析
    系统 MUST 静态分析 Django Model 类定义提取 schema

    场景: baseline
      假如 项目中定义了 Django UserProfile model
      当 系统扫描工作区
      那么 正确提取 user_profiles 表结构

  @req:r33
  规则: TypeORM/Prisma 解析
    系统 SHALL 静态分析 TypeORM Entity 和 Prisma schema 定义

    场景: baseline
      假如 项目中定义了 Prisma schema 文件
      当 系统扫描工作区
      那么 正确提取 Prisma model 中的表和列

  @req:r34
  规则: Schema 推断增强
    系统 MUST 利用 Model schema 增强 Jinja2 变量类型推断

    场景: baseline
      假如 已提取 User model 含 Integer 类型 id 列
      当 用户编辑含 user_id 变量的 Jinja2 模板
      那么 user_id 自动推断为 number 类型

  @req:r35
  规则: ORM 转 SQL 预览
    系统 MUST 支持选中 ORM 查询展示等价 SQL

    场景: baseline
      假如 用户选中 Django queryset 代码
      当 用户触发 SQL 预览命令
      那么 Hover 展示生成的 SQL 含参数绑定

  @req:r36
  规则: SQL 转 ORM 建议
    系统 SHALL 选中 raw SQL 时通过 CodeAction 建议等价 ORM 写法

    场景: baseline
      假如 用户选中 SELECT * FROM users WHERE age > 18
      当 用户查看 CodeAction
      那么 列表中包含等价 ORM 写法建议

  @req:r37
  规则: Provider 接口
    系统 MUST 通过 ORMProvider 接口支持插件扩展新 ORM

    场景: baseline
      假如 开发者实现了自定义 ORMProvider
      当 Provider 注册到系统
      那么 新 ORM 的 model 被正确发现和解析

  @req:r38
  规则: 工作区扫描
    系统 MUST 在激活时扫描工作区发现 ORM model 文件并建立 schema 索引

    场景: S001
      假如 项目包含 SQLAlchemy models.py
      当 扩展激活
      那么 后台扫描完成后 schema 索引包含所有表定义

  @req:r39
  规则: 增量更新
    系统 MUST 监听文件变化增量更新 schema 索引而非全量重扫

    场景: S001
      假如 用户修改了 model 文件添加新列
      当 文件保存触发 watcher
      那么 schema 索引增量更新包含新列

  @req:r40
  规则: 多绑定风格
    系统 MUST 统一处理 ?/$1/:name/%(name)s 等参数绑定风格

    场景: S001
      假如 模板中混用 :name 和 %(name)s 占位符
      当 系统处理模板
      那么 两种风格都被正确识别和替换

  @req:r41
  规则: Schema 缓存
    系统 MUST 将解析的 schema 缓存到工作区存储避免重复解析

    场景: S001
      假如 扩展重新激活且 model 文件未变化
      当 系统加载缓存
      那么 schema 从缓存恢复无需重新解析

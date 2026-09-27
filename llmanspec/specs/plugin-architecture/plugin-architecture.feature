# language: zh-CN
# capability: plugin-architecture
# purpose: 设计可扩展的插件架构，通过 Provider 注册模式让核心功能可被扩展，支持社区开发自定义方言、ORM、AI 后端、模板函数等插件。
# scope: src/core/,src/features/,src/test/,package.json

功能: plugin-architecture

  @req:r42
  规则: Provider 注册
    系统 MUST 提供 ProviderRegistry 管理所有 Provider 的注册/查找/优先级

    场景: baseline
      假如 多个 InferenceProvider 已注册
      当 系统需要推断变量类型
      那么 按优先级链逐个调用直到获得结果

  @req:r43
  规则: Language Provider
    系统 MUST 定义 LanguageProvider 接口支持多语言 SQL 提取和重构

    场景: baseline
      假如 Python LanguageProvider 已注册
      当 用户在 Python 文件中选中 SQL
      那么 LanguageProvider 正确提取 SQL 内容

  @req:r44
  规则: Dialect Provider
    系统 MUST 定义 DialectProvider 接口支持 SQL 方言验证和格式化

    场景: baseline
      假如 第三方扩展注册了 ClickHouse DialectProvider
      当 用户编辑 SQL 文件
      那么 自动获得 ClickHouse 语法验证支持

  @req:r45
  规则: Inference Provider
    系统 MUST 定义 InferenceProvider 接口支持变量类型推断优先级链

    场景: baseline
      假如 Pattern 和 ORM 两个 InferenceProvider 注册
      当 变量需要推断类型
      那么 ORM Provider 优先级高时优先使用其结果

  @req:r46
  规则: AI Provider
    系统 MUST 定义 AIProvider 接口支持 AI 后端适配

    场景: baseline
      假如 用户配置 Ollama 为优先 AIProvider
      当 用户使用 AI 功能
      那么 请求走 Ollama 本地模型

  @req:r47
  规则: Database Provider
    系统 MUST 定义 DatabaseProvider 接口支持数据库连接适配

    场景: baseline
      假如 PostgreSQL DatabaseProvider 已注册
      当 用户创建 PostgreSQL 连接
      那么 通过对应 Provider 建立连接

  @req:r48
  规则: Extension API
    系统 SHALL 公开 VS Code Extension API 允许第三方扩展注册 Provider

    场景: baseline
      假如 开发者创建新扩展注册 Go LanguageProvider
      当 用户在 Go 文件中选中 SQL
      那么 获得与 Python 相同的内联 SQL 编辑支持

  @req:r49
  规则: 配置驱动选择
    系统 MUST 支持用户通过配置指定优先使用的 Provider

    场景: baseline
      假如 用户配置 MySQL 为优先 Dialect
      当 用户打开 SQL 文件
      那么 默认使用 MySQL 方言验证

  @req:r50
  规则: 渐进式迁移
    系统 MUST 支持从现有 DI 容器平滑迁移到 Provider 注册模式

    场景: S001
      假如 现有 DIContainer 注册了服务
      当 引入 ProviderRegistry
      那么 原有服务通过适配器继续工作

  @req:r51
  规则: 基础 Provider 类型
    系统 MUST 在此阶段实现 LanguageProvider 和 InferenceProvider 基础接口

    场景: S001
      假如 LanguageProvider 接口已定义
      当 现有 LanguageHandler 实现适配器
      那么 Python/JS/TS 语言支持不受影响

  @req:r52
  规则: 内置方言 Provider
    系统 MUST 内置 PostgreSQL/MySQL/SQLite 三个 DialectProvider 实现

    场景: S001
      假如 用户打开 .sql 文件
      当 系统初始化方言支持
      那么 状态栏显示默认方言且 Diagnostics 可用

  @req:r53
  规则: 方言自动检测
    系统 SHALL 根据文件注释或项目配置自动选择合适的 DialectProvider

    场景: S001
      假如 SQL 文件顶部有 -- dialect: mysql 注释
      当 系统读取文件
      那么 自动切换到 MySQL DialectProvider

  @req:r54
  规则: 内置 ORM Provider
    系统 MUST 内置 SQLAlchemy 和 Django 两个 ORMProvider 实现

    场景: S001
      假如 项目同时包含 SQLAlchemy 和 Django model
      当 扩展激活扫描工作区
      那么 两个 Provider 分别识别各自的 model 并合并到统一 schema

  @req:r55
  规则: ORM 发现服务
    系统 MUST 提供 ORMDiscoveryService 统一管理多个 ORMProvider 的扫描结果

    场景: S001
      假如 多个 ORMProvider 返回同名表的 schema
      当 ORMDiscoveryService 合并结果
      那么 优先使用有更多列信息的 Provider 结果

  @req:r56
  规则: 首次引导与扩展元数据
    系统 MUST 提供 Walkthrough 介绍两大主功能并使用可读 displayName 与合适 Marketplace categories

    场景: walkthrough
      假如 用户首次安装扩展
      当 打开 Get Started Walkthrough
      那么 可见 Inline SQL 与 Templated SQL 两步介绍且 displayName 可读

# language: zh-CN
# capability: sql-intelligence
# purpose: 为 SQL 编辑提供方言感知的智能能力，包括语法验证、格式化、补全提示，让用户在 VS Code 中获得专业 SQL IDE 级别的编辑体验。
# scope: src/features/sql-intelligence/,src/test/

功能: sql-intelligence

  @req:r57
  规则: 多方言支持
    系统 MUST 支持 PostgreSQL/MySQL/SQLite/SQL Server/BigQuery 方言解析

    场景: baseline
      假如 用户正在编辑 SQL 文件
      当 系统检测到 PostgreSQL 方言
      那么 按 PostgreSQL 规则验证语法

  @req:r58
  规则: 语法验证
    系统 MUST 实时验证 SQL 语法并通过 VS Code Diagnostics 展示错误

    场景: baseline
      假如 用户使用了 MySQL 特有语法但方言设为 PostgreSQL
      当 用户保存文件
      那么 相关语法标记为方言不兼容错误

  @req:r59
  规则: SQL 格式化
    系统 MUST 提供 SQL 格式化功能并支持多种风格配置

    场景: baseline
      假如 用户选中未格式化的 SQL
      当 用户执行格式化命令
      那么 SQL 按配置风格重新排版

  @req:r60
  规则: 方言切换
    系统 MUST 在状态栏提供方言指示器并支持快速切换

    场景: baseline
      假如 用户需要切换到 MySQL 方言
      当 用户点击状态栏方言指示器
      那么 弹出方言选择列表并切换成功

  @req:r61
  规则: Provider 接口
    系统 MUST 通过 DialectProvider 接口允许插件扩展新方言

    场景: baseline
      假如 第三方扩展注册了新 DialectProvider
      当 用户编辑对应方言 SQL
      那么 新方言的验证规则生效

  @req:r62
  规则: 片段识别
    系统 SHALL 识别不完整 SQL 片段并提供合理的验证处理

    场景: baseline
      假如 Jinja2 模板中包含 SQL 片段
      当 系统进行语法验证
      那么 智能跳过模板语法仅验证 SQL 部分

  @req:r63
  规则: SQL Parser 集成
    系统 MUST 集成 node-sql-parser 支持多方言 AST 解析

    场景: S001
      假如 用户编辑含 PostgreSQL 特有语法的 SQL
      当 系统进行 AST 解析
      那么 正确识别 PostgreSQL 特有节点(如 ARRAY 类型)

  @req:r64
  规则: 格式化引擎
    系统 MUST 集成 sql-formatter 并支持 Format Document 命令

    场景: S001
      假如 用户选中未格式化的复杂 SQL
      当 执行 Format Document
      那么 SQL 按 4-space 缩进和大写关键字格式化

  @req:r65
  规则: Jinja2 模板兼容
    系统 MUST 在验证 SQL 时智能处理 Jinja2/Nunjucks 模板语法不产生误报

    场景: S001
      假如 SQL 中包含 {{ variable }} 模板语法
      当 系统进行语法验证
      那么 模板部分被跳过不产生语法错误

  @req:r66
  规则: 内联 SQL 验证
    系统 SHALL 对 inline-sql 临时文件提供实时语法验证

    场景: S001
      假如 用户通过 inline-sql 打开临时文件
      当 用户输入错误 SQL 语法
      那么 实时标记语法错误位置

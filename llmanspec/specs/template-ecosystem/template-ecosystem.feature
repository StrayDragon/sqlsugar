# language: zh-CN
# capability: template-ecosystem
# purpose: 构建可复用、可共享的 SQL 模板生态系统，内置常见 SQL 模式库，支持团队共享模板、增强的参数类型系统、模板测试框架。
# scope: src/features/templates/,src/test/

功能: template-ecosystem

  @req:r67
  规则: 内置模板库
    系统 MUST 内置 20+ 常见 SQL 模式模板(CRUD/分页/聚合/CTE/窗口函数等)

    场景: baseline
      假如 用户需要分页查询模板
      当 用户在命令面板搜索 pagination
      那么 展示内置分页模板并可选择插入

  @req:r68
  规则: 项目模板
    系统 MUST 支持从 .sqlsugar/templates/ 目录加载团队共享模板

    场景: baseline
      假如 团队在 .sqlsugar/templates/ 维护共享模板
      当 用户打开命令面板
      那么 共享模板出现在可用模板列表中

  @req:r69
  规则: 增强参数系统
    系统 MUST 支持 array/enum/optional/conditional 等复合参数类型

    场景: baseline
      假如 模板定义 enum 参数(排序方向)
      当 用户打开可视化编辑器
      那么 展示 ASC/DESC 下拉选择而非文本框

  @req:r70
  规则: 模板测试框架
    系统 SHALL 提供 YAML fixture 定义输入和期望输出的测试框架

    场景: baseline
      假如 模板有对应的 YAML 测试 fixture
      当 用户运行模板测试命令
      那么 验证所有 fixture 渲染结果与期望一致

  @req:r71
  规则: 模板导入导出
    系统 MUST 支持从文件/URL/剪贴板导入和导出模板

    场景: baseline
      假如 用户有外部 SQL 模板文件
      当 用户触发导入命令选择文件
      那么 模板被解析并添加到项目模板库

  @req:r72
  规则: Snippet 集成
    系统 SHALL 提供 VS Code Snippet Provider 在代码中快速插入模板

    场景: baseline
      假如 用户在 Python 文件中编写代码
      当 用户触发 snippet 补全
      那么 展示可用 SQL 模板 snippet 列表

  @req:r73
  规则: 模板分类搜索
    系统 MUST 支持模板标签分类和搜索筛选

    场景: baseline
      假如 模板库中有多个模板带不同标签
      当 用户输入标签搜索
      那么 只展示匹配标签的模板

  @req:r74
  规则: 方言适配
    系统 MUST 支持同一模板的多方言变体(PostgreSQL/MySQL/SQLite 版本)

    场景: S001
      假如 模板定义了 PostgreSQL 和 MySQL 两个变体
      当 用户当前方言为 MySQL
      那么 自动使用 MySQL 变体渲染

  @req:r75
  规则: 模板继承
    系统 SHALL 支持模板继承和组合(base + override 模式)

    场景: S001
      假如 base 模板定义了通用 SELECT 结构
      当 子模板覆盖 WHERE 条件
      那么 渲染结果合并 base 结构和自定义条件

  @req:r76
  规则: CLI 验证
    系统 SHALL 提供 CLI 命令用于 CI/CD 中验证模板语法和 fixture

    场景: S001
      假如 CI 流程调用 sqlsugar validate-templates
      当 模板有语法错误
      那么 命令返回非零退出码并报告错误位置

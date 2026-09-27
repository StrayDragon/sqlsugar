# language: zh-CN
# capability: database-connectivity
# purpose: 在 VS Code 内提供轻量级数据库连接能力，支持执行 SQL 查询、浏览 Schema 结构、导出结果，让用户无需离开编辑器即可验证 SQL。
# scope: src/test/

功能: database-connectivity

  @req:r8
  规则: 多数据库连接
    系统 MUST 支持 PostgreSQL/MySQL/SQLite 数据库连接配置

    场景: baseline
      假如 用户已配置 PostgreSQL 连接
      当 用户打开 Schema 浏览器
      那么 侧边栏展示所有表和列信息

  @req:r9
  规则: 安全凭证存储
    系统 MUST 使用 VS Code SecretStorage 安全存储连接凭证

    场景: baseline
      假如 用户输入数据库密码
      当 系统存储凭证
      那么 密码通过 SecretStorage 加密存储而非明文

  @req:r10
  规则: 结果表格展示
    系统 MUST 在 WebView 中展示查询结果表格并支持虚拟滚动

    场景: baseline
      假如 用户在编辑器中编辑完 SQL
      当 用户点击执行按钮
      那么 WebView 结果表格展示查询结果

  @req:r11
  规则: Schema 浏览器
    系统 MUST 提供 TreeView 侧边栏展示数据库 Schema

    场景: baseline
      假如 数据库连接成功
      当 用户展开 TreeView 中的表节点
      那么 展示表的列名/类型/约束信息

  @req:r12
  规则: 超时与取消
    系统 MUST 支持查询执行超时控制和取消操作

    场景: baseline
      假如 查询执行超过配置的超时时间
      当 系统检测到超时
      那么 提示用户选择取消或继续等待

  @req:r13
  规则: 结果导出
    系统 MUST 支持将结果导出为 CSV/JSON/Markdown/INSERT 语句

    场景: baseline
      假如 查询结果已展示
      当 用户选择导出为 CSV
      那么 CSV 文件生成且格式正确

  @req:r14
  规则: 查询历史
    系统 SHALL 记录查询历史并支持收藏和搜索

    场景: baseline
      假如 用户已执行多条查询
      当 用户打开查询历史面板
      那么 按时间倒序展示历史查询可搜索

  @req:r15
  规则: 只读模式
    系统 SHALL 支持可选只读模式防止误操作修改数据

    场景: baseline
      假如 只读模式已启用
      当 用户尝试执行 DELETE 语句
      那么 操作被拦截并提示切换模式

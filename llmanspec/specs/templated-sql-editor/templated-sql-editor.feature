# language: zh-CN
# capability: templated-sql-editor
# purpose: 提供基于 WebView 的 Jinja2 SQL 模板可视化编辑器，支持变量类型推断、实时 SQL 预览、智能默认值生成，帮助用户快速生成参数化的 SQL 查询。
# scope: src/features/templated-sql/,src/shared/,src/test/,package.json

功能: templated-sql-editor

  @req:r77
  规则: AST 变量提取
    系统 MUST 通过 Nunjucks AST 解析提取模板变量并回退到正则匹配

    场景: baseline
      假如 模板含 {{ user_id }} 和 {% if is_active %}
      当 用户打开可视化编辑器
      那么 变量列表显示 user_id 和 is_active

  @req:r78
  规则: 类型推断
    系统 MUST 基于变量名称模式推断类型(string/number/boolean/date)

    场景: baseline
      假如 变量名为 user_id 和 is_active
      当 编辑器推断变量类型
      那么 user_id 推断为 number 且 is_active 推断为 boolean

  @req:r79
  规则: 可视化编辑器
    系统 MUST 提供 Lit 组件实现的可视化编辑器支持点击变量弹出编辑框

    场景: baseline
      假如 编辑器已打开含多个变量的模板
      当 用户点击模板中高亮的变量
      那么 弹出编辑框且可修改变量值

  @req:r80
  规则: 实时预览
    系统 MUST 提供实时 SQL 预览并使用 highlight.js 语法高亮

    场景: baseline
      假如 用户在编辑器中修改变量值
      当 触发实时预览更新
      那么 SQL 预览立即反映新值且关键字高亮

  @req:r81
  规则: 滚动同步
    系统 SHALL 支持模板面板与预览面板双向滚动同步

    场景: baseline
      假如 模板较长需要滚动
      当 用户滚动模板面板
      那么 预览面板同步滚动到对应位置

  @req:r82
  规则: 混合模板
    系统 MUST 支持 SQLAlchemy :param 占位符与 Jinja2 {{ var }} 混合模板

    场景: baseline
      假如 模板混合使用 :param 和 {{ var }}
      当 用户打开可视化编辑器
      那么 两种占位符都被正确识别和处理

  @req:r83
  规则: SQL 过滤器
    系统 MUST 提供自定义 SQL 过滤器(sql_quote/sql_identifier/sql_date/sql_in/inclause 等)

    场景: baseline
      假如 模板使用 {{ name|sql_quote }} 过滤器
      当 系统渲染预览
      那么 name 值被正确 SQL 转义包裹

  @req:r84
  规则: 剪贴板复制
    系统 MUST 支持复制渲染结果到剪贴板含 Linux Wayland wl-copy 回退

    场景: baseline
      假如 用户在编辑器中完成变量填充
      当 用户点击复制按钮
      那么 渲染后的 SQL 被复制到系统剪贴板

  @req:r85
  规则: WebView 渲染对齐
    系统 MUST 确保 WebView 端 Nunjucks 环境与 Extension 端完全一致(含 installJinjaCompat 和自定义 filter)

    场景: S001
      假如 模板使用自定义 sql_quote filter 和嵌套变量
      当 WebView 渲染预览
      那么 结果与 Extension 端 processor 渲染完全一致

  @req:r86
  规则: UI 组件拆分
    系统 MUST 将编辑器单体组件拆分为 TemplatePanel/VariableEditor/SQLPreview/Toolbar 独立组件

    场景: S001
      假如 编辑器打开包含 5 个变量的模板
      当 开发者检查组件树
      那么 可见独立的 TemplatePanel/VariableEditor/SQLPreview/Toolbar 组件

  @req:r87
  规则: 测试覆盖
    系统 MUST 达到推断系统 90% 和整体 80% 的测试覆盖率

    场景: S001
      假如 推断系统所有分支已覆盖
      当 运行 pnpm test:coverage
      那么 推断模块达到 90% 覆盖率

  @req:r88
  规则: Schema 感知推断
    系统 MUST 利用 ORM schema 信息增强变量类型推断准确度

    场景: S001
      假如 ORM schema 显示 email 列为 String 类型
      当 模板中有 {{ email }} 变量
      那么 推断为 string 类型且默认值为 email 格式

  @req:r89
  规则: 列名补全
    系统 SHALL 在变量值输入时基于 schema 提供列名/表名补全建议

    场景: S001
      假如 用户在变量值输入框中输入
      当 schema 中有匹配的列名
      那么 输入框展示补全建议列表

  @req:r90
  规则: 模板浏览器
    系统 MUST 在可视化编辑器中提供模板库浏览和插入功能

    场景: S001
      假如 用户点击编辑器中的模板库按钮
      当 系统展示模板列表
      那么 用户选择模板后插入到当前编辑区域

  @req:r91
  规则: 参数类型扩展
    系统 MUST 在可视化编辑器中支持 array/enum/optional 等复合参数类型的交互式输入

    场景: S001
      假如 模板参数定义为 enum 类型(排序方向)
      当 可视化编辑器渲染参数
      那么 展示下拉选择而非普通文本输入框

    场景: array-edit
      假如 变量类型为 array 且值为 JSON 数组
      当 用户在可视化编辑器中编辑该变量
      那么 值按数组解析并可触发预览更新

  @req:r92
  规则: 编辑器实体命名扩展到结构层
    系统 MUST 将 feature 目录、引擎类名、共享工具文件名与产品实体命名统一，使 src/features/templated-sql/ 成为唯一 feature 目录且不再残留 jinja2 目录或 Jinja2Nunjucks 前缀类名

    场景: dir-migration
      假如 代码库存在 src/features/jinja2/ 目录
      当 审查 feature 目录结构
      那么 src/features/jinja2/ 已不存在且 src/features/templated-sql/ 包含全部原文件，所有外部 import 路径已更新

    场景: class-rename
      假如 代码库存在 Jinja2NunjucksHandler/Jinja2NunjucksProcessor 等类名
      当 审查引擎层类名
      那么 command-handler.ts 导出 TemplatedSqlHandler、processor.ts 导出 TemplateProcessor、analyzers/ 导出 TemplateExpressionAnalyzer

  @req:r93
  规则: 单一可视化入口(移除遗留模式)
    系统 MUST 仅以可视化编辑器(webview)作为模板处理入口，且不得保留 quick/wizard/defaults 等遗留非可视化模式分支

    场景: single-entry
      假如 命令 sqlsugar.copyTemplatedSql 的处理流程
      当 审查 command-handler 处理流程
      那么 不再存在 quick/wizard/defaults 模式分支及其处理方法 handleQuickMode/handleWizardMode/handleDefaultsMode

  @req:r94
  规则: 目录与类名一致性
    系统 MUST 确保 feature 目录 src/features/templated-sql/ 下所有引擎层类名不包含 Jinja2 或 Nunjucks 技术栈前缀

    场景: naming-consistency
      假如 src/features/templated-sql/ 目录已就位
      当 审查目录下所有 .ts 文件的导出符号
      那么 不存在以 Jinja2 或 Jinjucks 为前缀的导出类名/函数名/类型名

  @req:r95
  规则: 数组元素级 SQL 字面量
    系统 MUST 将数组渲染为 SQL IN 列表时对 number/boolean/null 使用无误引号字面量并对 string 使用正确转义的引号字面量

    场景: numeric-tuple
      假如 模板使用 sql_in 且变量为数字数组 1 2 3
      当 系统渲染预览
      那么 输出为无引号数字列表而非字符串字面量

    场景: string-tuple
      假如 模板使用 sql_in 且变量为字符串数组
      当 系统渲染预览
      那么 输出为带单引号并正确转义的字符串列表

  @req:r96
  规则: 列表过滤器引号一致
    系统 MUST 使 sql_in 与 inclause 在元素级引号规则上与共享 sqlLiteral 行为一致

    场景: filter-parity
      假如 同一数组分别经 sql_in 与 inclause 渲染
      当 比较元素级引号规则
      那么 两者对 number 与 string 的引号策略一致

  @req:r97
  规则: Templated 入口可发现
    系统 MUST 为 sqlsugar.copyTemplatedSql 提供默认可覆盖快捷键且命令标题不得暗示仅复制到剪贴板

    场景: discover
      假如 扩展已安装
      当 用户在命令面板搜索 Templated SQL
      那么 命令标题表明打开编辑器而非仅复制

  @req:r98
  规则: Templated 空选区扩选
    当选区为空且光标位于受支持的宿主语言字符串字面量内时，系统 MUST 在打开 Templated SQL 编辑器前自动扩选到该字面量内容

    场景: cursor-expand
      假如 光标位于含 Jinja2 的字符串字面量内且选区为空
      当 用户触发 Open Templated SQL Editor
      那么 系统扩选字面量内容并打开可视化编辑器

  @req:r99
  规则: 纯参数模板进 WebView
    系统 MUST 对仅含参数占位符（无 Jinja2）的模板也打开可视化编辑器，不得以 InputBox 作为主路径

    场景: named-only-webview
      假如 模板仅含 named 参数无 Jinja2
      当 用户触发 Open Templated SQL Editor
      那么 打开可视化编辑器且变量列表含参数名而非 InputBox

  @req:r100
  规则: 写回源选区模板
    系统 MUST 支持将编辑器中的当前模板写回触发命令时的源选区并保持宿主语言引号样式

    场景: write-back
      假如 用户在编辑器中修改模板后点击写回模板
      当 系统替换源选区
      那么 源文件字面量更新为新模板且引号样式保持

  @req:r101
  规则: 渲染结果替换选区
    系统 MUST 支持在用户显式确认后用渲染后的 SQL 替换源选区

    场景: replace-rendered
      假如 用户点击替换为渲染 SQL 并确认
      当 系统替换源选区
      那么 选区内容变为渲染后的 SQL 字面量

  @req:r102
  规则: 复制动作可区分
    系统 MUST 区分复制渲染结果与复制模板原文并给出明确成功反馈

    场景: copy-distinct
      假如 用户分别点击复制模板与复制渲染 SQL
      当 系统复制对应内容
      那么 成功提示区分模板与渲染结果

  @req:r103
  规则: Auto 分析器检测
    当 paramStyle.defaultMode 为 auto 时，系统 MUST 根据模板内容检测并启用匹配的参数分析器

    场景: auto-detect
      假如 模板同时含 named 与 asyncpg 占位符且 mode 为 auto
      当 打开可视化编辑器
      那么 named 与 asyncpg 分析器均被启用

  @req:r104
  规则: 开箱分析器默认
    系统 MUST 默认启用至少 jinja2 与 named 分析器以覆盖常见 SQLAlchemy 风格

    场景: default-analyzers
      假如 用户使用默认配置首次打开编辑器
      当 检查默认启用的分析器
      那么 至少包含 jinja2 与 named

  @req:r105
  规则: Auto 持久化策略
    系统 MUST 在 auto 模式下按内容重检测分析器且不得用历史手动勾选锁死 auto 结果；manual 模式才持久化勾选列表

    场景: auto-persist
      假如 用户曾在 manual 只勾选 jinja2 后改回 auto
      当 再次打开含 :param 的模板
      那么 auto 重检测启用 named 而非锁死仅 jinja2

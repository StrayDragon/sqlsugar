---
llman_spec_valid_scope:
  - src/features/jinja2/
  - src/test/
llman_spec_valid_commands:
  - pnpm run test
  - pnpm run check-types
llman_spec_evidence:
  - "pnpm run test 通过"
  - "手动测试: 选中 Jinja2 SQL 模板触发可视化编辑器"
---

```toon
kind: llman.sdd.spec
name: "jinja2-visual-editor"
purpose: 提供基于 WebView 的 Jinja2 SQL 模板可视化编辑器，支持变量类型推断、实时 SQL 预览、智能默认值生成，帮助用户快速生成参数化的 SQL 查询。
requirements[13]{req_id,title,statement}:
  "R-J2E-001",AST 变量提取,系统 MUST 通过 Nunjucks AST 解析提取模板变量并回退到正则匹配
  "R-J2E-002",类型推断,系统 MUST 基于变量名称模式推断类型(string/number/boolean/date)
  "R-J2E-003",可视化编辑器,系统 MUST 提供 Lit 组件实现的可视化编辑器支持点击变量弹出编辑框
  "R-J2E-004",实时预览,系统 MUST 提供实时 SQL 预览并使用 highlight.js 语法高亮
  "R-J2E-005",滚动同步,系统 SHALL 支持模板面板与预览面板双向滚动同步
  "R-J2E-006",混合模板,"系统 MUST 支持 SQLAlchemy :param 占位符与 Jinja2 {{ var }} 混合模板"
  "R-J2E-007",SQL 过滤器,系统 MUST 提供自定义 SQL 过滤器(sql_quote/sql_identifier/sql_date 等)
  "R-J2E-008",剪贴板复制,"系统 MUST 支持复制渲染结果到剪贴板含 Linux Wayland wl-copy 回退"
  "R-J2E-009",WebView 渲染对齐,系统 MUST 确保 WebView 端 Nunjucks 环境与 Extension 端完全一致(含 installJinjaCompat 和自定义 filter)
  "R-J2E-010",UI 组件拆分,系统 MUST 将编辑器单体组件拆分为 TemplatePanel/VariableEditor/SQLPreview/Toolbar 独立组件
  "R-J2E-011",测试覆盖,系统 MUST 达到推断系统 90% 和整体 80% 的测试覆盖率
  "R-J2E-012",Schema 感知推断,系统 MUST 利用 ORM schema 信息增强变量类型推断准确度
  "R-J2E-013",列名补全,系统 SHALL 在变量值输入时基于 schema 提供列名/表名补全建议
scenarios[13]{req_id,id,given,when,then}:
  "R-J2E-001",baseline,"模板含 {{ user_id }} 和 {% if is_active %}",用户打开可视化编辑器,变量列表显示 user_id 和 is_active
  "R-J2E-002",baseline,变量名为 user_id 和 is_active,编辑器推断变量类型,user_id 推断为 number 且 is_active 推断为 boolean
  "R-J2E-003",baseline,编辑器已打开含多个变量的模板,用户点击模板中高亮的变量,弹出编辑框且可修改变量值
  "R-J2E-004",baseline,用户在编辑器中修改变量值,触发实时预览更新,SQL 预览立即反映新值且关键字高亮
  "R-J2E-005",baseline,模板较长需要滚动,用户滚动模板面板,预览面板同步滚动到对应位置
  "R-J2E-006",baseline,"模板混合使用 :param 和 {{ var }}",用户打开可视化编辑器,两种占位符都被正确识别和处理
  "R-J2E-007",baseline,"模板使用 {{ name|sql_quote }} 过滤器",系统渲染预览,name 值被正确 SQL 转义包裹
  "R-J2E-008",baseline,用户在编辑器中完成变量填充,用户点击复制按钮,渲染后的 SQL 被复制到系统剪贴板
  "R-J2E-009",S001,模板使用自定义 sql_quote filter 和嵌套变量,WebView 渲染预览,结果与 Extension 端 processor 渲染完全一致
  "R-J2E-010",S001,编辑器打开包含 5 个变量的模板,开发者检查组件树,可见独立的 TemplatePanel/VariableEditor/SQLPreview/Toolbar 组件
  "R-J2E-011",S001,推断系统所有分支已覆盖,"运行 pnpm test:coverage",推断模块达到 90% 覆盖率
  "R-J2E-012",S001,ORM schema 显示 email 列为 String 类型,"模板中有 {{ email }} 变量",推断为 string 类型且默认值为 email 格式
  "R-J2E-013",S001,用户在变量值输入框中输入,schema 中有匹配的列名,输入框展示补全建议列表
```

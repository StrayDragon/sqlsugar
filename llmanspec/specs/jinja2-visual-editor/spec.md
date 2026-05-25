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
purpose: "提供基于 WebView 的 Jinja2 SQL 模板可视化编辑器，支持变量类型推断、实时 SQL 预览、智能默认值生成，帮助用户快速生成参数化的 SQL 查询。"
requirements[8]{req_id,title,statement}:
  R-J2E-001,AST 变量提取,系统 MUST 通过 Nunjucks AST 解析提取模板变量并回退到正则匹配
  R-J2E-002,类型推断,系统 MUST 基于变量名称模式推断类型(string/number/boolean/date)
  R-J2E-003,可视化编辑器,系统 MUST 提供 Lit 组件实现的可视化编辑器支持点击变量弹出编辑框
  R-J2E-004,实时预览,系统 MUST 提供实时 SQL 预览并使用 highlight.js 语法高亮
  R-J2E-005,滚动同步,系统 SHALL 支持模板面板与预览面板双向滚动同步
  R-J2E-006,混合模板,系统 MUST 支持 SQLAlchemy :param 占位符与 Jinja2 {{ var }} 混合模板
  R-J2E-007,SQL 过滤器,系统 MUST 提供自定义 SQL 过滤器(sql_quote/sql_identifier/sql_date 等)
  R-J2E-008,剪贴板复制,系统 MUST 支持复制渲染结果到剪贴板含 Linux Wayland wl-copy 回退
scenarios[8]{req_id,id,given,when,then}:
  R-J2E-001,baseline,"模板含 {{ user_id }} 和 {% if is_active %}","用户打开可视化编辑器","变量列表显示 user_id 和 is_active"
  R-J2E-002,baseline,"变量名为 user_id 和 is_active","编辑器推断变量类型","user_id 推断为 number 且 is_active 推断为 boolean"
  R-J2E-003,baseline,"编辑器已打开含多个变量的模板","用户点击模板中高亮的变量","弹出编辑框且可修改变量值"
  R-J2E-004,baseline,"用户在编辑器中修改变量值","触发实时预览更新","SQL 预览立即反映新值且关键字高亮"
  R-J2E-005,baseline,"模板较长需要滚动","用户滚动模板面板","预览面板同步滚动到对应位置"
  R-J2E-006,baseline,"模板混合使用 :param 和 {{ var }}","用户打开可视化编辑器","两种占位符都被正确识别和处理"
  R-J2E-007,baseline,"模板使用 {{ name|sql_quote }} 过滤器","系统渲染预览","name 值被正确 SQL 转义包裹"
  R-J2E-008,baseline,"用户在编辑器中完成变量填充","用户点击复制按钮","渲染后的 SQL 被复制到系统剪贴板"
```

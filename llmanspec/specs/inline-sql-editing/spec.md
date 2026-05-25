---
llman_spec_valid_scope:
  - src/features/inline-sql/
  - src/test/
llman_spec_valid_commands:
  - pnpm run test
  - pnpm run check-types
llman_spec_evidence:
  - "pnpm run test 通过"
  - "手动测试: Python/JS/TS 中选中 SQL 字符串触发编辑命令"
---

```toon
kind: llman.sdd.spec
name: "inline-sql-editing"
purpose: "在 VS Code 中选中嵌入代码的 SQL 字符串，打开独立临时 .sql 文件进行编辑，保存后自动回写到原始代码位置。支持多语言引号处理和缩进同步。"
requirements[6]{req_id,title,statement}:
  R-ISE-001,Python 字符串处理,系统 MUST 支持 Python 单引号/双引号/三引号 SQL 字符串提取和回写并保持 f/r/u 前缀
  R-ISE-002,JS/TS 字符串处理,系统 MUST 支持 JavaScript/TypeScript 模板字面量和普通字符串的 SQL 提取
  R-ISE-003,ORM 占位符转义,系统 MUST 将 SQLAlchemy :param 占位符在临时文件中转义并在回写时还原
  R-ISE-004,缩进同步,系统 MUST 在 Python 多行字符串回写时保持精确缩进同步
  R-ISE-005,临时文件清理,系统 MUST 支持可配置的临时文件自动清理策略
  R-ISE-006,SQL 内容检测,系统 SHALL 通过关键词启发式检测内容是否为 SQL 并允许用户确认
scenarios[6]{req_id,id,given,when,then}:
  R-ISE-001,baseline,"用户在 Python 文件中有三引号 SQL","用户选中并触发编辑命令","临时文件打开且引号和前缀正确处理"
  R-ISE-002,baseline,"用户在 TypeScript 文件中有模板字面量 SQL","用户选中并触发编辑命令","临时文件打开且反引号正确处理"
  R-ISE-003,baseline,"SQL 中包含 :user_id 占位符","用户在临时文件编辑后保存","占位符在原文件中正确还原"
  R-ISE-004,baseline,"Python 多行 SQL 有 8 空格缩进","用户编辑临时文件添加新行后保存","新行回写时保持 8 空格缩进"
  R-ISE-005,baseline,"配置 tempFileCleanup 为 true","用户关闭临时文件","临时文件被自动删除"
  R-ISE-006,baseline,"用户选中的文本不含 SQL 关键词","用户触发编辑命令","系统弹出确认对话框询问是否继续"
```

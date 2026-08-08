## Tasks

### T001: 纯参数占位符统一进 WebView

- [x] 移除/旁路 InputBox `handleSQLAlchemyOnly` 主路径
- [x] named-only 模板构造 param 变量并打开 WebView
- [x] 单测或断言：纯 `:param` 模板产生带 `paramPattern` 的变量列表

estimated: 2h
depends: none

### T002: 源选区写回与渲染替换

- [x] `showEditor` 携带 SourceEditContext
- [x] 实现 `writeBackTemplate` / `replaceWithRendered`（二次确认）
- [x] 回写使用 `wrapLikeIntelligent` 保持引号样式

estimated: 3h
depends: T001

### T003: 工具栏动作与复制反馈

- [x] 工具栏区分「复制模板」「复制渲染 SQL」「写回模板」「替换为渲染 SQL」
- [x] 复制成功短提示；写回成功 InformationMessage

estimated: 2h
depends: T002

### T004: 校验

- [x] type-check + 相关单元测试通过
- [x] `llman sdd validate templated-editor-workflow-closure --strict --no-interactive`

estimated: 1h
depends: T003

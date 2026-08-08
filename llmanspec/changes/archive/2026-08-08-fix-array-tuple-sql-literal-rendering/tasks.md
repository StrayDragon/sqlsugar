## Tasks

### T001: 对齐 sql_in 与 sqlLiteral

- [x] 将 `sql_in` 改为基于 `sqlLiteral`（或共享 `formatSqlInList`）按元素类型输出
- [x] 明确空数组与非数组输入的输出约定并写进注释
- [x] 单元测试：数字数组 → `1, 2, 3`；字符串数组 → `'a', 'b'`；混型；`O'Brien` 转义；与 `inclause` 元素规则一致

estimated: 2h
depends: none

### T002: Array 类型可编辑

- [x] 类型选择器与 `validateVariableType` 纳入 `array`
- [x] `formatValueForEdit` / `parseValueFromEdit` 支持 JSON 数组
- [x] 默认/推断：`sql_in`/`inclause` 或 `*_ids`/`*_list` 给出合理 array 样本
- [x] 测试覆盖 array 解析失败时的回退行为

estimated: 3h
depends: T001

### T003: 回归与校验

- [x] 扩展 `templated-sql-editor-bugfix.test.ts` 或 `nunjucks-setup.test.ts` 锁定两类元组期望
- [x] `just test`（或 `pnpm test`）相关套件全绿
- [x] `llman sdd validate fix-array-tuple-sql-literal-rendering --strict --no-interactive`

estimated: 1h
depends: T002

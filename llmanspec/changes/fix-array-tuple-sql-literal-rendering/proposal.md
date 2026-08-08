---
depends_on: []
---

# 修复数组/元组 SQL 字面量渲染（数字 vs 字符串）

## Why

Templated SQL 预览里，用户需要 `IN (1, 2, 3)` 数字元组与 `IN ('1', '2', '3')` 字符串元组时极易渲染错。证据：

1. `sql_in` 过滤器对**所有**元素一律加单引号（`nunjucks-setup.ts`），数字数组也会变成 `'1', '2', '3'`；而同文件的 `inclause`/`sqlLiteral` 已按类型区分——行为不一致。
2. 类型选择器与 `validateVariableType` **未包含 `array`**，列表常被当成 string/number；编辑框把 `[1,2,3]` 解析路径不稳定。
3. 裸写 `IN ({{ id_list }})` 且无 `sql_in`/`inclause` 时，Nunjucks 对数组的默认字符串化不符合 SQL IN 字面量预期。
4. Spec 已有 `R-J2E-017`（array/enum 交互），但类型 UI 与字面量格式化未闭环，导致「模板替换不符合预期」。

这是模板编辑器正确性 bug，应优先于写回闭环修复。

## What Changes

- 统一列表字面量格式化：`sql_in` 与 `inclause`/`sqlLiteral` 对齐——number/boolean/null 不误加引号；string 才加引号并转义
- 类型系统与 UI：类型选择器支持 `array`；解析/编辑支持 JSON 数组；可选 element type（number vs string）或按元素 typeof 渲染
- 对 `*_list` / `*_ids` / `IN (...)` 上下文加强默认推断为 array + 合理样本（`[1,2,3]` vs `['a','b']`）
- 裸数组输出策略明确（文档 + 行为）：推荐过滤器；或对明显 IN 上下文给出预览提示/自动建议
- 回归测试：数字元组、字符串元组、混型、空数组、`O'Brien` 转义、`sql_in` vs `inclause` 对齐

## Capabilities

1. **按元素类型输出字面量**：系统 MUST 将数组渲染为 SQL IN 列表时，对 number/boolean/null 使用无误引号的字面量，对 string 使用正确转义的引号字面量
2. **过滤器一致**：系统 MUST 使 `sql_in` 与 `inclause`（及共享 `sqlLiteral`）在元素级引号规则上一致
3. **Array 类型可编辑**：系统 MUST 在可视化编辑器中支持将变量类型设为 array，并以可解析的数组字面量编辑值
4. **列表推断**：系统 SHOULD 对名称/过滤器/IN 上下文暗示集合的变量默认推断为 array 并给出类型正确的样本值
5. **回归保障**：系统 MUST 用测试锁定 `(1, 2, 3)` 与 `('1', '2', '3')` 两类期望输出

## Impact

- 触及：`src/shared/nunjucks-setup.ts`、`variable-utils.ts`、templated-sql-editor 类型 UI、相关 vitest
- 风险：中；修复 `sql_in` 会改变现有「全当字符串」行为——对依赖错误引号的用户是 breaking fix，属正确性修复
- 阻断：建议作为 Wave 1 优先；`templated-editor-workflow-closure` 依赖本 change

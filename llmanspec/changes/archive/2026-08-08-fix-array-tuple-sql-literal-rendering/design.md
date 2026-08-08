# Design — fix-array-tuple-sql-literal-rendering

## 问题根因

| 路径 | 现状 | 期望 |
|------|------|------|
| `sql_in` | 元素一律 `'${String(v)}'` | 与 `sqlLiteral` 一致：number 裸输出、string 加引号 |
| `inclause` | 已用 `sqlLiteral` | 保持；成为共享基准 |
| 类型 UI | 无 `array`；`validateVariableType` 不含 array | 可选 array，JSON 编辑 |
| 裸 `{{ list }}` | Nunjucks 默认 join，非 SQL IN | 文档推荐 filter；推断侧给 array 样本 |

## 方案

1. **单一字面量函数**：所有 IN/列表过滤器走 `sqlLiteral`（或抽出 `formatSqlInList(values)` = `items.map(sqlLiteral).join(', ')`）。
2. **`sql_in` 对齐**：输出 `1, 2, 3` 或 `'a', 'b'`（不含外层括号，与现有 `IN ({{ x\|sql_in }})` 用法兼容）；空数组约定与 `inclause` 文档化（`sql_in` 空 → 空串或 `null`，在 tasks 中定一条并测死）。
3. **UI**：类型下拉加 `array`；`parseValueFromEdit`/`formatValueForEdit` 对 array 走 JSON；样本值按名称启发式。
4. **不做**：本 change 不改写回选区、不改命令发现。

## 权衡

- Breaking：依赖「数字也被加引号」的错误预览会被纠正——接受为 bugfix。
- 混型数组 `[1, 'a']`：按元素 typeof 分别格式化。

## 测试 seam

- Public：`createAlignedNunjucksEnv().renderString` + `sql_in`/`inclause`
- UI 工具：`parseValueFromEdit` / 类型校验（单测或现有 editor bugfix 扩展）

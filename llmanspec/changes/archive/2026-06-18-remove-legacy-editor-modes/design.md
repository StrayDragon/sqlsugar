# Design — remove-legacy-editor-modes

## 决策：彻底去掉 mode 参数

`mode` 唯一取值已是 `'webview'`。保留单值参数（`mode: 'webview'`）无意义且仍暗示多模式；故彻底删除 `handleCopyTemplatedSql` / `processTemplate` 的 `mode` 参数，`processTemplate` 直接走 webview 流程（无 switch）。`index.ts` 调用同步去掉 `'webview'` 实参。

## 辅助方法去留（已核实引用，行号为当前 command-handler.ts）

| 方法 | 引用点 | 去留 |
|---|---|---|
| handleQuickMode / handleWizardMode / handleDefaultsMode | 仅被 switch case 调用 | 删 |
| getDefaultValues | 仅 quick(205) + wizard(236) | 删 |
| promptForVariable | 仅 defaults(317) | 删 |
| formatDefaultValue | 仅 defaults(300) | 删 |
| handleWebviewMode | webview 入口 | 留 |
| handleSQLAlchemyOnly | 纯 SQLAlchemy 占位符路径(85) | 留 |
| copyToClipboard / copyToClipboardWithFallback / copyWithWlCopy | 被 handleSQLAlchemyOnly(184) 等共享 | 留 |
| promptForSQLAlchemyVariable | 被 handleSQLAlchemyOnly(173) | 留 |
| extractVariables / getProcessor / validateTemplate / getSupportedFeatures / getSupportedFilters | 公共 API | 留 |

> 删除 `getDefaultValues` 后，`VariableProcessingContext` 等仅因其存在的 import 可能变为未使用，由 apply 阶段 check-types 兜底清理。

## 非目标

不改 `handleSQLAlchemyOnly` 行为；不动引擎层（processor/Jinja2Variable/Jinja2NunjucksHandler 类名）；不迁目录；不改 spec id。

## 验证标准

- 残留检查无命中：
  ```bash
  rg -n "handleQuickMode|handleWizardMode|handleDefaultsMode|getDefaultValues|formatDefaultValue|'quick'|'wizard'|'defaults'" src/features/jinja2
  ```
  （`promptForVariable` 需单独确认未被误删 `promptForSQLAlchemyVariable`，二者非子串关系，安全。）
- `pnpm run check-types` 通过。
- `pnpm test` 通过（232）。
- `just spec-validate` 通过。
- `just build` 通过。

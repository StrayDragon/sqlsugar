## Tasks

### T001: 移除 mode 参数与 switch

- [x] `handleCopyTemplatedSql` 去掉 `mode` 参数与默认值 `= 'quick'`
- [x] `processTemplate` 去掉 `mode` 参数；删除 `switch(mode)`，直接 `return await this.handleWebviewMode(selectedText, allVariables, placeholderDetection)`
- [x] `src/features/jinja2/index.ts` 调用去掉 `'webview'` 实参

estimated: 1h
depends: none

### T002: 删除死分支方法与专属辅助

- [x] 删除 `handleQuickMode` / `handleWizardMode` / `handleDefaultsMode`
- [x] 删除 `getDefaultValues` / `promptForVariable` / `formatDefaultValue`（已核实无其他引用）
- [x] 清理因删除产生的未使用 import（如 `VariableProcessingContext`，由 check-types 兜底）

estimated: 1h
depends: T001

### T003: 校验（完成标准）

- [x] 残留检查无命中：`rg -n "handleQuickMode|handleWizardMode|handleDefaultsMode|getDefaultValues|formatDefaultValue|'quick'|'wizard'|'defaults'" src/features/jinja2`
- [x] `pnpm run check-types` 通过
- [x] `pnpm test` 通过（232）
- [x] `just spec-validate` 通过
- [x] `just build` 通过

estimated: 1h
depends: T001, T002

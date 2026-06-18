# Proposal — refactor-move-templated-sql-dir

## Why

A 轮重命名（`refactor-rename-to-templated-sql-editor`）仅覆盖了编辑器实体层：命令 ID、配置键、视图类型、UI 组件标签。但 feature 目录仍为 `src/features/jinja2/`，引擎类名仍含 `Jinja2`/`Jinja2Nunjucks` 前缀，导致产品定位与代码结构脱节。

本次变更完成结构层"再定位"：目录迁移 + 引擎类名重命名，使代码组织与产品定位一致。

## What Changes

1. **目录迁移**：`src/features/jinja2/` → `src/features/templated-sql/`
2. **Vitest 别名**：`@jinja2` → `@templated-sql`（vitest.config.ts）
3. **esbuild 入口**：webview 入口路径更新
4. **引擎类名重命名**：
   - `Jinja2NunjucksHandler` → `TemplatedSqlHandler`（command-handler.ts）
   - `Jinja2NunjucksProcessor` → `TemplateProcessor`（processor.ts）
   - `Jinja2Variable` → `TemplateVariable`（ui/types.ts + 所有引用）
   - `Jinja2Analyzer` → `TemplateExpressionAnalyzer`（analyzers/）
   - `registerJinja2Feature` → `registerTemplatedSqlFeature`（index.ts）
   - `Jinja2VariableValue` / `Jinja2VariableType` → `TemplateVariableValue` / `TemplateVariableType`（shared/types.ts）
5. **共享文件重命名**：`src/shared/jinja2-patterns.ts` → `src/shared/template-patterns.ts`
6. **全量 import 路径更新**：所有 `../features/jinja2/` 和 `../../shared/jinja2-patterns` 引用
7. **vitest.config.ts 覆盖率路径**：`src/features/jinja2/processor.ts` → `src/features/templated-sql/processor.ts`
8. **test describe/注释**：更新测试描述中的旧类名

**不动**：
- `JINJA2_REGEX` / `JINJA2_KEYWORDS` 常量名（描述模板语法技术，非产品实体）
- `'jinja2'` 参数类型值（analyzer type 标识符，描述技术类型）
- SDD spec id `jinja2-visual-editor`（后续 C 轮处理）

## Capabilities

- `jinja2-visual-editor`（R-J2E-018 延伸：从实体层扩展到结构层）

## Impact

- **规模**：大 — 涉及目录移动 + 全量 import 路径 + 类名重命名
- **风险**：中 — 纯重命名，无逻辑变更；但覆盖面广，遗漏会导致编译失败
- **验证**：`just lint` + `just test` + `just build` 全绿

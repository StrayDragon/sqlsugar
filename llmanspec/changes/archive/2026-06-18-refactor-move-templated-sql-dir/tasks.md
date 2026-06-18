# Tasks — refactor-move-templated-sql-dir

## 实施清单

- [x] 1. 目录移动：`git mv src/features/jinja2 src/features/templated-sql`
- [x] 2. 共享文件重命名：`git mv src/shared/jinja2-patterns.ts src/shared/template-patterns.ts`
- [x] 3. 更新 `src/shared/template-patterns.ts` 内部注释（移除 "jinja2-patterns" 文件名引用）
- [x] 4. 更新 processor.ts 和 template-parser.ts 中的 `jinja2-patterns` import 路径 → `template-patterns`
- [x] 5. 重命名 `Jinja2NunjucksProcessor` → `TemplateProcessor`（processor.ts 定义 + 全量引用）
- [x] 6. 重命名 `Jinja2NunjucksHandler` → `TemplatedSqlHandler`（command-handler.ts 定义 + index.ts 引用）
- [x] 7. 重命名 `Jinja2Analyzer` → `TemplateExpressionAnalyzer`（analyzers/jinja2-analyzer.ts 定义 + 全量引用）
- [x] 8. 重命名 `Jinja2Variable` / `Jinja2VariableValue` / `Jinja2VariableType` → `TemplateVariable` / `TemplateVariableValue` / `TemplateVariableType`（shared/types.ts + ui/types.ts + 全量引用）
- [x] 9. 重命名 `registerJinja2Feature` → `registerTemplatedSqlFeature`（index.ts 定义 + extension.ts 引用）
- [x] 10. 更新所有外部 import 路径：`../features/jinja2/` → `../features/templated-sql/`（core/adapters.ts, core/extension.ts, src/test/*.ts）
- [x] 11. 更新 vitest.config.ts：别名 `@jinja2` → `@templated-sql`，覆盖率路径
- [x] 12. 更新 esbuild.js：webview 入口路径
- [x] 13. 更新 test describe/注释中的旧类名
- [x] 14. 验证：`just lint && just test && just build` 全绿
- [x] 15. 归档：`just sdd_archive_run refactor-move-templated-sql-dir`

## 完成标准

- `src/features/jinja2/` 目录不存在
- `src/features/templated-sql/` 包含全部原文件
- `grep -r "Jinja2Nunjucks\|registerJinja2\|features/jinja2\|jinja2-patterns" src/ --include="*.ts"` 返回零结果
- `just lint` + `just test` + `just build` 全绿

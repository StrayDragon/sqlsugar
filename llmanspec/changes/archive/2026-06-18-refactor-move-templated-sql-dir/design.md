# Design — refactor-move-templated-sql-dir

## 决策记录

### D1：目录迁移策略

**选择**：`git mv` 整目录一次性移动

**理由**：
- git 能追踪文件历史（`git log --follow`）
- 一次 diff 完成，避免中间态
- 相对路径在目录内部自洽，只需更新外部引用

**备选**：逐文件移动 → 放弃，产生大量噪音 diff，无额外收益

### D2：引擎类名命名方案

| 原名 | 新名 | 理由 |
|------|------|------|
| `Jinja2NunjucksHandler` | `TemplatedSqlHandler` | 产品实体层命名，与目录一致 |
| `Jinja2NunjucksProcessor` | `TemplateProcessor` | 处理器不绑定具体技术栈，目录已提供上下文 |
| `Jinja2Variable` | `TemplateVariable` | 同上 |
| `Jinja2Analyzer` | `TemplateExpressionAnalyzer` | 明确是表达式分析器 |
| `registerJinja2Feature` | `registerTemplatedSqlFeature` | 产品功能注册 |
| `Jinja2VariableValue` / `Jinja2VariableType` | `TemplateVariableValue` / `TemplateVariableType` | 与 TemplateVariable 一致 |

**保留不动**：
- `JINJA2_REGEX` / `JINJA2_KEYWORDS`：描述 Jinja2 模板语法的技术常量，非产品实体
- `'jinja2'` 参数类型值：analyzer type 标识符，描述技术类型
- `jinja2-patterns.ts` 内部的 `extractVariableFromExpression` / `isJinja2Keyword` 函数名：同理

### D3：共享文件重命名

`src/shared/jinja2-patterns.ts` → `src/shared/template-patterns.ts`

文件内容描述的是 Jinja2/Nunjucks 模板语法的正则模式。文件名中的 "jinja2" 是技术描述，但作为共享模块的文件名，使用更通用的 `template-patterns` 更合适（模块已在 jinja2 feature 外被引用）。

### D4：SDD spec id 暂不改

`jinja2-visual-editor` spec id 留到 C 轮单独处理（需手工移动目录 + 重建 baseline，与代码变更解耦）。

## 风险评估

- **编译失败**：遗漏 import 路径或类名 → 验证 gate（lint + test + build）捕获
- **git 历史断裂**：`git mv` 保留追踪，`--follow` 可查
- **覆盖范围**：sed 替换需精确匹配复合 token，避免误改保留项

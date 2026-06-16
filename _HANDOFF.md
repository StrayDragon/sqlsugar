# _HANDOFF.md - 当前状态与问题整理

## 变更信息

- **变更 ID**: `add-param-style-placeholder-support`
- **状态**: 实施中（部分完成）
- **VSIX**: `sqlsugar.vsix` (1.22 MB)

---

## ✅ 已完成的功能

### 1. 分析器管道架构
- `AnalyzerPipeline` 类支持多分析器注册、优先级排序、短路执行
- 5 个参数风格分析器：Jinja2、Named、Numeric、Pyformat、Asyncpg
- 文件：`src/features/jinja2/analyzers/`

### 2. 分析器选择 UI
- `AnalyzerSelector` 组件已集成到 Toolbar
- 支持自动检测/手动多选模式
- 文件：`src/features/jinja2/ui/components/analyzer-selector.ts`

### 3. 变量编辑器
- `VariableEditor` 支持显示 Jinja2 变量和参数占位符
- 淡色类型标签区分来源
- 文件：`src/features/jinja2/ui/components/variable-editor.ts`

### 4. 命令处理器集成
- `command-handler.ts` 的 `extractVariables()` 方法已更新
- 使用分析器管道提取所有参数风格
- 验证逻辑已扩展支持所有参数风格

### 5. 配置项
- `package.json` 添加 `sqlsugar.paramStyle.enabledAnalyzers` 和 `sqlsugar.paramStyle.defaultMode`

### 6. 测试
- 94 个新增测试全部通过
- 232 个总测试全部通过

---

## ❌ 未完成的功能

### 问题：模板高亮中参数占位符不可点击

**现象**：
- 编辑器正确检测到 4 个变量（`$1`, `$2`, `$3`, `$4`）
- 变量列表正确显示
- 但模板视图中参数占位符**没有高亮**，**无法点击**

**根本原因**：

`template-highlighter.ts` 中的 `highlightParameterPlaceholders()` 方法没有正确工作。

**已尝试的修复**：
1. ✅ 添加了 `highlightParameterPlaceholders()` 方法
2. ✅ 在 `highlightTemplateWithSQL()` 末尾调用
3. ✅ 更新了 `isInsideSpan()` 检测逻辑
4. ❌ 仍然不工作

**可能的原因**：

1. **highlight.js 语法高亮干扰**：SQL 语法高亮可能将 `$1` 包装在 `<span class="hljs-number">` 等标签中，导致正则匹配失败

2. **正则表达式问题**：高亮后的 HTML 中 `$1` 可能被转义或拆分

3. **调用时机问题**：`highlightParameterPlaceholders()` 可能在语法高亮之后没有正确执行

---

## 🔍 调试建议

### 方法1：在浏览器中调试 WebView

1. 在 VS Code 中打开 Jinja2 编辑器
2. 按 `Ctrl+Shift+I` 打开开发者工具
3. 在 Console 中检查高亮后的 HTML：
   ```javascript
   document.querySelector('.template-display').innerHTML
   ```
4. 查看 `$1` 等参数是否被包裹在 `<span>` 中

### 方法2：添加调试日志

在 `template-highlighter.ts` 的 `highlightParameterPlaceholders()` 方法开头添加：

```typescript
private highlightParameterPlaceholders(html: string): string {
  console.log('[DEBUG] highlightParameterPlaceholders input:', html.substring(0, 200));
  let result = html;
  // ...
  console.log('[DEBUG] highlightParameterPlaceholders output:', result.substring(0, 200));
  return result;
}
```

### 方法3：简化实现

如果高亮逻辑太复杂，可以考虑在 `jinja2-editor-v2.ts` 的 `highlightTemplate()` 方法中直接处理参数占位符，而不是在 `template-highlighter.ts` 中处理。

---

## 📁 关键文件

| 文件 | 作用 | 状态 |
|------|------|------|
| `src/features/jinja2/analyzers/*.ts` | 分析器管道 | ✅ 完成 |
| `src/features/jinja2/command-handler.ts` | 命令处理器 | ✅ 已更新 |
| `src/features/jinja2/ui/utils/template-highlighter.ts` | 模板高亮 | ❌ 有问题 |
| `src/features/jinja2/ui/components/jinja2-editor-v2.ts` | 主编辑器 | ⚠️ 部分更新 |
| `src/features/jinja2/ui/components/analyzer-selector.ts` | 分析器选择器 | ✅ 完成 |
| `src/features/jinja2/ui/components/variable-editor.ts` | 变量编辑器 | ✅ 完成 |

---

## 🎯 下一步

1. **调试高亮逻辑**：确认 `highlightParameterPlaceholders()` 是否被调用，输出是否正确

2. **简化实现**：如果调试困难，考虑在 `jinja2-editor-v2.ts` 中直接用正则替换参数占位符

3. **测试用例**：
   ```sql
   -- 测试1：Asyncpg 风格
   SELECT * FROM users WHERE id = $1;
   
   -- 测试2：Named 风格
   SELECT * FROM users WHERE id = :user_id;
   
   -- 测试3：混合风格
   SELECT * FROM users WHERE id = $1 AND name = :name;
   ```

---

## 📦 构建命令

```bash
# 类型检查
pnpm run check-types

# 运行测试
pnpm vitest run

# 构建 VSIX
pnpm run vsix

# 修复 lint
pnpm run lint:fix
```

---

## 🔗 相关文档

- 变更提案：`llmanspec/changes/add-param-style-placeholder-support/proposal.md`
- 设计文档：`llmanspec/changes/add-param-style-placeholder-support/design.md`
- 任务列表：`llmanspec/changes/add-param-style-placeholder-support/tasks.md`

---

*最后更新：2026-06-16*

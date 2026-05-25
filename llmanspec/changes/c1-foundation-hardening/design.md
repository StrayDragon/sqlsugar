## Design

### 临时文件清理

采用与现有 `registerSaveListener` 相同的 per-file disposable 模式，添加 `registerCloseListener`：

```typescript
private registerCloseListener(tempFileInfo: TempFileInfo): void {
  const disposable = vscode.workspace.onDidCloseTextDocument(doc => {
    if (doc.uri.fsPath === tempFileInfo.uri.fsPath) {
      this.cleanupTempFile(tempFileInfo.uri);
    }
  });
  tempFileInfo.disposables.push(disposable);
}
```

`cleanupOnClose` 为 false 时，改为在 `handleTempFileChange`（save hook）成功 sync 后触发清理。

### WebView 渲染对齐

抽取共享模块 `src/shared/nunjucks-setup.ts`：

```typescript
export function createAlignedNunjucksEnv(): nunjucks.Environment {
  const env = new nunjucks.Environment(null, { autoescape: false, throwOnUndefined: false });
  nunjucks.installJinjaCompat();
  registerSQLFilters(env);
  registerCustomGlobals(env);
  return env;
}

export function buildNestedContext(flat: Record<string, unknown>): Record<string, unknown> { ... }
```

Extension 端 `processor.ts` 和 WebView 端 `jinja2-editor-v2.ts` 都 import 此模块。esbuild 的 browser target 会自动解析 nunjucks 的 browser bundle。

### UI 组件拆分策略

拆分为 4 个独立 Lit 组件，通过 `@property` 传递数据、通过 `CustomEvent` 通信：

- `<template-panel>` — 模板显示 + 变量高亮 + 点击事件
- `<variable-editor>` — 变量列表 + 弹出编辑器 + 类型选择
- `<sql-preview-panel>` — 渲染结果 + 语法高亮 + 滚动同步
- `<editor-toolbar>` — 复制/提交/取消按钮 + 设置

### Provider 架构

采用渐进迁移：DIContainerAdapter 桥接旧代码，新代码直接使用 ProviderRegistry。优先实现 `LanguageProvider` 和 `InferenceProvider` 两个最关键接口。

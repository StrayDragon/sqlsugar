## Design

### 技术选型

- **Parser**: `node-sql-parser` — 支持 MySQL/PostgreSQL/SQLite/BigQuery 等多方言，AST 可用于验证和分析
- **Formatter**: `sql-formatter` — 高度可配置，支持主要方言，输出稳定

### Jinja2 模板预处理

在 SQL parser 之前，预处理器将模板语法替换为合法 SQL 占位符：

```
{{ variable }}        → __J2_VAR_0__
{% if condition %}    → /* __J2_BLOCK_0__ */
{% endif %}           → /* __J2_ENDBLOCK_0__ */
{% for x in items %}  → /* __J2_FOR_0__ */
{% endfor %}          → /* __J2_ENDFOR_0__ */
```

Parser 错误位置通过偏移量映射回原始模板位置。

### 架构

```
SQLIntelligenceService
├── TemplatePreprocessor  (Jinja2 → 占位符)
├── SQLParserService      (node-sql-parser wrapper)
├── SQLFormatterService   (sql-formatter wrapper)
├── DiagnosticsProvider   (VS Code Diagnostic API)
└── DialectManager        (状态栏 + 配置 + 自动检测)
```

所有服务通过 ProviderRegistry 的 `DialectProvider` 接口暴露，支持第三方扩展。

### 激活策略

仅在以下条件激活 SQL intelligence：
1. 打开 `.sql` 文件
2. 打开 inline-sql 临时文件（`.vscode/sqlsugar/temp/`）
3. 用户手动触发格式化命令

避免对所有文件进行扫描的性能开销。

## Tasks

### T001: 集成 SQL Parser

- [ ] 安装 `node-sql-parser` 依赖
- [ ] 创建 `src/features/sql-intelligence/` 模块结构
- [ ] 实现 `SQLParserService` 封装 node-sql-parser 多方言 API
- [ ] 处理 Jinja2 模板语法的预处理（临时替换 `{{ }}`/`{% %}` 为占位符）
- [ ] 添加解析测试覆盖主要方言

estimated: 4h
depends: 001/T005

### T002: SQL 格式化

- [ ] 安装 `sql-formatter` 依赖
- [ ] 实现 `SQLFormatterService` 封装格式化 API
- [ ] 注册为 VS Code `DocumentFormattingEditProvider`
- [ ] 支持配置项：缩进风格、关键字大小写、最大行宽
- [ ] 对 inline-sql 临时文件自动应用格式化
- [ ] 添加格式化输出测试

estimated: 3h
depends: T001

### T003: 实时语法验证

- [ ] 实现 `SQLDiagnosticsProvider` 使用 `DiagnosticCollection`
- [ ] 监听 `onDidChangeTextDocument` 触发验证（debounce）
- [ ] 将 parser 错误映射为 VS Code `Diagnostic`（位置、严重级别）
- [ ] 对含 Jinja2 模板语法的文件跳过模板部分
- [ ] 仅对 `.sql` 文件和 inline-sql 临时文件激活

estimated: 4h
depends: T001

### T004: 方言管理

- [ ] 实现 `DialectProvider` 接口（集成到 ProviderRegistry）
- [ ] 内置 PostgreSQL、MySQL、SQLite 三个 Provider
- [ ] 状态栏 `StatusBarItem` 展示当前方言
- [ ] 点击弹出 QuickPick 切换方言
- [ ] 支持文件注释 `-- dialect: xxx` 自动检测
- [ ] 支持 `sqlsugar.defaultDialect` 配置项

estimated: 3h
depends: T001, 001/T005

### T005: Jinja2 模板兼容

- [ ] 实现模板语法预处理器（提取模板 → 占位符 → 解析 → 还原位置）
- [ ] 确保 `{{ variable }}` 区域不产生 SQL 诊断
- [ ] 确保 `{% if/for %}` 控制块被正确跳过
- [ ] 测试混合模板场景

estimated: 3h
depends: T003

## Tasks

### T001: 集成 SQL Parser

- [x] 安装 `node-sql-parser` 依赖
- [x] 创建 `src/features/sql-intelligence/` 模块结构
- [x] 实现 `SQLParserService` 封装 node-sql-parser 多方言 API
- [x] 处理 Jinja2 模板语法的预处理（临时替换 `{{ }}`/`{% %}` 为占位符）
- [x] 添加解析测试覆盖主要方言

estimated: 4h
depends: 001/T005

### T002: SQL 格式化

- [x] 安装 `sql-formatter` 依赖
- [x] 实现 `SQLFormatterService` 封装格式化 API
- [x] 注册为 VS Code `DocumentFormattingEditProvider`
- [x] 支持配置项：缩进风格、关键字大小写、最大行宽
- [x] 对 inline-sql 临时文件自动应用格式化
- [x] 添加格式化输出测试

estimated: 3h
depends: T001

### T003: 实时语法验证

- [x] 实现 `SQLDiagnosticsProvider` 使用 `DiagnosticCollection`
- [x] 监听 `onDidChangeTextDocument` 触发验证（debounce）
- [x] 将 parser 错误映射为 VS Code `Diagnostic`（位置、严重级别）
- [x] 对含 Jinja2 模板语法的文件跳过模板部分
- [x] 仅对 `.sql` 文件和 inline-sql 临时文件激活

estimated: 4h
depends: T001

### T004: 方言管理

- [x] 实现 `DialectProvider` 接口（集成到 ProviderRegistry）
- [x] 内置 PostgreSQL、MySQL、SQLite 三个 Provider
- [x] 状态栏 `StatusBarItem` 展示当前方言
- [x] 点击弹出 QuickPick 切换方言
- [x] 支持文件注释 `-- dialect: xxx` 自动检测
- [x] 支持 `sqlsugar.defaultDialect` 配置项

estimated: 3h
depends: T001, 001/T005

### T005: Jinja2 模板兼容

- [x] 实现模板语法预处理器（提取模板 → 占位符 → 解析 → 还原位置）
- [x] 确保 `{{ variable }}` 区域不产生 SQL 诊断
- [x] 确保 `{% if/for %}` 控制块被正确跳过
- [x] 测试混合模板场景

estimated: 3h
depends: T003

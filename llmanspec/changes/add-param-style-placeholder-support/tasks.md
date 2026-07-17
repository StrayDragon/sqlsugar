## Tasks

### T001: 分析器管道架构设计与实现

- [x] 定义 `Analyzer` 接口（包含 name、priority、analyze 方法）
- [x] 定义 `AnalyzerResult` 接口（包含 parameters 数组、metadata）
- [x] 实现 `AnalyzerPipeline` 类（支持按优先级排序执行）
- [x] 实现短路执行模式（可配置）
- [x] 添加分析器注册和注销机制
- [x] 编写单元测试验证管道执行顺序和短路逻辑

estimated: 6h
depends: none

### T002: 参数风格分析器实现

- [x] 实现 `NamedParamAnalyzer`（提取 `:param` 格式）
- [x] 实现 `NumericParamAnalyzer`（提取 `:1`、`:2` 格式）
- [x] 实现 `PyformatParamAnalyzer`（提取 `%(param)s` 格式）
- [x] 实现 `AsyncpgParamAnalyzer`（提取 `$1`、`$2` 格式）
- [x] 为每个分析器编写单元测试（覆盖边界情况）
- [x] 实现参数去重和冲突处理逻辑

estimated: 8h
depends: T001

### T003: 分析器选择 UI 组件

- [x] 创建 `AnalyzerSelector` Lit 组件
- [x] 实现下拉菜单显示可用分析器列表
- [x] 支持自动检测模式（默认）
- [x] 支持手动多选勾选模式
- [x] 实现分析器状态持久化（localStorage）
- [x] 集成到现有 Toolbar 组件
- [x] 编写组件单元测试

estimated: 6h
depends: T001

### T004: 参数统一展示集成

- [x] 扩展 `VariableEditor` 组件支持显示参数占位符
- [x] 为不同来源的参数添加类型标识（图标/标签）
- [x] 实现参数分组显示（按来源类型）
- [x] 确保 Jinja2 变量和参数占位符的编辑体验一致
- [x] 编写集成测试验证统一展示

estimated: 4h
depends: T002, T003

### T005: 配置项扩展

- [x] 在 `package.json` 中添加 `sqlsugar.paramStyle.enabledAnalyzers` 配置项
- [x] 实现配置读取和默认值处理
- [x] 实现配置变更时的动态更新（通过 WebView 消息传递）

estimated: 2h
depends: T001

### T006: 集成测试与文档

- [x] 编写端到端测试验证多分析器协同工作
- [x] 测试自动检测模式的准确性
- [x] 测试手动多选模式的功能
- [x] 更新用户文档说明新功能
- [x] 性能测试确保多遍遍历在可接受范围内

estimated: 4h
depends: T004, T005
## Tasks

### T001: ORM Provider 接口

- [x] 定义 `ORMProvider` 接口（`discoverModels`, `parseModel`, `getSchema`）
- [x] 定义 `TableSchema`、`ColumnInfo`、`RelationInfo` 类型
- [x] 实现 `ORMDiscoveryService` 统一管理多个 Provider
- [x] 注册到 ProviderRegistry

estimated: 3h
depends: 001/T005

### T002: SQLAlchemy Model 解析

- [x] 实现 `SQLAlchemyProvider`
- [x] 静态分析 Python 文件中的 `class Xxx(Base)` 定义
- [x] 提取 `__tablename__`、`Column()` 定义、类型映射
- [x] 处理 `relationship()` 关联
- [x] 添加测试用例（含继承、Mixin 等场景）

estimated: 6h
depends: T001

### T003: Django Model 解析

- [x] 实现 `DjangoProvider`
- [x] 静态分析 `class Xxx(models.Model)` 定义
- [x] 提取字段类型映射（`CharField` → string, `IntegerField` → number）
- [x] 处理 `ForeignKey`、`ManyToManyField` 关联
- [x] 添加测试用例

estimated: 4h
depends: T001

### T004: Schema 感知推断增强

- [x] 实现 `SchemaInferenceProvider` 加入推断链
- [x] 从已发现的 schema 匹配变量名到列类型
- [x] 优先级高于 PatternInferenceProvider
- [x] 支持 `table.column` 格式的变量名解析
- [x] 在 Jinja2 编辑器中展示推断来源（"from User model"）

estimated: 4h
depends: T002, T003

### T005: 工作区扫描与缓存

- [x] 激活时后台扫描工作区中的 model 文件
- [x] 使用 `FileSystemWatcher` 监听 model 文件变化
- [x] 增量更新 schema 索引
- [x] 使用 `workspaceState` 持久化缓存
- [x] 状态栏展示扫描进度

estimated: 3h
depends: T002

### T006: 多参数绑定风格

- [x] 统一处理 `?`（positional）占位符
- [x] 统一处理 `$1`（numbered）占位符
- [x] 扩展现有 `:name` 处理为通用框架
- [x] 统一处理 `%(name)s`（Python DB-API）占位符
- [x] 在 Jinja2 编辑器中支持所有风格

estimated: 3h
depends: none

## Tasks

### T001: 模板数据结构定义

- [ ] 定义 `SQLTemplate` 接口（name, description, tags, dialect, params, body）
- [ ] 定义 `TemplateParam` 扩展类型（array, enum, optional, conditional）
- [ ] 定义 `TemplateRegistry` 管理接口
- [ ] 实现模板序列化/反序列化（YAML 格式）

estimated: 2h
depends: 001/T005

### T002: 内置模板库

- [ ] 创建 `src/features/templates/builtin/` 目录
- [ ] 编写 CRUD 模板集（select, insert, update, delete）
- [ ] 编写分页模板（offset, cursor-based）
- [ ] 编写聚合模板（group by, having, 统计函数）
- [ ] 编写 CTE 模板（递归/非递归）
- [ ] 编写窗口函数模板（rank, row_number, lag/lead）
- [ ] 每个模板附带方言变体标记（通用/PostgreSQL/MySQL）

estimated: 6h
depends: T001

### T003: 项目模板加载

- [ ] 实现 `.sqlsugar/templates/` 目录扫描
- [ ] YAML 模板文件解析和验证
- [ ] FileWatcher 监听模板变化自动重载
- [ ] 合并内置模板和项目模板到统一 registry

estimated: 3h
depends: T001

### T004: 增强参数类型系统

- [ ] 实现 `enum` 参数类型（编辑器展示下拉选择）
- [ ] 实现 `array` 参数类型（编辑器展示多值输入）
- [ ] 实现 `optional` 参数类型（编辑器展示开关）
- [ ] 实现 `conditional` block 参数（控制模板片段）
- [ ] 更新 Jinja2 可视化编辑器支持新参数类型 UI

estimated: 6h
depends: T001, 001/T003

### T005: 模板浏览和插入

- [ ] 实现命令 `sqlsugar.browseTemplates` 打开模板选择器
- [ ] QuickPick UI 展示模板列表（含标签筛选）
- [ ] 选择模板后打开 Jinja2 可视化编辑器预填充
- [ ] VS Code Snippet Provider 注册（代码内快速插入）

estimated: 4h
depends: T002, T003

### T006: 模板测试框架

- [ ] 定义测试 fixture YAML 格式（inputs + expected output）
- [ ] 实现 fixture 执行引擎（渲染 + 比对）
- [ ] 实现命令 `sqlsugar.testTemplates` 运行所有 fixture
- [ ] 输出面板展示测试结果
- [ ] 失败时展示 diff

estimated: 4h
depends: T001

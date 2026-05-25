## Why

当前 Jinja2 编辑器每次从零开始编写模板，没有复用机制。SQL 查询模式高度重复（CRUD、分页、统计、报表），如果能提供模板库和团队共享机制，将大幅减少重复工作。增强的参数类型系统（enum、array 等）能让模板交互更精确，模板测试框架确保模板质量。

## What Changes

- 内置 20+ 常见 SQL 模式模板（CRUD、分页、聚合、CTE、窗口函数、递归查询等）
- 项目模板：从 `.sqlsugar/templates/` 目录加载团队共享模板
- 增强参数类型系统：array、enum、optional、conditional block 等
- 模板测试框架：YAML fixture 定义输入/期望输出，CLI 命令验证
- 模板导入/导出：文件、URL、剪贴板
- VS Code Snippet Provider：在代码中快速插入模板
- 模板标签和分类系统
- 模板方言变体：同一模板的 PostgreSQL/MySQL/SQLite 版本
- 模板继承和组合（base + override 模式）
- CLI 命令用于 CI/CD 验证模板语法和 fixture

## Non-Goals

- 不建设在线模板市场（初版为本地 + 项目级别）
- 不实现模板版本管理（依赖 Git）
- 不支持运行时动态加载远程模板

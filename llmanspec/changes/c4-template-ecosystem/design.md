## Design

### 模板格式（YAML）

```yaml
name: paginated-query
description: 分页查询模板
tags: [pagination, select]
dialect: universal
params:
  table_name:
    type: string
    required: true
  columns:
    type: array
    default: ["*"]
  page_size:
    type: enum
    options: [10, 20, 50, 100]
    default: 20
  sort_direction:
    type: enum
    options: [ASC, DESC]
    default: DESC
  include_total:
    type: optional
    default: false
body: |
  SELECT {{ columns | join(', ') }}
  FROM {{ table_name }}
  {% if include_total %}
  -- Total count subquery
  {% endif %}
  ORDER BY id {{ sort_direction }}
  LIMIT {{ page_size }}
  OFFSET {{ offset | default(0) }}
```

### 模板 Registry 架构

```
TemplateRegistry
├── BuiltinLoader     (src/features/templates/builtin/*.yaml)
├── ProjectLoader     (.sqlsugar/templates/*.yaml)
└── TemplateIndex     (按 name/tag/dialect 索引)
```

加载优先级：项目模板 > 内置模板（同名覆盖）。

### 参数类型扩展

现有编辑器仅支持 `string | number | boolean | date`。扩展为：

| 类型 | UI 组件 | 行为 |
|------|---------|------|
| `enum` | `<select>` 下拉 | 限定选项 |
| `array` | 多行输入 / tag input | 生成列表 |
| `optional` | checkbox + 子输入 | 控制是否渲染 |
| `conditional` | checkbox | 控制模板块显隐 |

### Snippet 集成

注册 `CompletionItemProvider`，触发条件：在 Python/JS/TS 文件中输入 `sql:` 前缀。展示匹配模板，选择后插入为内联字符串并打开可视化编辑器。

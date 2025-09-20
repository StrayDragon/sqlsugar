# Jinja2 过滤器支持

SQLSugar 现在提供了全面的 Jinja2 过滤器支持，基于 Nunjucks 引擎实现，包含了 Python Jinja2 的大多数常用过滤器。

## 支持的过滤器列表

### SQL 相关过滤器
- `sql_quote` - 将字符串安全地引用为 SQL 字面量
- `sql_identifier` - 将标识符安全地引用为 SQL 标识符
- `sql_date` - 格式化日期为 SQL 日期格式
- `sql_datetime` - 格式化日期时间为 SQL 日期时间格式
- `sql_in` - 将数组格式化为 SQL IN 子句

### 类型转换过滤器
- `int` - 转换为整数，支持指定进制
- `float` - 转换为浮点数
- `string` - 转换为字符串
- `bool` - 转换为布尔值，支持字符串转换

### 字符串过滤器
- `upper` - 转换为大写
- `lower` - 转换为小写
- `title` - 标题格式（每个单词首字母大写）
- `capitalize` - 首字母大写
- `trim` - 去除首尾空白字符
- `striptags` - 移除 HTML 标签
- `truncate` - 截断字符串到指定长度
- `wordwrap` - 按指定宽度换行
- `urlencode` - URL 编码
- `replace` - 替换字符串中的内容

### 数学过滤器
- `abs` - 绝对值
- `round` - 四舍五入到指定精度
- `sum` - 计算总和，支持属性访问
- `min` - 最小值，支持属性访问
- `max` - 最大值，支持属性访问

### 列表过滤器
- `length` - 获取长度（字符串、数组、对象）
- `first` - 获取第一个元素
- `last` - 获取最后一个元素
- `join` - 用指定分隔符连接数组元素
- `reverse` - 反转数组
- `unique` - 去重
- `slice` - 数组切片
- `sort` - 排序

### 字典过滤器
- `dictsort` - 字典排序，支持按键或值排序

### JSON 过滤器
- `tojson` - 转换为 JSON 字符串

### 实用过滤器
- `filesizeformat` - 格式化文件大小
- `default` - 默认值过滤器

## 使用示例

### 基本字符串操作
```jinja2
{{ "hello world" | upper }}                    → HELLO WORLD
{{ "HELLO WORLD" | lower }}                    → hello world
{{ "hello world" | title }}                    → Hello World
{{ "  hello  " | trim }}                        → hello
{{ "<p>hello</p>" | striptags }}               → hello
{{ "hello world" | truncate(5) }}               → hello...
{{ "hello world" | replace("world", "jinja") }} → hello jinja
```

### 类型转换
```jinja2
{{ "42" | int }}                               → 42
{{ "3.14" | float }}                           → 3.14
{{ 42 | string }}                              → "42"
{{ "true" | bool }}                            → true
{{ "1" | bool }}                               → true
{{ "yes" | bool }}                             → true
```

### 数学运算
```jinja2
{{ "-5" | abs }}                               → 5
{{ "3.14159" | round(2) }}                     → 3.14
{{ [1, 2, 3] | sum }}                          → 6
{{ [3, 1, 2] | min }}                          → 1
{{ [3, 1, 2] | max }}                          → 3
```

### 列表操作
```jinja2
{{ [1, 2, 2, 3] | unique | join(", ") }}       → 1, 2, 3
{{ [1, 2, 3] | reverse | join(", ") }}         → 3, 2, 1
{{ "hello" | length }}                         → 5
{{ [1, 2, 3] | length }}                       → 3
{{ [1, 2, 3] | first }}                        → 1
{{ [1, 2, 3] | last }}                         → 3
```

### SQL 相关示例
```jinja2
{{ "O'Reilly" | sql_quote }}                    → 'O''Reilly'
{{ "column name" | sql_identifier }}            → "column name"
{{ "2023-01-01" | sql_date }}                  → 2023-01-01
{{ [1, 2, 3] | sql_in }}                       → '1', '2', '3'
```

### 实用过滤器
```jinja2
{{ undefined_var | default("default") }}       → default
{{ 1024000 | filesizeformat }}                 → 1.0MB
{{ 1024000 | filesizeformat(true) }}           → 976.6KB
{{ {"key": "value"} | tojson }}                → {"key":"value"}
```

### 复杂数据结构
```jinja2
{{ users | sum(attribute='age') }}              → 计算所有用户的年龄总和
{{ products | min(attribute='price') }}         → 找到最便宜的产品
{{ users | dictsort(attribute='name') }}        → 按用户名排序
```

## 过滤器链式调用

```jinja2
{{ "  HELLO WORLD  " | trim | lower | replace("world", "jinja") }}
→ hello jinja
```

## 条件过滤器

```jinja2
{{ user.name | default("Guest") }}
{{ status | default("active", true) }}  <!-- 布尔模式 -->
```

## 实际 SQL 模板示例

```sql
SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
  AND created_at > '{{ start_date | sql_date }}'
ORDER BY created_at DESC
LIMIT {{ max_results | int }}
```

### 渲染结果示例
```sql
SELECT * FROM orders
WHERE user_id = 123
  AND total > 50.5
  AND status IN ('active')
  AND is_deleted = FALSE
  AND created_at > '2023-01-01'
ORDER BY created_at DESC
LIMIT 10
```

## 错误处理

对于不支持的过滤器，系统会优雅地处理并返回原始值，同时输出警告信息：

```jinja2
{{ "hello" | unknown_filter }}  → hello (with warning)
```

## 与 Python Jinja2 的兼容性

本实现与 Python Jinja2 的高度兼容，支持：

- ✅ 所有常用的字符串过滤器
- ✅ 数学和统计过滤器
- ✅ 列表和字典操作过滤器
- ✅ 类型转换过滤器
- ✅ SQL 特定的实用过滤器
- ✅ 过滤器链式调用
- ✅ 参数传递
- ✅ 默认值处理

## 性能考虑

- 过滤器在模板渲染时实时计算
- 复杂过滤器（如 `dictsort`）可能影响大模板的性能
- 建议在模板外完成复杂的数据预处理
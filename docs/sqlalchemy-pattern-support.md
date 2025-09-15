# SQLAlchemy Pattern Support

SQLSugar 的终端 SQL 提取功能现在已经完全支持 SQLAlchemy 日志生成器的所有模式！

## 🔧 新增支持的模式

### ✅ 时间戳日志格式
```bash
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price
FROM products
WHERE products.category = ? AND products.price > ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000)
```

### ✅ 原始 SQL 模式
```bash
2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()
```

### ✅ 性能统计模式
```bash
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)
```

### ✅ 复杂子查询模式
```bash
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price
FROM products
WHERE EXISTS (SELECT count(reviews.id) AS count_1
FROM reviews
WHERE reviews.product_id = products.id
HAVING avg(reviews.rating) > ?)
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (4,)
```

### ✅ 多行 SQL 语句
```bash
2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine
CREATE TABLE users (
	id INTEGER NOT NULL,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (email)
)

2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()
```

### ✅ JSON 操作和日期函数
```bash
2025-09-15 22:37:56,926 INFO sqlalchemy.engine.Engine
            SELECT * FROM products
            WHERE json_extract(metadata, '$.brand') = 'Apple'

2025-09-15 22:37:56,926 INFO sqlalchemy.engine.Engine [generated in 0.00015s] ()
```

### ✅ CTE 和递归查询
```bash
2025-09-15 22:37:56,928 INFO sqlalchemy.engine.Engine
            WITH RECURSIVE category_tree AS (
                SELECT id, name, parent_id, name as path
                FROM categories
                WHERE parent_id IS NULL
                UNION ALL
                SELECT c.id, c.name, c.parent_id, ct.path || ' > ' || c.name
                FROM categories c
                JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT * FROM category_tree ORDER BY path

2025-09-15 22:37:56,928 INFO sqlalchemy.engine.Engine [generated in 0.00007s] ()
```

### ✅ 各种参数格式
```bash
# 字典样式参数
2025-09-15 22:37:56,930 INFO sqlalchemy.engine.Engine [generated in 0.00007s] (100, 1000, 'Electronics')

# 列表参数
2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine [generated in 0.00010s] (1, 2, 3)

# 混合类型参数
2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine [generated in 0.00007s] (True, 'completed', 'pending', 100.0)

# 大数字参数
2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine [generated in 0.00006s] (999999999999999,)
```

## 🧪 测试覆盖

我们创建了全面的单元测试来覆盖所有 SQLAlchemy 生成器的模式：

- **时间戳日志格式** - 支持带时间戳的 INFO 和 DEBUG 日志
- **原始 SQL 模式** - 支持带 `[raw sql]` 标记的日志
- **性能统计模式** - 支持带 `[generated in Xs]` 标记的日志
- **复杂子查询** - 支持 EXISTS、HAVING、子查询等复杂 SQL
- **多行 SQL** - 支持 CREATE TABLE、多行查询等
- **JSON 操作** - 支持 json_extract 等函数
- **日期函数** - 支持 DATE、时间戳函数
- **CTE 查询** - 支持 WITH RECURSIVE 等高级 SQL
- **各种参数** - 支持混合类型、大数字、空参数等

## 🚀 使用方法

1. **运行 SQLAlchemy 日志生成器**：
   ```bash
   uv run debug/generate_sqlalchemy_logs.py
   ```

2. **选择 SQLAlchemy 日志输出**：
   - 从终端中选择包含 SQL 查询的日志行
   - 可以选择多行日志（包括 SQL 语句和参数行）

3. **使用 SQLSugar 提取功能**：
   - 按 `Ctrl+Shift+P` 打开命令面板
   - 运行 `SQLSugar: Copy SQL (Injected)`
   - SQL 会被提取并复制到剪贴板

4. **验证结果**：
   - 粘贴到数据库客户端或 SQL 工具中
   - 验证参数已正确注入

## 📋 测试示例

运行以下命令来测试新功能：

```bash
# 测试特定模式
uv run debug/generate_sqlalchemy_logs.py 2>&1 | grep -A3 -B1 "SELECT products"

# 运行模式识别测试
node test-sql-parser.js

# 编译和运行完整测试套件
pnpm run compile
```

## 🎯 改进总结

### ✅ 已完成的改进

1. **扩展正则表达式模式** - 添加了对 SQLAlchemy 生成器所有特定格式的支持
2. **增强参数处理** - 改进了对性能统计格式的参数提取
3. **多行 SQL 支持** - 更好地处理复杂的多行 SQL 语句
4. **安全增强** - 保持了所有现有的安全特性和 SQL 注入防护
5. **性能优化** - 保持了现有的性能限制和优化
6. **全面测试** - 创建了覆盖所有模式的单元测试

### 🔧 技术细节

- 新增了 `[generated in Xs]` 模式匹配
- 新增了 `[raw sql]` 模式匹配
- 改进了时间戳日志格式支持
- 增强了复杂 SQL 的多行处理
- 保持了向后兼容性

### 🛡️ 安全性

所有新增的功能都保持了原有的安全标准：
- SQL 注入检测和防护
- 输入验证和大小限制
- 错误处理和边界检查
- 参数安全转义

现在你可以自信地使用 SQLAlchemy 日志生成器产生的任何日志模式，SQLSugar 都能够正确解析和提取 SQL！
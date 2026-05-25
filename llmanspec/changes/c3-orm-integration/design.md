## Design

### 静态分析方案

不使用运行时调用 ORM，而是通过 **正则 + AST 启发式** 静态分析 Python/TypeScript 文件。这是权衡决策：

- 优点：零运行时依赖、无需用户配置、快速
- 缺点：无法处理动态生成的 model、复杂继承链可能遗漏

### SQLAlchemy 解析策略

匹配模式：
```python
class User(Base):                    # 或 declarative_base()
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(100))
```

提取规则：
1. `__tablename__` → 表名（缺失时用类名 snake_case）
2. `Column(Type, ...)` → 列名 + 类型映射
3. `relationship()` → 关联信息

类型映射表：`Integer→number, String→string, Boolean→boolean, DateTime→date, ...`

### Django 解析策略

匹配模式：
```python
class UserProfile(models.Model):
    user = models.ForeignKey(User)
    bio = models.TextField()
```

### 推断链集成

`SchemaInferenceProvider` 插入推断链，priority 高于 Pattern：

```
Custom Rules (priority 100)
  → Schema Inference (priority 80)    ← 新增
    → Filter Inference (priority 60)
      → Pattern Inference (priority 40)
```

匹配逻辑：变量名 `user_id` → 查找 schema 中含 `id` 列的 `user/users` 表 → 返回该列类型。

### 扫描策略

- 激活时扫描 `**/models.py`、`**/models/*.py`、`**/schema.prisma`
- `FileSystemWatcher` 增量监听
- `workspaceState.get/update` 缓存已解析 schema
- 后台执行，不阻塞扩展激活

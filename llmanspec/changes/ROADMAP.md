# SQLSugar Roadmap

> 原则：**已有功能增强优先**，新功能推迟到核心稳定后

## Active

| Change | 目标 |
|--------|------|
| c1-foundation-hardening | 修复已知 bug + 测试 + UI 拆分 + Provider 基础 |
| c2-sql-intelligence | SQL 解析/格式化/验证（增强 inline-sql 体验） |
| c3-orm-integration | ORM model 解析增强 Jinja2 变量推断 |
| c4-template-ecosystem | 模板库 + 参数增强（增强 Jinja2 编辑器） |

## Deferred (c999)

| Change | 原因 |
|--------|------|
| c999-database-connectivity | 全新功能 |
| c999-ai-assistance | 全新功能 |
| c999-architecture-modernization | 平台化，待功能成熟 |

## 依赖关系

```
c1 → c2 → c3 → c4
```

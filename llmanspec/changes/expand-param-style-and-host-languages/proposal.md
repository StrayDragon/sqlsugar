---
depends_on:
  - add-param-style-placeholder-support
---

# 参数风格自动默认与宿主语言字符串扩展

## Why

`add-param-style-placeholder-support` 已实现多分析器管道，但默认 `enabledAnalyzers` 几乎只有 `jinja2`，`:name` / `%(x)s` / `$1` 等需用户手动开，auto 模式体感不足。同时宿主语言侧 LanguageHandler 主要覆盖 Python/JS/TS，Go raw string、Java text blocks 等常见 SQL 嵌入场景支持弱。

与现有功能关系：在已有 Analyzer Pipeline 之上优化默认与检测；扩展 Inline SQL 语言面。ORM schema 补全（R-J2E-012/013）体量大，**本 change 不包含**，另开后续草案。

## What Changes

- `paramStyle.defaultMode=auto` 时真正按内容检测并启用匹配分析器；默认启用集合更合理（至少 named + jinja2，或 auto 全注册检测）
- 持久化与「每次打开重新检测」策略写清，避免 localStorage 锁死错误子集
- LanguageHandler 增加至少一类新宿主语言字面量（优先 Go 或 Java，按用户优先级可调）
- 文档/设置说明：各 analyzer 适用生态一句话

## Capabilities

1. **Auto 检测可用**：当 `defaultMode` 为 `auto` 时，系统 MUST 根据模板内容检测并启用匹配的参数分析器，而非仅依赖偏窄的静态默认列表
2. **合理默认**：系统 MUST 提供对常见 SQLAlchemy/psycopg 风格友好的开箱默认（至少覆盖 named 与 jinja2）
3. **宿主语言扩展**：系统 MUST 为至少一种新增宿主语言提供正确的字面量检测与回写引号规则
4. **ORM 补全排除**：本变更 MUST NOT 实现 ORM schema 驱动补全（留给独立 change）

## Impact

- 触及：analyzer 默认/UI 持久化、`package.json` 默认值、`language-handler.ts`、测试
- 依赖：`add-param-style-placeholder-support`（已 designed/complete，需先归档或确认基线）
- 风险：中；auto 过宽可能误识别（如时间 `12:34`、Postgres `::type`）——须沿用现有 named 防误伤规则

## Tasks

### T001: 扩选与引号归一核心

- [ ] 实现 `resolveSqlSelection`（空选区扩选 + 非空选区引号/前缀归一）
- [ ] 覆盖 Python 三引号/前缀与 JS/TS 模板/普通字符串边界
- [ ] 单测：光标在字面量内、选区多含/少含引号、无法识别时不误扩

estimated: 3h
depends: none

### T002: 命令入口接入

- [ ] `InlineSQLCommandHandler` 使用 resolve；空选区无法扩选时保留清晰提示
- [ ] `TemplatedSqlHandler` 同步使用同一 resolve
- [ ] `looksLikeSQL` 失败改为非 modal 确认（Continue / Cancel）

estimated: 2h
depends: T001

### T003: 配置与文档

- [ ] 可选配置 `autoExpand` / `includeSurroundingQuotes`（默认如上 design）
- [ ] README 一句说明：光标在字符串内可无选区触发

estimated: 1h
depends: T002

### T004: 校验

- [ ] `just pre-commit` 或等价 type-check + unit tests 通过
- [ ] `llman sdd validate smart-inline-sql-selection --strict --no-interactive`

estimated: 1h
depends: T003

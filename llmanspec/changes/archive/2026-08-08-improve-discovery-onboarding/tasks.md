## Tasks

### T001: 快捷键与命令标题

- [x] 为 `sqlsugar.editInlineSQL` 与 `sqlsugar.copyTemplatedSql` 添加默认可覆盖 keybindings
- [x] 更新命令 `title` 使 Templated SQL 入口不暗示「仅复制」
- [x] 确认 command id 不变；更新 README 中的命令显示名

estimated: 1h
depends: none

### T002: Walkthrough 与 Marketplace 元数据

- [x] 添加 Walkthrough（两主功能各至少一步）
- [x] 调整 `displayName` / `categories` / description 提升可发现性
- [x] README 补充「如何打开 Walkthrough」一句

estimated: 2h
depends: T001

### T003: 校验

- [x] `just build` 或 `pnpm run check-types` 通过
- [x] 手工清单：命令面板搜索新标题、快捷键触发、Walkthrough 可打开
- [x] `llman sdd validate improve-discovery-onboarding --strict --no-interactive`

estimated: 1h
depends: T002

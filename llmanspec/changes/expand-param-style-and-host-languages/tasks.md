## Tasks

### T001: Auto 检测与默认配置

- [ ] 实现 `detectEnabledAnalyzers(sql)`
- [ ] package.json 默认 `enabledAnalyzers: [jinja2, named]`；补充 analyzer 说明
- [ ] 单测：各风格检测与空回退

estimated: 2h
depends: none

### T002: UI 持久化策略

- [ ] auto 模式打开时按内容重检测，不恢复旧勾选
- [ ] manual 模式仍持久化勾选；auto 只持久化 mode
- [ ] 更新 analyzer-selector 相关测试

estimated: 2h
depends: T001

### T003: Go 宿主字面量

- [ ] LanguageHandler + sql-selection 支持 Go raw/interpreted
- [ ] 扩选与 wrap 单测

estimated: 2h
depends: none

### T004: 校验

- [ ] type-check + unit tests 通过
- [ ] `llman sdd validate expand-param-style-and-host-languages --strict --no-interactive`

estimated: 1h
depends: T001,T002,T003

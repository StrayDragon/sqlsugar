## Tasks

### T001: 默认临时目录迁出工作区

- [ ] TempFileManager 默认使用扩展 globalStorage 或 OS temp
- [ ] 配置项允许切回工作区相对路径
- [ ] 单测覆盖默认路径与工作区路径两种模式

estimated: 3h
depends: none

### T002: 设置文案与分组

- [ ] 白话化 cleanup 相关 description
- [ ] 收敛/标注外观类设置为高级
- [ ] README 同步临时文件与清理说明

estimated: 1h
depends: T001

### T003: 校验

- [ ] `just test` 中 temp-file 相关测试通过
- [ ] 手工：默认模式下仓库无新增 temp 文件；清理行为符合设置
- [ ] `llman sdd validate temp-file-and-settings-hygiene --strict --no-interactive`

estimated: 1h
depends: T002

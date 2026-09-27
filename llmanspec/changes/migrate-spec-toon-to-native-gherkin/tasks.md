## Tasks

### T001: 规划壳与分支绑定

- [ ] proposal / design / tasks 就绪并提交
- [ ] `change start` 绑定 feature 分支

完成标准: `llman-sdd validate migrate-spec-toon-to-native-gherkin --strict` 通过

### T002: 逐能力转换 8 个 .feature

- [ ] 8 个能力各建 `specs/<cap>/<cap>.feature`（规则 105 条、场景 108 个，全部经 next-req-id 分配新 id）
- [ ] design.md 填入完整映射表（105 行）并提交

完成标准: `llman-sdd spec next-req-id` 返回 r106（105 条全部落文件）；`llman-sdd validate --specs --strict` 全绿

### T003: 回归与删除 spec.toon

- [ ] 项目测试全绿（`just test` / `pnpm test`）
- [ ] 逐能力删除对应 spec.toon（先验证后删除）
- [ ] 删除后重跑 validate 确认无残留

完成标准: 测试套件 0 失败；`validate --specs --strict` 在删除后仍全绿

### T004: 收口

- [ ] 按能力分批提交，commit message 注明 `migrate spec.toon -> native gherkin (v0.5.0)`
- [ ] change finalize 归档

完成标准: 默认分支包含全部 .feature 与映射表，无 spec.toon 残留

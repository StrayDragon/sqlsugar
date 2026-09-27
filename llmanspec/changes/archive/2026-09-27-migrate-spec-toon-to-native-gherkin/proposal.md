---
depends_on: []
branch: sdd/migrate-spec-toon-to-native-gherkin
base_branch: main
base_sha: f894d5afea68fc5547c83b193f072c512093af6a
---

# 遗留 spec.toon 迁移为 0.5.0 原生 Gherkin

## Why

llman-sdd 0.5.0 起规格只读单轨 `.feature`（原生分层格式），v1 的 `specs/<cap>/spec.toon` 会被静默忽略——当前 `validate --all` 已识别不到任何 spec（0 items），行为合约处于"事实上无规格"状态。必须把 8 个能力的规格整体迁移到原生格式，恢复 SSOT 的可校验性。

与现有功能关系：纯规格载体迁移，机械转换；不改变任何 MUST/SHALL 语义，不增删规则或场景，代码实现零改动。

## What Changes

- 为 8 个能力（ai-assistance、database-connectivity、inline-sql-editing、orm-integration、plugin-architecture、sql-intelligence、template-ecosystem、templated-sql-editor）新建 `specs/<cap>/<cap>.feature`（v2 目录式布局）
- requirements 每行 → `规则:` 块（`@req:r<N>` 新全局唯一 id，经 `spec next-req-id` 逐条分配）；scenarios 每行 → 对应规则内嵌套 `场景:`（假如/当/那么，正文照抄）
- 旧 req_id（R-XXX-NNN）→ 新 id（r<N>）完整映射表收录于 design.md，作为本迁移唯一事实源
- 结构门（`validate --specs --strict`）与项目测试全绿后，逐能力删除对应 spec.toon

## Capabilities

8 个既有 capability 全量迁移；不新增、不合并、不拆分 capability；规则与场景与旧表一一对应。

## Impact

- 触及：`llmanspec/specs/**`（新增 8 个 .feature、删除 8 个 spec.toon）、`llmanspec/changes/migrate-spec-toon-to-native-gherkin/`（工件）
- 不改：`src/**` 代码、`package.json`、测试
- 风险：低——转换机械且 id 一一对应；4 个能力 scope 中含当前不存在的规划路径（src/features/ai、src/core/providers、src/features/database、src/features/orm），按迁移要求保留原文，待人工复核后调整

## Design

> **状态：已推迟 (priority 999)**
> 平台化是远期目标，待功能成熟后自然演进。以下为初步方向。

### 初步方向

- 将 SQL Parser + Formatter + Diagnostics 核心抽为 Language Server Protocol (LSP) 实现
- CLI 复用同一核心库，提供 `lint`/`format`/`test` 命令
- 插件接口基于已实现的 ProviderRegistry，扩展为公开 contributes 点

### 待决策

- [ ] LSP 通信方式：stdio vs socket
- [ ] CLI 分发方式：npm global / standalone binary
- [ ] 是否单独发 npm 包还是保持 monorepo

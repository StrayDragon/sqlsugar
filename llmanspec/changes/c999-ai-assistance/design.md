## Design

> **状态：已推迟 (priority 999)**
> 待核心功能稳定后再设计具体方案。以下为初步方向。

### 初步方向

- 优先对接 VS Code Language Model API（与 GitHub Copilot 等统一）
- 备选支持 Ollama 本地模型
- 上下文注入：当前 SQL + schema 信息 + 最近编辑历史

### 待决策

- [ ] 是否引入独立 AI 依赖还是纯 VS Code LM API？
- [ ] NL→SQL 的 prompt 工程方案
- [ ] 隐私配置的 UI 形式

# Design — expand-param-style-and-host-languages

## 目标

`defaultMode=auto` 真正按模板内容启用匹配分析器；开箱默认覆盖 jinja2+named；新增 Go 宿主字面量扩选/回写；理清 auto 与 localStorage 持久化策略。

## 方案

1. **`detectEnabledAnalyzers(sql)`**（`analyzers/detect.ts`）  
   - 注册全量 pipeline，收集有结果的 analyzer 名  
   - 若含 `{{`/`{%`/`{#` 则包含 `jinja2`  
   - 无命中时回退 `['jinja2','named']`

2. **UI auto 模式**  
   - `mode=auto`：每次打开/模板变更时用检测结果更新 `selectedAnalyzers`，**不**把检测结果锁进 localStorage  
   - localStorage 仅持久化 `mode`；`manual` 才持久化勾选列表  
   - 避免旧会话「只勾了 jinja2」锁死 auto

3. **配置默认**  
   - `sqlsugar.paramStyle.enabledAnalyzers` 默认 `['jinja2','named']`  
   - 各 analyzer 的 description 补一句适用生态

4. **Go 宿主语言**  
   - `LanguageType` 增加 `go`  
   - 检测 `languageId=go` / `.go`  
   - 字面量：`` `raw` `` 与 `"interpreted"`（含转义）  
   - `findEnclosingStringLiteral` + `wrapLikeIntelligent` 支持 Go  
   - 首期不做 Java text blocks

## 不做

- ORM schema 补全  
- 改 named 防误伤规则（沿用现有）

## 测试 seam

- `detectEnabledAnalyzers` 单测（named / asyncpg / pyformat / 空回退）  
- analyzer-selector：auto 不持久化勾选；manual 持久化  
- language-handler / sql-selection：Go raw / interpreted 扩选与 wrap

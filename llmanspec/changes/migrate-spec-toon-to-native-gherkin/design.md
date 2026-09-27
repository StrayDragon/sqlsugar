# Design: spec.toon → 原生 Gherkin（v0.5.0）迁移

## 工具链与方案

- 工具：`llman-sdd` 0.5.0（npm `@llman-sdd/cli`）；迁移协作指引来自 `llman-sdd project migrate --kind toon2features`（指引型命令，不执行迁移）。
- `spec skeleton` 生成目录式 `specs/<cap>/<cap>.feature` 骨架；`spec next-req-id` 为**无状态**命令（按现有文件扫描已用 id），因此"分配"与"落文件"交替进行：每调用一次取得 `r<N>`，立即经 `spec add-req` 落一条 `规则:` 块，下一次调用即推进到 `r<N+1>`；场景经 `spec add-scenario` 嵌套进对应规则。
- 官方写入器保证原生格式可解析；脚本只做行级机械映射。

## 转换规则

- 文件头：`# language: zh-CN`、`# capability: <cap>`、`# purpose:` / `# scope:` 取 spec.toon 原文；`功能:` = 原 `name`。
- requirements 每行 → 块头标签 `@req:<新id>` + `规则: <原title>`，statement 全文进描述段（MUST/SHALL 照抄，不重写）。
- scenarios 每行 → 对应规则内嵌套 `场景: <原id字段>`；given→`假如 `、when→`当 `、then→`那么 `，正文照抄。
- 规则号用映射表，与旧表一一对应；不合并、不拆分规则。
- 引号核查：8 个文件均无 `""` 翻倍与 `\"` 反斜杠两种历史转义，所有带引号字段为简单包裹，逐行 3/5 字段解析校验。

## 全局 req_id 映射表（单一事实源）

分配顺序 = 用户指定的能力顺序（ai-assistance → database-connectivity → inline-sql-editing → orm-integration → plugin-architecture → sql-intelligence → template-ecosystem → templated-sql-editor），能力内按 spec.toon 行序。

<!-- REQ-MAPPING-TABLE -->

## 舍弃 / 改写记录

如出现无法解析行、空 GWT 或 req 未定义场景，在此记录处理决定；无则填"无"。

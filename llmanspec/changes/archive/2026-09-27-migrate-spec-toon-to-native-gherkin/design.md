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

| 能力 | 旧 req_id | 新 req_id | 规则 title |
|---|---|---|---|
| ai-assistance | `R-AI-001` | `r1` | Provider 抽象 |
| ai-assistance | `R-AI-002` | `r2` | 自然语言转 SQL |
| ai-assistance | `R-AI-003` | `r3` | SQL 解释 |
| ai-assistance | `R-AI-004` | `r4` | 优化建议 |
| ai-assistance | `R-AI-005` | `r5` | 模板生成 |
| ai-assistance | `R-AI-006` | `r6` | 流式输出 |
| ai-assistance | `R-AI-007` | `r7` | 隐私控制 |
| database-connectivity | `R-DBC-001` | `r8` | 多数据库连接 |
| database-connectivity | `R-DBC-002` | `r9` | 安全凭证存储 |
| database-connectivity | `R-DBC-003` | `r10` | 结果表格展示 |
| database-connectivity | `R-DBC-004` | `r11` | Schema 浏览器 |
| database-connectivity | `R-DBC-005` | `r12` | 超时与取消 |
| database-connectivity | `R-DBC-006` | `r13` | 结果导出 |
| database-connectivity | `R-DBC-007` | `r14` | 查询历史 |
| database-connectivity | `R-DBC-008` | `r15` | 只读模式 |
| inline-sql-editing | `R-ISE-001` | `r16` | Python 字符串处理 |
| inline-sql-editing | `R-ISE-002` | `r17` | JS/TS 字符串处理 |
| inline-sql-editing | `R-ISE-003` | `r18` | ORM 占位符转义 |
| inline-sql-editing | `R-ISE-004` | `r19` | 缩进同步 |
| inline-sql-editing | `R-ISE-005` | `r20` | 临时文件清理修复 |
| inline-sql-editing | `R-ISE-006` | `r21` | SQL 内容检测 |
| inline-sql-editing | `R-ISE-007` | `r22` | 测试覆盖 |
| inline-sql-editing | `R-ISE-008` | `r23` | JS/TS 引号升级 |
| inline-sql-editing | `R-ISE-009` | `r24` | 默认可发现快捷键 |
| inline-sql-editing | `R-ISE-010` | `r25` | 临时文件默认位于工作区外 |
| inline-sql-editing | `R-ISE-011` | `r26` | 清理设置语义可读 |
| inline-sql-editing | `R-ISE-012` | `r27` | 空选区自动扩选 |
| inline-sql-editing | `R-ISE-013` | `r28` | 选区引号与前缀容错 |
| inline-sql-editing | `R-ISE-014` | `r29` | 扩选语言覆盖 |
| inline-sql-editing | `R-ISE-015` | `r30` | Go 字符串字面量 |
| orm-integration | `R-ORM-001` | `r31` | SQLAlchemy 解析 |
| orm-integration | `R-ORM-002` | `r32` | Django 解析 |
| orm-integration | `R-ORM-003` | `r33` | TypeORM/Prisma 解析 |
| orm-integration | `R-ORM-004` | `r34` | Schema 推断增强 |
| orm-integration | `R-ORM-005` | `r35` | ORM 转 SQL 预览 |
| orm-integration | `R-ORM-006` | `r36` | SQL 转 ORM 建议 |
| orm-integration | `R-ORM-007` | `r37` | Provider 接口 |
| orm-integration | `R-ORM-008` | `r38` | 工作区扫描 |
| orm-integration | `R-ORM-009` | `r39` | 增量更新 |
| orm-integration | `R-ORM-010` | `r40` | 多绑定风格 |
| orm-integration | `R-ORM-011` | `r41` | Schema 缓存 |
| plugin-architecture | `R-PLG-001` | `r42` | Provider 注册 |
| plugin-architecture | `R-PLG-002` | `r43` | Language Provider |
| plugin-architecture | `R-PLG-003` | `r44` | Dialect Provider |
| plugin-architecture | `R-PLG-004` | `r45` | Inference Provider |
| plugin-architecture | `R-PLG-005` | `r46` | AI Provider |
| plugin-architecture | `R-PLG-006` | `r47` | Database Provider |
| plugin-architecture | `R-PLG-007` | `r48` | Extension API |
| plugin-architecture | `R-PLG-008` | `r49` | 配置驱动选择 |
| plugin-architecture | `R-PLG-009` | `r50` | 渐进式迁移 |
| plugin-architecture | `R-PLG-010` | `r51` | 基础 Provider 类型 |
| plugin-architecture | `R-PLG-011` | `r52` | 内置方言 Provider |
| plugin-architecture | `R-PLG-012` | `r53` | 方言自动检测 |
| plugin-architecture | `R-PLG-013` | `r54` | 内置 ORM Provider |
| plugin-architecture | `R-PLG-014` | `r55` | ORM 发现服务 |
| plugin-architecture | `R-PLG-015` | `r56` | 首次引导与扩展元数据 |
| sql-intelligence | `R-SQL-001` | `r57` | 多方言支持 |
| sql-intelligence | `R-SQL-002` | `r58` | 语法验证 |
| sql-intelligence | `R-SQL-003` | `r59` | SQL 格式化 |
| sql-intelligence | `R-SQL-004` | `r60` | 方言切换 |
| sql-intelligence | `R-SQL-005` | `r61` | Provider 接口 |
| sql-intelligence | `R-SQL-006` | `r62` | 片段识别 |
| sql-intelligence | `R-SQL-007` | `r63` | SQL Parser 集成 |
| sql-intelligence | `R-SQL-008` | `r64` | 格式化引擎 |
| sql-intelligence | `R-SQL-009` | `r65` | Jinja2 模板兼容 |
| sql-intelligence | `R-SQL-010` | `r66` | 内联 SQL 验证 |
| template-ecosystem | `R-TPL-001` | `r67` | 内置模板库 |
| template-ecosystem | `R-TPL-002` | `r68` | 项目模板 |
| template-ecosystem | `R-TPL-003` | `r69` | 增强参数系统 |
| template-ecosystem | `R-TPL-004` | `r70` | 模板测试框架 |
| template-ecosystem | `R-TPL-005` | `r71` | 模板导入导出 |
| template-ecosystem | `R-TPL-006` | `r72` | Snippet 集成 |
| template-ecosystem | `R-TPL-007` | `r73` | 模板分类搜索 |
| template-ecosystem | `R-TPL-008` | `r74` | 方言适配 |
| template-ecosystem | `R-TPL-009` | `r75` | 模板继承 |
| template-ecosystem | `R-TPL-010` | `r76` | CLI 验证 |
| templated-sql-editor | `R-J2E-001` | `r77` | AST 变量提取 |
| templated-sql-editor | `R-J2E-002` | `r78` | 类型推断 |
| templated-sql-editor | `R-J2E-003` | `r79` | 可视化编辑器 |
| templated-sql-editor | `R-J2E-004` | `r80` | 实时预览 |
| templated-sql-editor | `R-J2E-005` | `r81` | 滚动同步 |
| templated-sql-editor | `R-J2E-006` | `r82` | 混合模板 |
| templated-sql-editor | `R-J2E-007` | `r83` | SQL 过滤器 |
| templated-sql-editor | `R-J2E-008` | `r84` | 剪贴板复制 |
| templated-sql-editor | `R-J2E-009` | `r85` | WebView 渲染对齐 |
| templated-sql-editor | `R-J2E-010` | `r86` | UI 组件拆分 |
| templated-sql-editor | `R-J2E-011` | `r87` | 测试覆盖 |
| templated-sql-editor | `R-J2E-012` | `r88` | Schema 感知推断 |
| templated-sql-editor | `R-J2E-013` | `r89` | 列名补全 |
| templated-sql-editor | `R-J2E-016` | `r90` | 模板浏览器 |
| templated-sql-editor | `R-J2E-017` | `r91` | 参数类型扩展 |
| templated-sql-editor | `R-J2E-018` | `r92` | 编辑器实体命名扩展到结构层 |
| templated-sql-editor | `R-J2E-019` | `r93` | 单一可视化入口(移除遗留模式) |
| templated-sql-editor | `R-J2E-020` | `r94` | 目录与类名一致性 |
| templated-sql-editor | `R-J2E-021` | `r95` | 数组元素级 SQL 字面量 |
| templated-sql-editor | `R-J2E-022` | `r96` | 列表过滤器引号一致 |
| templated-sql-editor | `R-J2E-030` | `r97` | Templated 入口可发现 |
| templated-sql-editor | `R-J2E-031` | `r98` | Templated 空选区扩选 |
| templated-sql-editor | `R-J2E-032` | `r99` | 纯参数模板进 WebView |
| templated-sql-editor | `R-J2E-033` | `r100` | 写回源选区模板 |
| templated-sql-editor | `R-J2E-034` | `r101` | 渲染结果替换选区 |
| templated-sql-editor | `R-J2E-035` | `r102` | 复制动作可区分 |
| templated-sql-editor | `R-J2E-036` | `r103` | Auto 分析器检测 |
| templated-sql-editor | `R-J2E-037` | `r104` | 开箱分析器默认 |
| templated-sql-editor | `R-J2E-038` | `r105` | Auto 持久化策略 |

## 舍弃 / 改写记录

场景层面：**无舍弃、无改写**——255 行表格全部解析成功（引号核查未发现 `""` 翻倍或 `\"` 反斜杠历史转义），105 条 requirement、108 个 scenario 全部一一对应迁移，given/when/then 无空值。

`# scope:` 头偏差（spec 元数据，非行为合约；规则/场景 statement 未动）：

1. **TOON 引号定界符剥离**（值不变）：inline-sql-editing 原文 `"src/features/inline-sql/",src/test/,package.json`、sql-intelligence 原文 `"src/features/sql-intelligence/",src/core/providers/,src/test/`——首元素的引号是 TOON 语法而非值的一部分，逐字复制后校验器把 `"..."` 当路径名导致误报；剥离后为 `src/features/inline-sql/`、`src/features/sql-intelligence/`。

2. **规划中路径改指真实目录**（scope 承载 staleness 扫描，指引原文"把 # scope: 指向该规范管辖的真实源码目录"）：

   | 能力 | spec.toon 原文 | 迁移后 | 原因 |
   |---|---|---|---|
   | ai-assistance | `src/features/ai/,src/core/providers/,src/test/` | `src/test/` | src/features/ai/、src/core/providers/ 不存在（规划中功能），strict 门 ERROR |
   | database-connectivity | `src/features/database/,src/core/providers/,src/test/` | `src/test/` | 同上 |
   | orm-integration | `src/features/orm/,src/core/providers/,src/test/` | `src/test/` | 同上 |
   | sql-intelligence | `src/features/sql-intelligence/,src/core/providers/,src/test/` | `src/features/sql-intelligence/,src/test/` | 仅 src/core/providers/ 不存在 |

   功能落地时应将 scope 扩回真实实现目录（原文已存本表与 git 历史）。

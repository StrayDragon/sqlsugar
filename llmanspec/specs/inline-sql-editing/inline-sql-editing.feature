# language: zh-CN
# capability: inline-sql-editing
# purpose: 在 VS Code 中选中嵌入代码的 SQL 字符串，打开独立临时 .sql 文件进行编辑，保存后自动回写到原始代码位置。支持多语言引号处理和缩进同步。
# scope: src/features/inline-sql/,src/test/,package.json

功能: inline-sql-editing

  @req:r16
  规则: Python 字符串处理
    系统 MUST 支持 Python 单引号/双引号/三引号 SQL 字符串提取和回写并保持 f/r/u 前缀

    场景: baseline
      假如 用户在 Python 文件中有三引号 SQL
      当 用户选中并触发编辑命令
      那么 临时文件打开且引号和前缀正确处理

  @req:r17
  规则: JS/TS 字符串处理
    系统 MUST 支持 JavaScript/TypeScript 模板字面量和普通字符串的 SQL 提取

    场景: baseline
      假如 用户在 TypeScript 文件中有模板字面量 SQL
      当 用户选中并触发编辑命令
      那么 临时文件打开且反引号正确处理

  @req:r18
  规则: ORM 占位符转义
    系统 MUST 将 SQLAlchemy :param 占位符在临时文件中转义并在回写时还原

    场景: baseline
      假如 SQL 中包含 :user_id 占位符
      当 用户在临时文件编辑后保存
      那么 占位符在原文件中正确还原

  @req:r19
  规则: 缩进同步
    系统 MUST 在 Python 多行字符串回写时保持精确缩进同步

    场景: baseline
      假如 Python 多行 SQL 有 8 空格缩进
      当 用户编辑临时文件添加新行后保存
      那么 新行回写时保持 8 空格缩进

  @req:r20
  规则: 临时文件清理修复
    系统 MUST 通过 onDidCloseTextDocument hook 实现可配置的临时文件自动清理

    场景: fix-cleanup
      假如 配置 cleanupOnClose 为 true
      当 用户关闭临时文件 tab
      那么 onDidCloseTextDocument 触发并删除临时文件

  @req:r21
  规则: SQL 内容检测
    系统 SHALL 通过关键词启发式检测内容是否为 SQL 并在失败时以非强制打断的方式允许用户确认继续

    场景: soft-confirm
      假如 用户选中的文本不含 SQL 关键词
      当 用户触发编辑命令
      那么 系统以非 modal 警告询问是否继续且用户可选择 Continue

  @req:r22
  规则: 测试覆盖
    系统 MUST 达到 80% 以上的单元测试覆盖率

    场景: S001
      假如 所有核心功能已实现
      当 运行 pnpm test:coverage
      那么 覆盖率报告显示 80%+ 整体覆盖

  @req:r23
  规则: JS/TS 引号升级
    系统 MUST 在 JS/TS 中当内容包含换行时自动升级为模板字面量

    场景: S001
      假如 JS 文件中选中单行 SQL 字符串
      当 编辑后 SQL 变为多行
      那么 回写时自动使用模板字面量包裹

  @req:r24
  规则: 默认可发现快捷键
    系统 MUST 为 sqlsugar.editInlineSQL 贡献默认可覆盖的键盘快捷键

    场景: keybinding
      假如 扩展已安装且用户未覆盖快捷键
      当 用户查看 Keyboard Shortcuts 中的 sqlsugar.editInlineSQL
      那么 存在默认键位绑定

  @req:r25
  规则: 临时文件默认位于工作区外
    系统 MUST 默认将 Inline SQL 临时文件写在工作区之外的扩展 storage 或系统临时目录

    场景: default-path
      假如 用户使用默认配置触发 Edit Inline SQL
      当 检查临时文件路径
      那么 路径不在当前工作区仓库目录内

  @req:r26
  规则: 清理设置语义可读
    系统 MUST 以清晰描述区分关闭时删除与保存时删除等临时文件清理行为

    场景: settings-copy
      假如 用户打开设置并搜索 sqlsugar cleanup
      当 阅读配置说明
      那么 能区分关闭时删与保存时删的行为

  @req:r27
  规则: 空选区自动扩选
    当选区为空且光标位于受支持的宿主语言字符串字面量内时，系统 MUST 在进入编辑流程前自动扩选到该字面量的 SQL 内容

    场景: cursor-expand
      假如 Python 文件中光标位于三引号 SQL 字面量内部且选区为空
      当 用户触发 editInlineSQL
      那么 系统扩选到该字面量内容并进入编辑流程

  @req:r28
  规则: 选区引号与前缀容错
    系统 MUST 在选区意外包含或遗漏引号或语言前缀时纠正边界以保证后续回写引号样式正确

    场景: quote-normalize
      假如 用户选区多包含一层引号或遗漏引号
      当 用户触发编辑命令
      那么 系统纠正选区边界且回写引号样式与源字面量一致

  @req:r29
  规则: 扩选语言覆盖
    系统 MUST 至少对 Python 与 JavaScript/TypeScript 的常见字符串字面量形态提供扩选与归一

    场景: js-template-expand
      假如 TypeScript 文件中光标位于模板字符串 SQL 内且选区为空
      当 用户触发 editInlineSQL
      那么 系统扩选到模板字符串内容

  @req:r30
  规则: Go 字符串字面量
    系统 MUST 支持 Go raw string 与 interpreted string 的 SQL 字面量扩选与回写引号规则

    场景: go-raw-expand
      假如 Go 文件中光标位于 raw string SQL 内且选区为空
      当 用户触发 editInlineSQL
      那么 系统扩选到该 raw string 内容

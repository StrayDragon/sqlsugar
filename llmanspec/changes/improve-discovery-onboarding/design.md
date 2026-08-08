# Design — improve-discovery-onboarding

## 目标

降低「装完不知道怎么用」的成本：快捷键、命令命名、首次引导、Marketplace 元数据。不改选区算法与渲染。

## 方案

1. **keybindings**：在 `package.json` `contributes.keybindings` 为两命令提供默认可覆盖绑定（避开常见冲突，如 `ctrl+alt+s` / `ctrl+alt+j` 或 mac 等价；最终组合在实现时用键盘快捷方式编辑器自测）。
2. **命令标题**：`Copy To Templated SQL (Editor)` → 明确「打开 Templated SQL 编辑器」语义；保留 command id 以免破坏用户自定义键位。
3. **Walkthrough**：`contributes.walkthroughs` 两步：Inline SQL、Templated SQL；配截图或简短 markdown。
4. **元数据**：`displayName` 可读（如 `SQLSugar`）；`categories` 从 `Other` 调整为更易搜的类（如 Programming Languages）。

## 不做

- 光标扩选（`smart-inline-sql-selection`）
- 写回/统一 WebView（`templated-editor-workflow-closure`）

## 测试 seam

- 静态：`package.json` contributes 结构（单测或 validate 脚本读取 JSON）
- 手工：扩展开发宿主中命令面板 / 快捷键 / Walkthrough 页

# Jinja2 模板功能

## 概述

为 Jinja2 SQL 模板提供可视化编辑，支持变量替换、实时预览和智能类型推断。

## 组件

### 核心
- **command-handler.ts**：实现 `sqlsugar.copyJinja2Template` 命令
- **processor.ts**：基于 Nunjucks 的 Jinja2 模板渲染
- **webview.ts**：WebView 面板管理
- **sqlalchemy.ts**：SQLAlchemy 占位符（`:param`）支持

### UI（可视化编辑器）
- **ui/editor/**：主编辑器组件（Jinja2EditorV2、SqlPreviewV2 等）
- **ui/components/**：可复用 UI 组件（Button、Input、Select）
- **ui/utils/**：工具（模板解析器、键盘导航等）
- **ui/styles/**：设计系统和动画
- **ui/types/**：TypeScript 类型定义

## 工作流程

1. 用户在代码中选择 Jinja2 模板
2. 命令在 WebView 中打开可视化编辑器
3. 用户直接在模板中编辑变量（点击编辑）
4. 实时 SQL 预览更新
5. 提交时，渲染的 SQL 复制到剪贴板

## 功能

### 模板处理
- **变量提取**：自动检测 `{{ variable }}` 模式
- **控制结构**：支持 `{% if %}`、`{% for %}` 等
- **过滤器**：Jinja2 过滤器如 `|upper`、`|lower`、`|default`
- **类型推断**：从变量名智能检测类型

### 可视化编辑器
- **直接交互**：点击变量进行内联编辑
- **智能弹出框**：具有定位的上下文感知编辑
- **键盘导航**：完整键盘支持（Tab、Enter、Escape）
- **语法高亮**：SQL 和模板语法高亮
- **主题支持**：适配 VSCode 主题

### SQLAlchemy 支持
- 混合占位符：同一模板中同时支持 `{{ jinja2 }}` 和 `:sqlalchemy`
- 自动检测和处理
- 为每种类型分别提示值

## 技术栈

- **Lit**：现代 web components 框架
- **Nunjucks**：Jinja2 兼容的模板引擎
- **Highlight.js**：语法高亮
- **VSCode Webview API**：原生集成

## 配置

所有设置在 `sqlsugar.v2Editor.*` 下：
- `popoverPlacement`：弹出框定位策略
- `highlightStyle`：变量高亮样式
- `autoPreview`：更改时自动更新预览
- `keyboardNavigation`：启用键盘快捷键
- `animationsEnabled`：启用动画
- `showSuggestions`：显示值建议


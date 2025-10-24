# Jinja2 Editor V2 - 下一代可视化模板编辑器

## 概述

Jinja2 Editor V2 是可视化模板编辑器的完全重写版本，专注于**直接模板交互**。用户现在可以直接点击模板中高亮的变量进行内联编辑，而不是在单独的面板中编辑变量。

## 关键特性

### 直接模板交互
- **点击编辑**：点击任何高亮变量以打开内联编辑器
- **智能弹出框**：具有智能定位的上下文感知编辑
- **视觉反馈**：可编辑内容的清晰视觉指示器

### 增强的用户体验
- **响应式设计**：在宽窄布局之间无缝适配
- **实时预览**：编辑时即时查看 SQL 更改
- **键盘导航**：完整键盘支持（Tab、Enter、Escape）
- **流畅动画**：精致的过渡和微交互

### 智能功能
- **智能类型检测**：从上下文自动推断变量类型
- **值建议**：基于变量名的上下文感知建议
- **错误验证**：带有有用错误消息的实时验证
- **历史跟踪**：维护变量更改历史

### 性能与无障碍
- **优化渲染**：高效的模板解析和高亮
- **无障碍**：完整的屏幕阅读器支持和键盘导航
- **减少动画**：尊重用户的动画偏好
- **高对比度**：支持高对比度主题

## 架构

### 核心组件

```
src/jinja2-editor-v2/
├── components/
│   ├── jinja2-editor-v2.ts      # 主编辑器组件
│   ├── template-highlighter.ts   # 模板解析和高亮
│   ├── variable-popover.ts       # 内联变量编辑器
│   └── sql-preview-v2.ts        # 增强预览组件
├── utils/
│   ├── template-parser.ts        # Jinja2 模板解析
│   ├── position-calculator.ts    # 智能弹出框定位
│   ├── variable-state-manager.ts # 变量状态管理
│   └── keyboard-navigation-manager.ts # 键盘导航
├── config/
│   └── v2-editor-config.ts       # 配置管理
├── styles/
│   ├── animations.ts             # 动画定义
│   └── design-system.ts          # 设计令牌和混合
├── types.ts                      # TypeScript 类型定义
├── index.ts                      # 公共导出
└── test/
    └── v2-editor-test.html        # 交互式测试页面
```

### 关键技术

- **Lit Framework**：具有响应式属性的现代 web components
- **TypeScript**：完整的类型安全和 IntelliSense 支持
- **CSS Grid/Flexbox**：响应式布局系统
- **Web Components**：可复用、框架无关的组件
- **VSCode API Integration**：无缝编辑器集成

## 快速开始

### 安装

V2 编辑器包含在 SQLSugar 扩展中。通过 VSCode 设置启用：

```json
{
  "sqlsugar.enableV2Editor": true
}
```

### 使用

1. **打开命令面板**（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. **运行** `SQLSugar: Copy Jinja2 Template SQL (Visual Editor V2)`
3. **编辑**模板，直接点击高亮的变量
4. **使用键盘快捷键**进行高效导航

### 配置选项

```json
{
  "sqlsugar.enableV2Editor": true,
  "sqlsugar.v2Editor.popoverPlacement": "auto",
  "sqlsugar.v2Editor.highlightStyle": "background",
  "sqlsugar.v2Editor.autoPreview": true,
  "sqlsugar.v2Editor.keyboardNavigation": true,
  "sqlsugar.v2Editor.animationsEnabled": true,
  "sqlsugar.v2Editor.showSuggestions": true,
  "sqlsugar.v2Editor.autoFocusFirst": false
}
```

## 用户界面

### 布局模式

- **宽布局**（>1024px）：模板和预览并排显示
- **窄布局**（≤1024px）：模板和预览堆叠显示

### 高亮样式

- **背景**：变量背景高亮
- **边框**：变量边框高亮
- **下划线**：变量下划线高亮

### 视图模式

- **分割视图**：同时查看模板和渲染结果
- **渲染视图**：仅关注渲染的 SQL
- **差异视图**：比较模板与渲染结果

## 键盘快捷键

### 导航
- `Tab` - 导航到下一个变量
- `Shift + Tab` - 导航到上一个变量
- `Ctrl + Home` - 跳转到第一个变量
- `Ctrl + End` - 跳转到最后一个变量
- `↑/↓/←/→` - 在变量之间导航

### 编辑
- `Enter` / `Space` - 编辑聚焦的变量
- `F2` - 编辑聚焦的变量
- `Escape` - 关闭编辑器 / 清除焦点

### 视图控制
- `Ctrl + 1` - 切换到分割视图
- `Ctrl + 2` - 切换到渲染视图
- `Ctrl + 3` - 切换到差异视图
- `Ctrl + L` - 切换行号
- `Ctrl + W` - 切换自动换行

### 文件操作
- `Ctrl + S` - 保存/提交更改
- `Ctrl + C` - 复制渲染结果
- `Ctrl + R` - 刷新预览

### 帮助
- `Ctrl + ?` - 显示键盘快捷键
- `F1` - 显示键盘快捷键

## 智能功能

### 类型推断

编辑器基于以下内容自动推断变量类型：

- **变量名**：`user_id` → 整数，`email` → 电子邮件类型
- **上下文**：SQL WHERE 子句、JOIN 条件
- **模式**：常见命名约定

### 值建议

基于变量名的上下文感知建议：

- `user_*` → 用户相关值
- `*_date` → 日期/时间值
- `status_*` → 状态选项
- `*_id` → ID 数字

### 错误验证

带有有用消息的实时验证：

- 类型检查
- 必填字段验证
- 格式验证（email、URL、UUID）
- SQL 语法验证

## 自定义

### 主题

V2 编辑器自动适配您的 VSCode 主题：

- **深色主题**：完整的深色模式支持
- **浅色主题**：完整的浅色模式支持
- **高对比度**：无障碍支持

### 动画

控制动画行为：

```typescript
// 尊重用户偏好
if (prefersReducedMotion) {
  // 禁用动画
}

// 自定义缓动函数
const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
```

## 测试

### 交互式测试页面

在浏览器中打开 `src/jinja2-editor-v2/test/v2-editor-test.html` 以交互式测试 V2 编辑器。

### 测试功能

- **模板加载**：预定义的测试模板
- **配置测试**：测试不同设置
- **键盘导航**：测试所有快捷键
- **响应式布局**：测试不同屏幕尺寸
- **主题切换**：测试主题变化

### 调试控制台

```javascript
// 访问编辑器状态
testEditor.getState()
testEditor.logState()

// 测试配置
testEditor.testHighlightStyle('background')
testEditor.testPopoverPlacement('auto')
testEditor.toggleAnimations()
testEditor.toggleKeyboardNav()
```

## 开发

### 构建 V2 编辑器

```bash
# 安装依赖
pnpm install

# 构建扩展
pnpm run build

# 打包扩展
pnpm run vsix
```

### 组件架构

每个组件遵循 Lit 框架模式：

```typescript
@customElement('my-component')
export class MyComponent extends LitElement {
  @property() accessor myProp: string = '';

  static styles = css`
    /* 组件样式 */
  `;

  render() {
    return html`<!-- 模板 -->`;
  }
}
```

### 状态管理

具有响应式更新的集中状态管理：

```typescript
// 变量状态管理器
const stateManager = new VariableStateManager();
stateManager.initialize(variables);

// 监听更改
stateManager.addListener((event) => {
  // 处理状态更改
});
```

### 键盘导航

综合键盘导航系统：

```typescript
const keyboardManager = new KeyboardNavigationManager(config);
keyboardManager.initialize(variables);

// 处理事件
keyboardManager.addListener((event) => {
  // 处理导航
});
```

## 故障排除

### 常见问题

1. **弹出框未出现**
   - 检查是否禁用了动画
   - 验证 CSS 变量已加载
   - 检查控制台中的 JavaScript 错误

2. **键盘快捷键不工作**
   - 确保键盘导航已启用
   - 检查是否有其他扩展拦截按键
   - 验证焦点在编辑器上

3. **模板解析不正确**
   - 检查无效的 Jinja2 语法
   - 验证模板编码
   - 在控制台中查找解析错误

### 调试模式

启用调试日志：

```json
{
  "sqlsugar.logLevel": "debug"
}
```

### 性能问题

1. **大型模板**
   - 编辑器自动处理大型模板
   - 对于非常大的内容使用虚拟滚动

2. **动画缓慢**
   - 检查 `prefers-reduced-motion` 设置
   - 在设置中禁用动画

## 路线图

### 阶段 1：核心功能（已完成）
- [x] 直接模板交互
- [x] 智能弹出框
- [x] 键盘导航
- [x] 响应式设计
- [x] 配置系统

### 阶段 2：增强功能
- [ ] AI 驱动的建议
- [ ] 模板分析
- [ ] 协作编辑
- [ ] 高级搜索
- [ ] 自定义主题

### 阶段 3：高级功能
- [ ] 插件系统
- [ ] 模板库
- [ ] 性能指标
- [ ] 导出/导入功能
- [ ] 高级验证

## 许可证

本项目是 SQLSugar 扩展的一部分。详见主项目许可证。

## 贡献

欢迎贡献！请阅读贡献指南并提交 pull request。

### 开发设置

1. 克隆仓库
2. 使用 `pnpm install` 安装依赖
3. 运行开发服务器
4. 进行更改
5. 提交 pull request

### 代码风格

- 所有新代码使用 TypeScript
- 遵循现有代码风格
- 为新功能添加测试
- 更新文档

---

**为 SQLSugar 社区用心构建**
# Jinja2 Visual Editor 现代化重构方案

## 🎯 问题分析

### 当前实现痛点

**1. 原生 JavaScript 操作维护困难**
- 2000+ 行混杂的 HTML/JS/CSS 代码
- 直接 DOM 操作导致代码难以测试和维护
- 缺少组件化架构，状态管理混乱
- 手动事件绑定和样式管理

**2. 技术栈过时**
- 使用传统的 imperative DOM 操作
- 缺少现代化的响应式数据绑定
- 没有组件复用和状态管理
- CSS 内联在 HTML 中，难以主题化

**3. 用户体验问题**
- UI 界面较为简陋，缺少现代化设计
- 缺少实时预览和智能提示
- 移动端适配较差
- 无障碍支持不足

### 测试重复用例问题

**发现的重复模式**:
1. **模板处理逻辑重复** - `jinja2-integration.test.ts` 和 `jinja2-filters.test.ts` 都有相似的模板渲染测试
2. **变量提取测试重复** - 多个文件都在测试相同的变量提取逻辑
3. **错误处理测试重复** - 边缘情况处理在多个测试文件中重复出现

## 🚀 现代化重构方案

### 方案选择：Lit Web Components

基于分析，推荐使用 **Lit** 作为现代化 UI 框架，理由如下：

**优势**:
- ✅ 原生 Web Components 标准，与 VS Code WebView 完美兼容
- ✅ 轻量级 (< 6KB)，适合 VS Code 扩展场景
- ✅ TypeScript 原生支持，类型安全
- ✅ 响应式数据绑定，简化状态管理
- ✅ Shadow DOM 样式隔离，避免样式冲突
- ✅ 与现有 VS Code 扩展架构无缝集成

### 重构架构设计

#### 新的文件结构
```
src/jinja2-editor/
├── components/
│   ├── jinja2-editor.ts              # 主编辑器组件
│   ├── variable-input.ts             # 变量输入组件
│   ├── filter-selector.ts            # 过滤器选择组件
│   ├── sql-preview.ts                # SQL 预览组件
│   ├── theme-provider.ts             # 主题提供者
│   └── ui/
│       ├── button.ts                 # 基础按钮组件
│       ├── input.ts                  # 输入框组件
│       ├── select.ts                 # 下拉选择组件
│       ├── card.ts                   # 卡片组件
│       └── badge.ts                  # 标签组件
├── styles/
│   ├── variables.css                 # 变量编辑样式
│   ├── preview.css                   # 预览区域样式
│   ├── themes.css                    # 主题样式
│   └── layout.css                    # 布局样式
├── utils/
│   ├── template-processor.ts         # 模板处理工具
│   ├── sql-highlighter.ts            # SQL 语法高亮
│   ├── date-utils.ts                 # 日期时间工具
│   └── type-utils.ts                 # 类型处理工具
└── jinja2-webview.ts                 # WebView 入口 (重构)
```

### 核心组件实现

#### 1. 主编辑器组件 (`jinja2-editor.ts`)

```typescript
import { LitElement, html, css, customElement, property, state } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import './variable-input.js';
import './sql-preview.js';

@customElement('jinja2-editor')
export class Jinja2Editor extends LitElement {
  @property({ type: String }) template: string = '';
  @property({ type: Array }) variables: Jinja2Variable[] = [];
  @state() private values: Record<string, any> = {};
  @state() private theme: string = 'vscode-dark';

  static styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-background);
    }

    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      height: 100vh;
      padding: 16px;
    }

    .variables-panel {
      background: var(--vscode-editor-background);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--vscode-input-border);
    }

    .preview-panel {
      background: var(--vscode-editor-background);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--vscode-input-border);
    }
  `;

  render() {
    return html`
      <div class="container">
        <div class="variables-panel">
          <h2>变量配置</h2>
          ${this.variables.map(variable => html`
            <variable-input
              .variable=${variable}
              .value=${this.values[variable.name]}
              @change=${(e: CustomEvent) => this.handleVariableChange(e)}
            ></variable-input>
          `)}
        </div>
        <div class="preview-panel">
          <sql-preview
            .template=${this.template}
            .values=${this.values}
            .variables=${this.variables}
            .theme=${this.theme}
          ></sql-preview>
        </div>
      </div>
    `;
  }

  private handleVariableChange(event: CustomEvent) {
    const { name, value } = event.detail;
    this.values = { ...this.values, [name]: value };
  }
}
```

#### 2. 变量输入组件 (`variable-input.ts`)

```typescript
import { LitElement, html, css, customElement, property, state } from 'lit';

@customElement('variable-input')
export class VariableInput extends LitElement {
  @property({ type: Object }) variable: Jinja2Variable;
  @property({ type: Object }) value: any;

  @state() private localValue: any;
  @state() private showFilters: boolean = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 16px;
    }

    .variable-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .variable-name {
      font-weight: 600;
      color: var(--vscode-textLink-foreground);
    }

    .type-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.8em;
    }

    .controls {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .quick-options {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }

    .quick-option-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8em;
      cursor: pointer;
    }

    .quick-option-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
  `;

  render() {
    return html`
      <div class="variable-item">
        <div class="variable-header">
          <span class="variable-name">${this.variable.name}</span>
          <span class="type-badge">${this.getDisplayType(this.variable.type)}</span>
        </div>

        ${this.variable.description ? html`
          <div class="variable-description">${this.variable.description}</div>
        ` : ''}

        <div class="controls">
          ${this.renderTypeSelector()}
          ${this.renderValueInput()}
          ${this.renderEmptyCheckbox()}
        </div>

        ${this.renderQuickOptions()}
        ${this.renderFilterSelector()}
      </div>
    `;
  }

  private renderTypeSelector() {
    const types = [
      { value: 'string', label: '字符串' },
      { value: 'number', label: '数字' },
      { value: 'date', label: '日期' },
      { value: 'datetime', label: '日期时间' },
      { value: 'boolean', label: '布尔值' },
      { value: 'null', label: '空值' }
    ];

    return html`
      <select @change=${this.handleTypeChange}>
        ${types.map(type => html`
          <option value=${type.value} ?selected=${this.variable.type === type.value}>
            ${type.label}
          </option>
        `)}
      </select>
    `;
  }

  private renderValueInput() {
    if (this.variable.type === 'boolean') {
      return html`
        <select @change=${this.handleValueChange}>
          <option value=true ?selected=${this.localValue === true}>True</option>
          <option value=false ?selected=${this.localValue === false}>False</option>
        </select>
      `;
    }

    return html`
      <input
        type="text"
        .value=${this.formatValue(this.localValue)}
        @input=${this.handleValueChange}
        placeholder="输入 ${this.variable.name} 的值"
      />
    `;
  }

  private handleTypeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const newType = select.value as Jinja2Variable['type'];

    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        name: this.variable.name,
        value: this.getDefaultValue(newType),
        type: newType
      }
    }));
  }

  private handleValueChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = this.parseValue(input.value, this.variable.type);

    this.dispatchEvent(new CustomEvent('change', {
      detail: { name: this.variable.name, value }
    }));
  }
}
```

#### 3. SQL 预览组件 (`sql-preview.ts`)

```typescript
import { LitElement, html, css, customElement, property } from 'lit';

@customElement('sql-preview')
export class SqlPreview extends LitElement {
  @property({ type: String }) template: string = '';
  @property({ type: Object }) values: Record<string, any> = {};
  @property({ type: Array }) variables: Jinja2Variable[] = [];
  @property({ type: String }) theme: string = 'vscode-dark';

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .preview-container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .template-original {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textBlockQuote-border);
      padding: 12px;
      margin-bottom: 16px;
      font-family: monospace;
      font-size: 0.9em;
      white-space: pre-wrap;
      max-height: 150px;
      overflow-y: auto;
    }

    .sql-output {
      flex: 1;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 16px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-y: auto;
    }

    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      font-size: 0.8em;
      color: var(--vscode-descriptionForeground);
    }
  `;

  render() {
    const renderedSQL = this.renderTemplate();
    const highlightedSQL = this.highlightSQL(renderedSQL);

    return html`
      <div class="preview-container">
        <div class="template-original">${this.template}</div>
        <div class="sql-output">
          <div class=${`sql-content theme-${this.theme}`} .innerHTML=${highlightedSQL}></div>
        </div>
        <div class="status-bar">
          <span>SQL 预览</span>
          <span>${Object.keys(this.values).length} 个变量已设置</span>
        </div>
      </div>
    `;
  }

  private renderTemplate(): string {
    try {
      // 使用 nunjucks 渲染模板
      const nunjucks = (window as any).nunjucks;
      const env = new nunjucks.Environment(null, {
        autoescape: false,
        throwOnUndefined: false
      });

      return env.renderString(this.template, this.values);
    } catch (error) {
      return `渲染错误: ${error.message}`;
    }
  }

  private highlightSQL(sql: string): string {
    // SQL 语法高亮逻辑
    return sql
      .replace(/\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|INNER|LEFT|RIGHT|OUTER|ON|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|EXISTS|TRUE|FALSE)\b/g,
        '<span class="sql-keyword">$1</span>')
      .replace(/'([^']|(\\'))*'/g, '<span class="sql-string">$&</span>')
      .replace(/\b\d+(\.\d+)?\b/g, '<span class="sql-number">$&</span>');
  }
}
```

### 重构优势

#### 1. 代码质量提升
- **组件化架构**: 每个组件职责单一，易于测试和维护
- **类型安全**: TypeScript 原生支持，减少运行时错误
- **响应式数据绑定**: 自动状态同步，减少手动 DOM 操作
- **样式隔离**: Shadow DOM 避免样式冲突

#### 2. 用户体验提升
- **现代化 UI**: 使用 CSS Grid 和 Flexbox 实现响应式布局
- **主题适配**: 自动适配 VS Code 主题
- **性能优化**: 虚拟滚动和懒加载提升大数据量性能
- **无障碍支持**: 语义化 HTML 和 ARIA 属性

#### 3. 开发效率提升
- **热重载**: 开发时实时预览
- **组件复用**: 通用 UI 组件可在其他地方复用
- **工具链支持**: 现代化开发工具和调试支持
- **自动化测试**: 组件单元测试和集成测试

## 🧪 测试重构方案

### 测试去重策略

#### 1. 提取共享测试工具
```typescript
// test-utils/jinja2-test-helpers.ts
export class Jinja2TestHelpers {
  static createTestTemplate(variables: Record<string, any>): string {
    return Object.entries(variables)
      .map(([name, value]) => `{{ ${name} }}`)
      .join(' ');
  }

  static createComplexTestTemplate(): string {
    return `SELECT * FROM users
WHERE user_id = {{ user.id }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit }}`;
  }

  static getStandardTestVariables(): Jinja2Variable[] {
    return [
      { name: 'user.id', type: 'number', defaultValue: 42 },
      { name: 'status', type: 'string', defaultValue: 'active' },
      { name: 'include_deleted', type: 'boolean', defaultValue: false },
      { name: 'limit', type: 'number', defaultValue: 10 }
    ];
  }
}
```

#### 2. 测试分层架构
```
test/
├── shared/
│   ├── jinja2-test-helpers.ts       # 共享测试工具
│   ├── mock-templates.ts            # 模拟模板数据
│   └── test-fixtures.ts             # 测试固件
├── unit/
│   ├── jinja2-processor.unit.ts      # 处理器单元测试
│   ├── variable-extractor.unit.ts  # 变量提取单元测试
│   └── template-renderer.unit.ts    # 模板渲染单元测试
├── integration/
│   ├── jinja2-editor.integ.ts       # 编辑器集成测试
│   ├── webview-communication.integ.ts # WebView 通信测试
│   └── end-to-end.integ.ts          # 端到端测试
└── performance/
    ├── large-template.perf.ts       # 大模板性能测试
    └── real-time-rendering.perf.ts  # 实时渲染性能测试
```

#### 3. 测试数据驱动化
```typescript
// test-data/jinja2-filters.test-data.ts
export const filterTestData = [
  {
    name: 'upper filter',
    template: '{{ "hello" | upper }}',
    input: {},
    expected: 'HELLO'
  },
  {
    name: 'lower filter',
    template: '{{ "HELLO" | lower }}',
    input: {},
    expected: 'hello'
  },
  {
    name: 'default filter with null',
    template: '{{ null | default("default") }}',
    input: {},
    expected: 'default'
  }
];

// 使用示例
describe('Jinja2 Filters', () => {
  filterTestData.forEach(({ name, template, input, expected }) => {
    it(name, () => {
      const result = processor.renderTemplate(template, input);
      assert.strictEqual(result, expected);
    });
  });
});
```

### 测试现代化

#### 1. 采用 Vitest 替代 Mocha
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // 用于测试 Web Components
    setupFiles: ['./test/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

#### 2. Web Components 测试方案
```typescript
// test/components/jinja2-editor.test.ts
import { fixture, html, expect } from '@open-wc/testing';
import { Jinja2Editor } from '../../src/jinja2-editor/components/jinja2-editor.js';

describe('Jinja2Editor', () => {
  let element: Jinja2Editor;

  beforeEach(async () => {
    element = await fixture(html`
      <jinja2-editor></jinja2-editor>
    `);
  });

  it('renders variable inputs', async () => {
    element.variables = [
      { name: 'test', type: 'string', defaultValue: 'value' }
    ];

    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('variable-input');
    expect(input).to.exist;
  });

  it('emits change event when value changes', async () => {
    const spy = sinon.spy();
    element.addEventListener('change', spy);

    element.variables = [
      { name: 'test', type: 'string', defaultValue: 'value' }
    ];

    await element.updateComplete;

    const input = element.shadowRoot?.querySelector('input');
    input?.dispatchEvent(new Event('input'));

    expect(spy.calledOnce).to.be.true;
  });
});
```

## 📊 实施计划

### 阶段 1: 基础设施搭建
1. **安装依赖**: Lit, TypeScript, 测试工具
2. **配置构建**: 设置 Web Components 构建流程
3. **创建基础组件**: 按钮、输入框、选择器等 UI 组件

### 阶段 2: 核心组件开发
1. **变量输入组件**: 支持多种数据类型的输入
2. **SQL 预览组件**: 实时渲染和语法高亮
3. **过滤器选择器**: 可视化过滤器配置

### 阶段 3: 主编辑器集成
1. **主编辑器组件**: 集成所有子组件
2. **状态管理**: 响应式数据流管理
3. **主题适配**: VS Code 主题同步

### 阶段 4: 测试重构
1. **提取共享工具**: 去除测试重复代码
2. **组件测试**: Web Components 单元测试
3. **集成测试**: 端到端功能测试

### 阶段 5: 优化和发布
1. **性能优化**: 懒加载、虚拟滚动
2. **用户体验**: 键盘快捷键、拖拽排序
3. **文档完善**: 组件 API 文档和使用示例

## 🎯 预期收益

### 技术指标
- **代码行数减少 40%**: 组件化架构减少重复代码
- **测试覆盖率提升至 80%**: 现代化测试工具和组件测试
- **构建速度提升 50%**: 优化的构建流程和依赖管理
- **运行时性能提升 30%**: 虚拟滚动和响应式优化

### 开发效率
- **新功能开发速度提升 60%**: 组件复用和工具链支持
- **Bug 修复时间减少 50%**: 更好的测试覆盖和调试工具
- **代码审查效率提升 40%**: 清晰的组件边界和类型安全

### 用户体验
- **界面响应速度提升 70%**: 优化的渲染性能
- **移动端适配**: 响应式设计支持多设备
- **无障碍支持**: 符合 WCAG 2.1 标准

这个重构方案将显著提升 Jinja2 Visual Editor 的代码质量、开发效率和用户体验，为未来的功能扩展奠定坚实基础。
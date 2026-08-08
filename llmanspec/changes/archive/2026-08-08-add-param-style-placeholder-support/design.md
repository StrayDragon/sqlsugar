## Design

### 多遍遍历架构

采用可插拔的分析器管道模式，每个分析器实现统一的 `Analyzer` 接口：

```typescript
interface Analyzer {
  name: string;
  priority: number; // 数值越小优先级越高
  analyze(sql: string, context: AnalyzerContext): AnalyzerResult;
}

interface AnalyzerResult {
  parameters: ExtractedParameter[];
  metadata: Record<string, unknown>;
}

interface ExtractedParameter {
  name: string;
  position: number;
  type: 'jinja2' | 'named' | 'numeric' | 'pyformat' | 'asyncpg';
  startIndex: number;
  endIndex: number;
}
```

`AnalyzerPipeline` 类负责管理分析器并按优先级执行：

```typescript
class AnalyzerPipeline {
  private analyzers: Analyzer[] = [];
  
  register(analyzer: Analyzer): void {
    this.analyzers.push(analyzer);
    this.analyzers.sort((a, b) => a.priority - b.priority);
  }
  
  execute(sql: string, options: PipelineOptions): AnalyzerResult[] {
    const results: AnalyzerResult[] = [];
    for (const analyzer of this.analyzers) {
      if (options.shortCircuit && results.length > 0) break;
      const result = analyzer.analyze(sql, options.context);
      if (result.parameters.length > 0) {
        results.push(result);
      }
    }
    return results;
  }
}
```

### 参数风格分析器实现

每个参数风格对应一个独立的分析器类，使用正则表达式匹配：

```typescript
class NamedParamAnalyzer implements Analyzer {
  name = 'named';
  priority = 10;
  
  private pattern = /:(\w+)/g;
  
  analyze(sql: string): AnalyzerResult {
    const parameters: ExtractedParameter[] = [];
    let match;
    while ((match = this.pattern.exec(sql)) !== null) {
      parameters.push({
        name: match[1],
        position: parameters.length,
        type: 'named',
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }
    return { parameters, metadata: {} };
  }
}
```

类似地实现其他分析器：
- `NumericParamAnalyzer`: `/:(\d+)/g`
- `PyformatParamAnalyzer`: `/%\((\w+)\)s/g`
- `AsyncpgParamAnalyzer`: `/\$(\d+)/g`

### 分析器选择 UI

在 Toolbar 组件中添加 `AnalyzerSelector` 子组件：

```typescript
@customElement('analyzer-selector')
export class AnalyzerSelector extends LitElement {
  @property() selectedAnalyzers: string[] = [];
  @property() mode: 'auto' | 'manual' = 'auto';
  
  render() {
    return html`
      <div class="selector-container">
        <select @change=${this.handleModeChange}>
          <option value="auto">自动检测</option>
          <option value="manual">手动选择</option>
        </select>
        ${this.mode === 'manual' ? this.renderCheckboxes() : ''}
      </div>
    `;
  }
  
  private renderCheckboxes() {
    const analyzers = ['jinja2', 'named', 'numeric', 'pyformat', 'asyncpg'];
    return html`
      <div class="checkbox-group">
        ${analyzers.map(name => html`
          <label>
            <input type="checkbox" 
                   .checked=${this.selectedAnalyzers.includes(name)}
                   @change=${() => this.toggleAnalyzer(name)}>
            ${name}
          </label>
        `)}
      </div>
    `;
  }
}
```

### 参数统一展示

扩展 `VariableEditor` 组件，将参数占位符转换为统一的 `VariableInfo` 格式：

```typescript
interface VariableInfo {
  name: string;
  type: 'jinja2' | 'named' | 'numeric' | 'pyformat' | 'asyncpg';
  defaultValue?: string;
  inferredType?: string;
  source: 'template' | 'parameter';
}
```

视觉标识采用清淡的色彩方案，通过低饱和度的标签文字区分来源，不喧宾夺主：

```typescript
// 色彩方案：低饱和度，辅助性标识
const typeColors: Record<string, string> = {
  jinja2:  'var(--vscode-charts-blue, #569cd6)',    // 淡蓝
  named:   'var(--vscode-charts-orange, #ce9178)',   // 暖棕
  numeric: 'var(--vscode-charts-green, #6a9955)',    // 淡绿
  pyformat:'var(--vscode-charts-purple, #c586c0)',   // 淡紫
  asyncpg: 'var(--vscode-charts-teal, #4ec9b0)',     // 淡青
};

private renderTypeTag(type: string) {
  const color = typeColors[type] || 'var(--vscode-foreground)';
  return html`
    <span class="param-type-tag" style="color: ${color}; opacity: 0.7; font-size: 0.75em; font-weight: 400;">
      ${type}
    </span>
  `;
}
```

标签仅在变量编辑器的参数列表行尾显示为淡色小字，不干扰主要的参数名和值编辑区域。

### 配置项设计

在 `package.json` 中添加配置：

```json
{
  "sqlsugar.paramStyle.enabledAnalyzers": {
    "type": "array",
    "items": {
      "type": "string",
      "enum": ["jinja2", "named", "numeric", "pyformat", "asyncpg"]
    },
    "default": ["jinja2"],
    "description": "默认启用的参数分析器列表"
  }
}
```

配置变更时，通过 `workspace.onDidChangeConfiguration` 事件动态更新分析器状态。

### 自动检测逻辑

当用户选择自动检测模式时，系统根据 SQL 内容特征选择分析器：

```typescript
function detectAnalyzers(sql: string): string[] {
  const analyzers: string[] = ['jinja2']; // 始终启用 Jinja2
  
  if (/:\w+/.test(sql)) analyzers.push('named');
  if (/:\d+/.test(sql)) analyzers.push('numeric');
  if (/%\(\w+\)s/.test(sql)) analyzers.push('pyformat');
  if (/\$\d+/.test(sql)) analyzers.push('asyncpg');
  
  return analyzers;
}
```

### 性能考虑

- 分析器按优先级排序，高优先级分析器先执行
- 支持短路模式，当某个分析器成功提取参数后可跳过后续分析器
- 正则表达式预编译，避免重复编译开销
- 参数去重逻辑在管道层面统一处理，避免重复提取
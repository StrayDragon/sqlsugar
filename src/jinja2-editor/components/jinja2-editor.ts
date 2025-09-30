import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Jinja2Variable, VariableChangeEvent, TemplateRenderEvent, Jinja2VariableValue } from '../types.js';
import './variable-input.js';
import './sql-preview.js';

@customElement('jinja2-editor')
export class Jinja2Editor extends LitElement {
  @property({ type: String }) accessor template: string = '';
  @property({ type: Array }) accessor variables: Jinja2Variable[] = [];
  @property({ type: String }) accessor theme: string = 'vscode-dark';
  @property({ type: Boolean }) accessor autoRender = true;
  @property({ type: Boolean }) accessor showOriginal = true;
  @property({ type: String }) accessor title = 'Jinja2 Template Editor';

  @state() accessor values: Record<string, Jinja2VariableValue> = {};
  @state() accessor selectedVariable: string | null = null;
  @state() accessor isProcessing = false;
  @state() accessor processingTime = 0;
  @state() accessor renderCount = 0;

  static styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-background);
      height: 100vh;
      --vscode-font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }

    .editor-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      height: 100vh;
      padding: var(--spacing-lg);
      box-sizing: border-box;
      background-color: var(--vscode-editor-background);
    }

    /* Variables Panel */
    .variables-panel {
      background: var(--vscode-editor-background);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--vscode-widget-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 300px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--vscode-widget-border);
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-textBlockQuote-background) 100%);
    }

    .panel-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .panel-subtitle {
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      margin-left: var(--spacing-sm);
    }

    .panel-actions {
      display: flex;
      gap: var(--spacing-sm);
    }

    .icon-button {
      background: none;
      border: none;
      color: var(--vscode-icon-foreground);
      cursor: pointer;
      padding: 4px;
      border-radius: var(--border-radius-sm);
      transition: all var(--transition-fast);
      font-size: var(--font-size-md);
    }

    .icon-button:hover {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .panel-content {
      flex: 1;
      overflow-y: auto;
      padding: var(--spacing-md);
    }

    .variables-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: var(--spacing-lg);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
      opacity: 0.5;
    }

    .empty-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      margin-bottom: var(--spacing-sm);
    }

    .empty-description {
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      opacity: 0.8;
    }

    /* Preview Panel */
    .preview-panel {
      background: var(--vscode-editor-background);
      border-radius: var(--border-radius-lg);
      border: 1px solid var(--vscode-widget-border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 400px;
    }

    /* Quick Actions */
    .quick-actions {
      display: flex;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      border-bottom: 1px solid var(--vscode-widget-border);
      background: var(--vscode-textBlockQuote-background);
    }

    .action-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: var(--font-weight-medium);
    }

    .action-button:hover {
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px);
    }

    .action-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .action-button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .action-button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .action-button.primary {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-weight: var(--font-weight-semibold);
    }
    .action-button.primary:hover {
      background: var(--vscode-button-background);
      transform: translateY(-1px);
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-md);
      border-top: 1px solid var(--vscode-widget-border);
      background: var(--vscode-editor-background);
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
    }

    .status-info {
      display: flex;
      gap: var(--spacing-md);
      align-items: center;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--vscode-badge-background);
    }

    .status-indicator.success {
      background-color: var(--vscode-charts-green);
    }

    .status-indicator.processing {
      background-color: var(--vscode-charts-blue);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Loading Overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border-radius: var(--border-radius-lg);
    }

    .loading-content {
      background: var(--vscode-editor-background);
      padding: var(--spacing-lg);
      border-radius: var(--border-radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md);
      box-shadow: var(--shadow-lg);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--vscode-progressBar-background);
      border-top: 3px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--vscode-widget-border);
      background: var(--vscode-editor-background);
    }

    .toolbar-section {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: var(--vscode-widget-border);
    }

    /* Search and Filter */
    .search-box {
      position: relative;
      flex: 1;
      max-width: 200px;
    }

    .search-input {
      width: 100%;
      padding: 4px 8px 4px 24px;
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: var(--font-size-xs);
      outline: none;
    }

    .search-input:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .search-icon {
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .editor-container {
        grid-template-columns: 1fr;
        gap: var(--spacing-md);
        height: auto;
        padding: var(--spacing-md);
      }

      .variables-panel,
      .preview-panel {
        min-height: 400px;
      }

      .quick-actions {
        flex-wrap: wrap;
      }

      .toolbar {
        flex-wrap: wrap;
        gap: var(--spacing-xs);
      }
    }

    @media (max-width: 640px) {
      .editor-container {
        padding: var(--spacing-sm);
      }

      .panel-header {
        flex-direction: column;
        gap: var(--spacing-sm);
        align-items: stretch;
      }

      .toolbar-section {
        flex: 1 1 100%;
        justify-content: space-between;
      }

      .search-box {
        max-width: none;
      }
    }

    /* Theme Variables */
    :host([theme="light"]) {
      --vscode-editor-background: #ffffff;
      --vscode-foreground: #000000;
      --vscode-widget-border: #e0e0e0;
      --vscode-textBlockQuote-background: #f5f5f5;
      --vscode-textBlockQuote-border: #d0d0d0;
    }

    :host([theme="dark"]) {
      --vscode-editor-background: #1e1e1e;
      --vscode-foreground: #d4d4d4;
      --vscode-widget-border: #333333;
      --vscode-textBlockQuote-background: #2d2d2d;
      --vscode-textBlockQuote-border: #3e3e42;
    }
  `;

  willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('variables')) {
      this.initializeValues();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.initializeValues();
  }

  private initializeValues() {
    const newValues: Record<string, Jinja2VariableValue> = {};

    this.variables.forEach(variable => {

      if (this.values[variable.name] !== undefined) {
        newValues[variable.name] = this.values[variable.name];
      } else {

        newValues[variable.name] = variable.defaultValue ?? this.generateDefaultValue(variable.type);
      }
    });

    this.values = newValues;
  }

  private generateDefaultValue(type: string): Jinja2VariableValue {
    const defaults: Record<string, Jinja2VariableValue> = {
      string: 'demo_value',
      number: 42,
      integer: 42,
      boolean: true,
      date: new Date().toISOString().split('T')[0],
      datetime: new Date().toISOString(),
      json: {},
      uuid: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      url: 'https://example.com',
      null: null
    };
    return defaults[type] || 'demo_value';
  }

  private handleVariableChange(event: CustomEvent<VariableChangeEvent>) {
    const { name, value, type } = event.detail;

    this.values = {
      ...this.values,
      [name]: value
    };


    if (type) {
      const variableIndex = this.variables.findIndex(v => v.name === name);
      if (variableIndex >= 0) {
        const updatedVariables = [...this.variables];
        updatedVariables[variableIndex] = {
          ...updatedVariables[variableIndex],
          type: type
        };
        this.variables = updatedVariables;
      }
    }


    this.dispatchEvent(new CustomEvent<VariableChangeEvent>('variable-change', {
      detail: { name, value, type },
      bubbles: true,
      composed: true
    }));

    // Note: We no longer auto-trigger template-render events on variable changes
    // Users must manually click the submit button to close the editor
  }

  private renderTimeout: number | null = null;

  private debouncedRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = window.setTimeout(() => {
      this.performRender();
    }, 300);
  }

  private async performRender() {
    if (!this.template) return;

    this.isProcessing = true;
    const startTime = performance.now();

    try {

      await new Promise(resolve => setTimeout(resolve, 100));

      this.processingTime = performance.now() - startTime;
      this.renderCount++;


      this.dispatchEvent(new CustomEvent<TemplateRenderEvent>('template-render', {
        detail: {
          template: this.template,
          values: this.values,
          result: this.getRenderedResult(),
          error: undefined
        },
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      this.dispatchEvent(new CustomEvent<TemplateRenderEvent>('template-render', {
        detail: {
          template: this.template,
          values: this.values,
          result: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isProcessing = false;
    }
  }

  private getRenderedResult(): string {
    try {
      // Try to use Nunjucks if available for proper template rendering
      if (typeof nunjucks !== 'undefined') {
        const env = nunjucks.configure({ autoescape: false });

        // Add essential filters
        env.addFilter('sql_quote', (value: unknown) => {
          if (value == null) return 'NULL';
          if (typeof value === 'string') return `'${(value as string).replace(/'/g, "''")}'`;
          if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
          if (typeof value === 'number') return String(value);
          if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          return String(value);
        });

        env.addFilter('default', (value: unknown, defaultValue: unknown) => {
          return value !== null && value !== undefined && value !== '' ? value : defaultValue;
        });

        const rendered = nunjucks.renderString(this.template, this.values);
        return rendered;
      }
    } catch (error) {
      console.warn('Nunjucks rendering failed in getRenderedResult, using fallback:', error);
    }

    // Fallback to simple variable replacement
    let result = this.template;

    Object.entries(this.values).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
      result = result.replace(regex, this.formatValue(value));
    });

    return result;
  }

  private formatValue(value: Jinja2VariableValue): string {
    if (value == null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return String(value);
  }

  private handleCopyAll() {
    const result = this.getRenderedResult();
    navigator.clipboard.writeText(result).then(() => {
      this.showNotification('SQL 已复制到剪贴板');
    }).catch(() => {
      this.showNotification('复制 SQL 失败', 'error');
    });
  }

  private handleSubmit() {
    const result = this.getRenderedResult();
    this.dispatchEvent(new CustomEvent('template-render', {
      detail: {
        template: this.template,
        values: this.values,
        result: result,
        error: undefined
      },
      bubbles: true,
      composed: true
    }));
  }

  private handleReset() {
    this.initializeValues();
    this.showNotification('值已重置为默认值');
  }

  private handleExportConfig() {
    const config = {
      template: this.template,
      variables: this.variables.map(v => ({
        name: v.name,
        type: v.type,
        description: v.description,
        value: this.values[v.name]
      }))
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jinja2-config.json';
    a.click();
    URL.revokeObjectURL(url);

    this.showNotification('配置已导出');
  }

  private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: var(--vscode-notification-background);
      color: var(--vscode-notification-foreground);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      max-width: 300px;
      word-wrap: break-word;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private getVariableStats(): { total: number; configured: number; required: number; requiredConfigured: number } {
    const total = this.variables.length;
    const configured = Object.keys(this.values).filter(key =>
      this.values[key] !== undefined && this.values[key] !== null && this.values[key] !== ''
    ).length;
    const required = this.variables.filter(v => v.isRequired).length;
    const requiredConfigured = this.variables.filter(v =>
      v.isRequired && this.values[v.name] !== undefined && this.values[v.name] !== null && this.values[v.name] !== ''
    ).length;

    return { total, configured, required, requiredConfigured };
  }

  render() {
    const stats = this.getVariableStats();

    return html`
      <div class="editor-container">
        <!-- Variables Panel -->
        <div class="variables-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">
                <span>📝</span>
                变量设置
                <span class="panel-subtitle">${stats.configured}/${stats.total} 已配置</span>
              </div>
            </div>
            <div class="panel-actions">
              <button
                class="icon-button"
                @click=${this.handleReset}
                title="重置所有值为默认值"
              >
                🔄
              </button>
              <button
                class="icon-button"
                @click=${this.handleExportConfig}
                title="导出配置"
              >
                📥
              </button>
            </div>
          </div>

          <div class="toolbar">
            <div class="toolbar-section">
              <div class="search-box">
                <span class="search-icon">🔍</span>
                <input
                  type="text"
                  class="search-input"
                  placeholder="搜索变量..."
                />
              </div>
            </div>
          </div>

          <div class="panel-content">
            ${this.variables.length === 0 ? html`
              <div class="empty-state">
                <div class="empty-icon">📋</div>
                <div class="empty-title">未找到变量</div>
                <div class="empty-description">
                  此模板中未检测到任何变量。
                  请添加一些 Jinja2 变量，例如 {{ variable_name }} 来开始使用。
                </div>
              </div>
            ` : html`
              <div class="variables-list">
                ${this.variables.map(variable => html`
                  <jinja-variable-input
                    .variable=${variable}
                    .value=${this.values[variable.name]}
                    @change=${this.handleVariableChange}
                  ></jinja-variable-input>
                `)}
              </div>
            `}
          </div>

          <div class="status-bar">
            <div class="status-info">
              <div class="status-item">
                <span class="status-indicator ${classMap({
                  success: stats.requiredConfigured === stats.required,
                  processing: stats.requiredConfigured < stats.required && stats.required > 0
                })}"></span>
                <span>${stats.requiredConfigured}/${stats.required} 必需</span>
              </div>
              ${this.renderCount > 0 ? html`
                <div class="status-item">
                  <span>${this.renderCount} 次渲染</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="preview-panel">
          <div class="panel-header">
            <div class="panel-title">
              <span>👁️</span>
              SQL 预览
              ${this.processingTime > 0 ? html`
                <span class="panel-subtitle">${Math.round(this.processingTime)}ms</span>
              ` : ''}
            </div>
            <div class="panel-actions">
              <span class="status-indicator processing" title="自动渲染已启用"></span>
            </div>
          </div>

          <div class="quick-actions">
            <button
              class="action-button primary"
              @click=${this.handleSubmit}
              ?disabled=${!this.template}
            >
              ✅ 完成并退出
            </button>
            <button
              class="action-button"
              @click=${this.handleCopyAll}
              ?disabled=${!this.template}
            >
              📋 复制 SQL
            </button>
                      </div>

          <jinja-sql-preview
            .template=${this.template}
            .values=${this.values}
            .variables=${this.variables}
            .theme=${this.theme}
            .showOriginal=${this.showOriginal}
            .autoRender=${true}
            @template-render=${(e: CustomEvent<TemplateRenderEvent>) => {
              this.dispatchEvent(new CustomEvent('template-render', {
                detail: e.detail,
                bubbles: true,
                composed: true
              }));
            }}
          ></jinja-sql-preview>
        </div>

        ${this.isProcessing ? html`
          <div class="loading-overlay">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <div>正在处理模板...</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'jinja2-editor': Jinja2Editor;
  }
}

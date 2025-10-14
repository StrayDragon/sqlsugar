/**
 * Jinja2 Editor V2 - Simplified version following V1 pattern
 * Includes V2 features: template highlighting, variable interaction, left-right split layout
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import type { Jinja2Variable, Jinja2VariableValue } from '../types.js';

@customElement('jinja2-editor-v2')
export class Jinja2EditorV2 extends LitElement {
  @property({ type: String }) accessor template: string = '';
  @property({ type: Array }) accessor variables: Jinja2Variable[] = [];
  @property({ attribute: false }) accessor config: any = {
    popoverPlacement: 'auto',
    highlightStyle: 'background',
    autoPreview: true,
    keyboardNavigation: true,
    animationsEnabled: true,
    showSuggestions: true,
    autoFocusFirst: false
  };
  @property({ type: String }) accessor theme: string = 'vscode-dark';
  // @ts-ignore - Lit property decorators don't need override
  @property({ type: Boolean }) accessor showOriginal = true;
  // @ts-ignore - Lit property decorators don't need override
  @property({ type: String }) accessor title = 'Jinja2 Template Editor V2';

  @state() accessor values: Record<string, Jinja2VariableValue> = {};
  @state() accessor selectedVariable: string | null = null;
  @state() accessor isProcessing = false;
  @state() accessor processingTime = 0;
  @state() accessor highlightedTemplate: string = '';
  @state() accessor isWideLayout = false;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      height: 100vh;
      overflow: hidden;
    }

    /* CSS Variables */
    :host {
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --spacing-xl: 24px;
      --border-radius-sm: 4px;
      --border-radius-md: 6px;
      --border-radius-lg: 8px;
      --border-width: 1px;
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
      --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.15);
      --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.2);
      --transition-fast: 0.15s ease;
      --transition-normal: 0.2s ease;
      --font-size-xs: 11px;
      --font-size-sm: 12px;
      --font-size-md: 13px;
      --font-size-lg: 14px;
      --font-size-xl: 16px;
      --font-weight-normal: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --line-height-tight: 1.3;
      --line-height-normal: 1.5;
      --line-height-relaxed: 1.6;
    }

    /* Main Container */
    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
    }

    /* Header */
    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: var(--border-width) solid var(--vscode-widget-border);
      background: var(--vscode-titleBar-background);
      backdrop-filter: blur(10px);
      z-index: 10;
      flex-shrink: 0;
    }

    .header-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-titleBar-activeForeground);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .header-subtitle {
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: var(--border-radius-sm);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-actions {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .header-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: var(--border-width) solid var(--vscode-widget-border);
      padding: 6px 12px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: var(--font-weight-medium);
    }

    .header-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
    }

    .header-button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-border);
    }

    .header-button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    /* Layout Container */
    .layout-container {
      display: flex;
      flex: 1;
      overflow: hidden;
      position: relative;
    }

    /* Wide Layout (side-by-side) */
    .wide-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      padding: var(--spacing-lg);
      height: 100%;
    }

    /* Narrow Layout (stacked) */
    .narrow-layout {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-md);
      height: 100%;
      gap: var(--spacing-md);
    }

    /* Panel Styles */
    .editor-panel, .preview-panel {
      background: var(--vscode-editor-background);
      border-radius: var(--border-radius-lg);
      border: var(--border-width) solid var(--vscode-widget-border);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      backdrop-filter: blur(10px);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-md) var(--spacing-lg);
      border-bottom: var(--border-width) solid var(--vscode-widget-border);
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-textBlockQuote-background) 100%);
      flex-shrink: 0;
    }

    .panel-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .panel-subtitle {
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: var(--border-radius-sm);
      font-weight: var(--font-weight-medium);
    }

    .panel-content {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    /* Template Display */
    .template-display {
      padding: var(--spacing-lg);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      line-height: var(--line-height-relaxed);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }

    .variable-highlight {
      cursor: pointer;
      background-color: rgba(66, 133, 244, 0.2);
      border: 1px solid transparent;
      border-radius: 3px;
      padding: 1px 3px;
      margin: -1px -3px;
      transition: all var(--transition-fast);
      position: relative;
    }

    .variable-highlight:hover {
      background-color: rgba(66, 133, 244, 0.3);
      border-color: var(--vscode-focusBorder);
    }

    .variable-highlight.selected {
      background-color: rgba(66, 133, 244, 0.4);
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 8px rgba(66, 133, 244, 0.5);
    }

    .variable-highlight.required::after {
      content: '*';
      position: absolute;
      right: -8px;
      top: -2px;
      color: var(--vscode-errorForeground);
      font-weight: bold;
      font-size: 12px;
      opacity: 0;
      transition: opacity var(--transition-fast);
    }

    .variable-highlight:hover::after,
    .variable-highlight.selected::after {
      opacity: 1;
    }

    /* Variable Input Panel */
    .variable-input-panel {
      padding: var(--spacing-lg);
    }

    .variable-input {
      margin-bottom: var(--spacing-md);
      padding: var(--spacing-md);
      border: var(--border-width) solid var(--vscode-widget-border);
      border-radius: var(--border-radius-md);
      background: var(--vscode-editor-background);
    }

    .variable-input.selected {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-textBlockQuote-background);
    }

    .variable-name {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      margin-bottom: var(--spacing-sm);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .variable-type {
      font-size: var(--font-size-xs);
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: var(--border-radius-sm);
    }

    .variable-required {
      color: var(--vscode-errorForeground);
      font-size: var(--font-size-xs);
    }

    .variable-input-field {
      width: 100%;
      padding: 8px;
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      outline: none;
      box-sizing: border-box;
    }

    .variable-input-field:focus {
      border-color: var(--vscode-focusBorder);
      outline: var(--border-width) solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .variable-type-select {
      width: 100%;
      padding: 8px;
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      outline: none;
      margin-top: var(--spacing-sm);
      box-sizing: border-box;
    }

    /* SQL Preview */
    .sql-preview {
      padding: var(--spacing-lg);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      line-height: var(--line-height-relaxed);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-lg);
      border-top: var(--border-width) solid var(--vscode-widget-border);
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-textBlockQuote-background) 100%);
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
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
      padding: 2px 6px;
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm);
      border: var(--border-width) solid var(--vscode-widget-border);
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--vscode-badge-background);
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
    }

    .status-indicator.success {
      background-color: var(--vscode-charts-green);
      box-shadow: 0 0 6px rgba(74, 184, 114, 0.4);
    }

    .status-indicator.processing {
      background-color: var(--vscode-charts-blue);
      animation: pulse 1.5s ease-in-out infinite;
      box-shadow: 0 0 6px rgba(66, 133, 244, 0.4);
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.6;
        transform: scale(1.2);
      }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xl);
      color: var(--vscode-descriptionForeground);
      text-align: center;
      border: 2px dashed var(--vscode-widget-border);
      border-radius: var(--border-radius-md);
      background: var(--vscode-textBlockQuote-background);
      margin: var(--spacing-lg);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
      opacity: 0.6;
    }

    .empty-title {
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      margin-bottom: var(--spacing-sm);
      color: var(--vscode-foreground);
    }

    .empty-description {
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      opacity: 0.8;
      max-width: 400px;
    }

    /* Responsive Design */
    @media (min-width: 1024px) {
      .layout-container {
        padding: var(--spacing-lg);
      }

      .wide-layout {
        grid-template-columns: 1fr 1fr;
      }
    }

    @media (max-width: 1023px) {
      .layout-container {
        padding: var(--spacing-md);
      }

      .wide-layout {
        display: flex;
        flex-direction: column;
      }
    }

    @media (max-width: 768px) {
      .editor-header {
        flex-direction: column;
        gap: var(--spacing-sm);
        align-items: stretch;
      }

      .header-actions {
        justify-content: center;
      }
    }
  `;

  override willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('variables')) {
      this.initializeValues();
      this.highlightTemplate();
    }
    if (changedProperties.has('template')) {
      this.highlightTemplate();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.initializeValues();
    this.highlightTemplate();
    this.checkLayout();

    // Listen for resize events
    window.addEventListener('resize', this.handleResize);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    this.checkLayout();
  };

  private checkLayout() {
    const newIsWide = window.innerWidth >= 1024;
    if (newIsWide !== this.isWideLayout) {
      this.isWideLayout = newIsWide;
      this.requestUpdate();
    }
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

  private highlightTemplate() {
    if (!this.template) {
      this.highlightedTemplate = '';
      return;
    }

    let highlighted = this.template;

    // Highlight all variables in the template
    this.variables.forEach(variable => {
      const regex = new RegExp(`{{\\s*${variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
      highlighted = highlighted.replace(regex, (match) => {
        const isSelected = this.selectedVariable === variable.name;
        const isRequired = variable.isRequired;
        const classes = [
          'variable-highlight',
          isSelected ? 'selected' : '',
          isRequired ? 'required' : ''
        ].filter(Boolean).join(' ');

        return `<span class="${classes}" data-variable="${variable.name}" onclick="this.parentElement.parentElement.parentElement.parentElement.querySelector('.jinja2-editor-v2').selectVariable('${variable.name}')">${match}</span>`;
      });
    });

    this.highlightedTemplate = highlighted;
  }

  private selectVariable(variableName: string) {
    this.selectedVariable = variableName;
    this.highlightTemplate();

    // Scroll to the variable input
    const inputElement = this.shadowRoot?.querySelector(`[data-variable-input="${variableName}"]`) as HTMLElement;
    if (inputElement) {
      inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private handleVariableChange(variableName: string, value: Jinja2VariableValue) {
    this.values = {
      ...this.values,
      [variableName]: value
    };

    if (this.config.autoPreview) {
      this.renderTemplate();
    }
  }

  private handleVariableTypeChange(variableName: string, newType: string) {
    const variableIndex = this.variables.findIndex(v => v.name === variableName);
    if (variableIndex >= 0) {
      const updatedVariables = [...this.variables];
      updatedVariables[variableIndex] = {
        ...updatedVariables[variableIndex],
        type: newType as any
      };
      this.variables = updatedVariables;
    }
  }

  private async renderTemplate() {
    if (!this.template) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {
      // Simulate rendering delay
      await new Promise(resolve => setTimeout(resolve, 100));

      this.processingTime = performance.now() - startTime;

      // Use simple template rendering (similar to V1)
      let result = this.template;
      Object.entries(this.values).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
        result = result.replace(regex, this.formatValue(value));
      });

      // Store result for display
      this.renderedResult = result;

    } catch (error) {
      console.error('Template rendering failed:', error);
      this.renderedResult = '';
    } finally {
      this.isProcessing = false;
    }
  }

  private renderedResult: string = '';

  private formatValue(value: Jinja2VariableValue): string {
    if (value == null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return String(value);
  }

  private handleCopyTemplate() {
    navigator.clipboard.writeText(this.template).then(() => {
      this.showNotification('模板已复制到剪贴板');
    });
  }

  private handleCopyResult() {
    navigator.clipboard.writeText(this.renderedResult).then(() => {
      this.showNotification('SQL已复制到剪贴板');
    });
  }

  private handleSubmit() {
    this.renderTemplate(); // Ensure latest result
    this.dispatchEvent(new CustomEvent('template-submit', {
      detail: {
        template: this.template,
        values: this.values,
        result: this.renderedResult
      },
      bubbles: true,
      composed: true
    }));
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

  private getVariableStats() {
    const total = this.variables.length;
    const configured = Object.keys(this.values).filter(key =>
      this.values[key] !== undefined && this.values[key] !== null
    ).length;
    const required = this.variables.filter(v => v.isRequired).length;
    const requiredConfigured = this.variables.filter(v =>
      v.isRequired && this.values[v.name] !== undefined && this.values[v.name] !== null
    ).length;

    return { total, configured, required, requiredConfigured };
  }

  override render() {
    const stats = this.getVariableStats();
    const layoutClass = this.isWideLayout ? 'wide-layout' : 'narrow-layout';

    return html`
      <div class="editor-container">
        <!-- Header -->
        <header class="editor-header">
          <div class="header-title">
            <span>🎨</span>
            ${this.title}
            <span class="header-subtitle">V2</span>
          </div>
          <div class="header-actions">
            <button class="header-button" @click=${this.handleCopyTemplate} title="Copy template">
              📄 Copy Template
            </button>
            <button class="header-button" @click=${this.handleCopyResult} title="Copy result">
              📋 Copy Result
            </button>
            <button class="header-button primary" @click=${this.handleSubmit}>
              ✅ Submit
            </button>
          </div>
        </header>

        <!-- Main Layout -->
        <main class="layout-container ${layoutClass}">
          <!-- Template and Variables Panel -->
          <section class="editor-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>📝</span> Template & Variables
                <span class="panel-subtitle">${stats.configured}/${stats.total} configured</span>
              </div>
            </div>
            <div class="panel-content">
              <!-- Template Display -->
              <div class="template-display" .innerHTML=${this.highlightedTemplate}></div>

              <!-- Variable Inputs -->
              ${this.variables.length > 0 ? html`
                <div class="variable-input-panel">
                  ${this.variables.map(variable => html`
                    <div class="variable-input ${this.selectedVariable === variable.name ? 'selected' : ''}" data-variable-input="${variable.name}">
                      <div class="variable-name">
                        ${variable.name}
                        <span class="variable-type">${variable.type}</span>
                        ${variable.isRequired ? html`<span class="variable-required">*</span>` : ''}
                      </div>
                      <input
                        type="text"
                        class="variable-input-field"
                        .value=${this.values[variable.name] || ''}
                        @input=${(e: Event) => this.handleVariableChange(variable.name, (e.target as HTMLInputElement).value)}
                        placeholder="Enter value for ${variable.name}"
                      />
                      <select
                        class="variable-type-select"
                        .value=${variable.type}
                        @change=${(e: Event) => this.handleVariableTypeChange(variable.name, (e.target as HTMLSelectElement).value)}
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="integer">Integer</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                        <option value="datetime">DateTime</option>
                        <option value="json">JSON</option>
                        <option value="null">NULL</option>
                      </select>
                    </div>
                  `)}
                </div>
              ` : html`
                <div class="empty-state">
                  <div class="empty-icon">📋</div>
                  <div class="empty-title">No variables found</div>
                  <div class="empty-description">
                    This template doesn't contain any variables. Add Jinja2 variables like {{ variable_name }} to start editing.
                  </div>
                </div>
              `}
            </div>
          </section>

          <!-- SQL Preview Panel -->
          <section class="preview-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>👁️</span> SQL Preview
                ${this.processingTime > 0 ? html`
                  <span class="panel-subtitle">${Math.round(this.processingTime)}ms</span>
                ` : ''}
              </div>
            </div>
            <div class="panel-content">
              ${this.renderedResult ? html`
                <div class="sql-preview">${this.renderedResult}</div>
              ` : html`
                <div class="empty-state">
                  <div class="empty-icon">🔍</div>
                  <div class="empty-title">No SQL preview</div>
                  <div class="empty-description">
                    Configure variables to see the rendered SQL preview here.
                  </div>
                </div>
              `}
            </div>
          </section>
        </main>

        <!-- Status Bar -->
        <footer class="status-bar">
          <div class="status-info">
            <div class="status-item">
              <span class="status-indicator ${classMap({
                success: stats.requiredConfigured === stats.required,
                processing: stats.requiredConfigured < stats.required && stats.required > 0
              })}"></span>
              <span>${stats.requiredConfigured}/${stats.required} required</span>
            </div>
            <div class="status-item">
              <span>🔧 ${stats.total} variables</span>
            </div>
            <div class="status-item">
              <span>📱 ${this.isWideLayout ? 'Wide' : 'Narrow'} layout</span>
            </div>
          </div>
          <div class="status-info">
            <div class="status-item">
              <span>⚡ ${this.config.animationsEnabled ? 'Animations on' : 'Animations off'}</span>
            </div>
          </div>
        </footer>

        <!-- Loading Overlay -->
        ${this.isProcessing ? html`
          <div class="loading-overlay">
            <div class="loading-content">
              <div class="loading-spinner"></div>
              <div>Rendering template...</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'jinja2-editor-v2': Jinja2EditorV2;
  }
}

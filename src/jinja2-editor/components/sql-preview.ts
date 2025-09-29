import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { Jinja2Variable, Jinja2VariableValue } from '../types.js';

@customElement('jinja-sql-preview')
export class JinjaSqlPreview extends LitElement {
  @property({ type: String }) template: string = '';
  @property({ type: Object }) values: Record<string, Jinja2VariableValue> = {};
  @property({ type: Array }) variables: Jinja2Variable[] = [];
  @property({ type: String }) theme: string = 'vscode-dark';
  @property({ type: Boolean }) showOriginal = true;
  @property({ type: Boolean }) autoRender = true;
  @property({ type: Boolean }) highlightSyntax = true;

  @state() private renderedSQL: string = '';
  @state() private renderError: string | null = null;
  @state() private isRendering = false;
  @state() private lastRenderTime = 0;

  static styles = css`
    :host {
      display: block;
      height: 100%;
      font-family: var(--vscode-font-family);
    }

    .preview-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: var(--vscode-editor-background);
      border-radius: var(--border-radius-md);
      border: 1px solid var(--vscode-widget-border);
      overflow: hidden;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: 1px solid var(--vscode-widget-border);
      background-color: var(--vscode-editor-background);
      min-height: 40px;
    }

    .preview-title {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .preview-actions {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .toggle-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 4px 8px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
    }

    .toggle-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .toggle-button.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .render-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 12px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .render-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .render-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .preview-content {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .template-section {
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .template-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-md);
      background-color: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textBlockQuote-border);
    }

    .template-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--vscode-foreground);
    }

    .template-meta {
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
    }

    .template-content {
      padding: var(--spacing-md);
      background-color: var(--vscode-textBlockQuote-background);
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      white-space: pre-wrap;
      overflow-y: auto;
      max-height: 150px;
      color: var(--vscode-foreground);
    }

    .sql-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .sql-content {
      flex: 1;
      padding: var(--spacing-md);
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: var(--line-height-normal);
      white-space: pre-wrap;
      overflow-y: auto;
      color: var(--vscode-foreground);
    }

    .sql-content.theme-vscode-dark {
      background-color: #1e1e1e;
    }

    .sql-content.theme-vscode-light {
      background-color: #ffffff;
    }

    .sql-content.theme-github-dark {
      background-color: #0d1117;
    }

    .sql-content.theme-github-light {
      background-color: #ffffff;
    }

    .sql-content.theme-monokai {
      background-color: #272822;
    }

    /* SQL Syntax Highlighting */
    .sql-keyword {
      color: #569cd6;
      font-weight: var(--font-weight-medium);
    }

    .sql-string {
      color: #ce9178;
    }

    .sql-number {
      color: #b5cea8;
    }

    .sql-comment {
      color: #6a9955;
      font-style: italic;
    }

    .sql-function {
      color: #dcdcaa;
    }

    .sql-operator {
      color: #d4d4d4;
    }

    .sql-identifier {
      color: #9cdcfe;
    }

    .sql-variable {
      color: #4ec9b0;
      background-color: rgba(78, 201, 176, 0.1);
      padding: 0 2px;
      border-radius: 2px;
    }

    .error-section {
      background-color: var(--vscode-errorBackground);
      color: var(--vscode-errorForeground);
      padding: var(--spacing-md);
      margin: var(--spacing-md);
      border-radius: var(--border-radius-sm);
      border-left: 3px solid var(--vscode-errorForeground);
      font-size: var(--font-size-sm);
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .error-icon {
      font-size: var(--font-size-lg);
      opacity: 0.8;
    }

    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-md);
      border-top: 1px solid var(--vscode-widget-border);
      background-color: var(--vscode-editor-background);
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
      background-color: var(--vscode-badge-background);
    }

    .status-indicator.error {
      background-color: var(--vscode-errorForeground);
    }

    .status-indicator.warning {
      background-color: var(--vscode-warningForeground);
    }

    .copy-button {
      background: none;
      border: 1px solid var(--vscode-button-border);
      color: var(--vscode-button-foreground);
      padding: 2px 6px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
    }

    .copy-button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .copy-button.copied {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
      opacity: 0.5;
    }

    .empty-text {
      font-size: var(--font-size-md);
      margin-bottom: var(--spacing-sm);
    }

    .empty-subtext {
      font-size: var(--font-size-sm);
      opacity: 0.8;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .preview-header {
        flex-direction: column;
        gap: var(--spacing-sm);
        align-items: stretch;
      }

      .preview-actions {
        justify-content: center;
      }

      .template-content {
        max-height: 100px;
        font-size: 12px;
      }

      .sql-content {
        font-size: 12px;
      }
    }
  `;

  willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (
      (changedProperties.has('template') ||
       changedProperties.has('values') ||
       changedProperties.has('variables') ||
       changedProperties.has('autoRender')) &&
      this.autoRender
    ) {
      this.renderTemplate();
    }
  }

  async renderTemplate() {
    if (!this.template) {
      this.renderedSQL = '';
      this.renderError = null;
      return;
    }

    this.isRendering = true;
    const startTime = performance.now();

    try {
      // Use actual nunjucks rendering if available, otherwise fall back to simulation
      if (typeof nunjucks !== 'undefined') {
        this.renderedSQL = this.renderWithNunjucks(this.template, this.values);
      } else {
        this.renderedSQL = this.simulateTemplateRendering(this.template, this.values);
      }
      this.renderError = null;
    } catch (error) {
      this.renderedSQL = '';
      this.renderError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.isRendering = false;
      this.lastRenderTime = performance.now() - startTime;
    }
  }

  private simulateTemplateRendering(template: string, values: Record<string, Jinja2VariableValue>): string {
    // Simple template rendering simulation
    let result = template;

    // Replace variables
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
      result = result.replace(regex, this.formatValue(value));
    });

    // Handle simple conditionals (very basic simulation)
    result = result.replace(/{% if (.*?) %}/g, (match, condition) => {
      const varName = condition.trim();
      const value = values[varName];
      return value ? '' : '-- ';
    });

    result = result.replace(/{% endif %}/g, '');

    return result;
  }

  private renderWithNunjucks(template: string, values: Record<string, Jinja2VariableValue>): string {
    try {
      // Configure nunjucks environment
      const env = nunjucks.configure({ autoescape: false });

      // Add all filters from the main WebView implementation
      env.addFilter('float', (value: unknown) => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      });

      env.addFilter('int', (value: unknown) => {
        const num = parseInt(value, 10);
        return isNaN(num) ? 0 : num;
      });

      env.addFilter('default', (value: unknown, defaultValue: unknown) => {
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
      });

      env.addFilter('length', (value: unknown) => {
        if (Array.isArray(value)) return value.length;
        if (typeof value === 'string') return value.length;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length;
        return 0;
      });

      env.addFilter('bool', (value: unknown) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          return lowerValue === 'true' || lowerValue === '1' || lowerValue !== 'false' && lowerValue !== '0' && value !== '';
        }
        return Boolean(value);
      });

      env.addFilter('string', (value: unknown) => {
        return String(value);
      });

      env.addFilter('abs', (value: unknown) => {
        return Math.abs(Number(value));
      });

      env.addFilter('round', (value: unknown) => {
        return Math.round(Number(value));
      });

      env.addFilter('sum', (value: unknown) => {
        if (Array.isArray(value)) {
          return value.reduce((sum, item) => sum + Number(item), 0);
        }
        return Number(value);
      });

      env.addFilter('min', (value: unknown) => {
        if (Array.isArray(value)) {
          return Math.min(...value.map(item => Number(item)));
        }
        return Number(value);
      });

      env.addFilter('max', (value: unknown) => {
        if (Array.isArray(value)) {
          return Math.max(...value.map(item => Number(item)));
        }
        return Number(value);
      });

      env.addFilter('striptags', (value: unknown) => {
        return String(value).replace(/<[^>]*>/g, '');
      });

      env.addFilter('truncate', (value: unknown) => {
        return String(value).substring(0, 255) + '...';
      });

      env.addFilter('unique', (value: unknown) => {
        if (Array.isArray(value)) {
          return [...new Set(value)];
        }
        return value;
      });

      env.addFilter('reverse', (value: unknown) => {
        if (Array.isArray(value)) {
          return [...value].reverse();
        } else if (typeof value === 'string') {
          return value.split('').reverse().join('');
        }
        return value;
      });

      env.addFilter('first', (value: unknown) => {
        if (Array.isArray(value)) {
          return value[0];
        }
        return value;
      });

      env.addFilter('last', (value: unknown) => {
        if (Array.isArray(value)) {
          return value[value.length - 1];
        }
        return value;
      });

      env.addFilter('slice', (value: unknown) => {
        if (Array.isArray(value)) {
          return value.slice(0, 10);
        }
        return value;
      });

      env.addFilter('wordwrap', (value: unknown, width: unknown = 80) => {
        const text = String(value);
        const result = [];
        for (let i = 0; i < text.length; i += width) {
          result.push(text.substring(i, i + width));
        }
        return result.join('\n');
      });

      env.addFilter('urlencode', (value: unknown) => {
        return encodeURIComponent(String(value));
      });

      env.addFilter('sql_quote', (value: unknown) => {
        if (value == null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return String(value);
      });

      env.addFilter('sql_identifier', (value: unknown) => {
        if (typeof value !== 'string') return String(value);
        return `"${value.replace(/"/g, '""')}"`;
      });

      env.addFilter('sql_date', (value: unknown) => {
        if (value == null) return 'NULL';
        const date = new Date(value);
        if (isNaN(date.getTime())) return `'${value}'`;
        return `'${date.toISOString().split('T')[0]}'`;
      });

      env.addFilter('sql_datetime', (value: unknown) => {
        if (value == null) return 'NULL';
        const date = new Date(value);
        if (isNaN(date.getTime())) return `'${value}'`;
        return `'${date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')}'`;
      });

      env.addFilter('sql_in', (value: unknown) => {
        if (value == null) return 'NULL';
        if (Array.isArray(value)) {
          return `(${value.map(v => {
            if (v == null) return 'NULL';
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            return String(v);
          }).join(', ')})`;
        }
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return String(value);
      });

      // Render the template with nunjucks
      const rendered = nunjucks.renderString(template, values);
      return rendered;
    } catch (error) {
      console.error('Nunjucks rendering failed:', error);
      // Fall back to simulation if nunjucks fails
      return this.simulateTemplateRendering(template, values);
    }
  }

  private formatValue(value: Jinja2VariableValue): string {
    if (value == null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return String(value);
  }

  private highlightSQL(sql: string): string {
    if (!this.highlightSyntax) return sql;

    // Use simple string matching to avoid regex compilation issues
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'TABLE', 'INDEX', 'CREATE', 'ALTER', 'DROP', 'DATABASE', 'SCHEMA', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION'];

    // Convert to HTML entities first to avoid XSS
    let result = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Sort keywords by length (longest first) to ensure proper matching
    keywords.sort((a, b) => b.length - a.length);

    // Use string matching for keywords to avoid regex issues
    keywords.forEach(keyword => {
      const upperKeyword = keyword.toUpperCase();
      const upperResult = result.toUpperCase();
      let lastIndex = 0;
      let highlighted = '';

      while (true) {
        const index = upperResult.indexOf(upperKeyword, lastIndex);
        if (index === -1) break;

        // Check word boundaries
        const beforeChar = index > 0 ? result[index - 1] : ' ';
        const afterChar = index + keyword.length < result.length ? result[index + keyword.length] : ' ';
        const isWordBoundary = !/[a-zA-Z0-9_]/.test(beforeChar) && !/[a-zA-Z0-9_]/.test(afterChar);

        if (isWordBoundary) {
          highlighted += result.substring(lastIndex, index);
          highlighted += '<span class="sql-keyword">' + result.substring(index, index + keyword.length) + '</span>';
          lastIndex = index + keyword.length;
        } else {
          highlighted += result.substring(lastIndex, index + 1);
          lastIndex = index + 1;
        }
      }

      if (highlighted) {
        highlighted += result.substring(lastIndex);
        result = highlighted;
      }
    });

    // Use simple regex patterns for strings, numbers, and comments
    result = result.replace(/'[^']*'/g, match => '<span class="sql-string">' + match + '</span>');
    result = result.replace(/`[^`]*`/g, match => '<span class="sql-identifier">' + match + '</span>');
    result = result.replace(/"[^"]*"/g, match => '<span class="sql-identifier">' + match + '</span>');
    result = result.replace(/\b\d+(\.\d+)?\b/g, match => '<span class="sql-number">' + match + '</span>');
    result = result.replace(/--.*$/gm, match => '<span class="sql-comment">' + match + '</span>');
    result = result.replace(/\/\*[\s\S]*?\*\//g, match => '<span class="sql-comment">' + match + '</span>');

    return result;
  }

  private async copyToClipboard() {
    try {
      // Try the standard clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(this.renderedSQL);
        this.showCopySuccess();
      } else {
        // Fallback to the parent extension
        await this.fallbackCopyToExtension();
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Try fallback method
      await this.fallbackCopyToExtension();
    }
  }

  private async fallbackCopyToExtension() {
    try {
      // Send message to parent extension to handle clipboard operations
      const message = {
        command: 'copyToClipboard',
        text: this.renderedSQL
      };

      // Post message to the parent window (extension host)
      window.parent.postMessage(message, '*');
      this.showCopySuccess();
    } catch (error) {
      console.error('Fallback clipboard copy failed:', error);
    }
  }

  private showCopySuccess() {
    const button = this.shadowRoot?.querySelector('.copy-button') as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('copied');

      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('copied');
      }, 2000);
    }
  }

  private handleManualRender() {
    this.renderTemplate();
  }

  private toggleOriginalTemplate() {
    this.showOriginal = !this.showOriginal;
  }

  private getVariableCount(): number {
    return Object.keys(this.values).length;
  }

  private getTemplateComplexity(): string {
    if (!this.template) return 'empty';

    let score = 0;
    if (this.template.includes('{{')) score += 1;
    if (this.template.includes('{%')) score += 2;
    if (this.template.includes('for ') || this.template.includes('endfor')) score += 2;
    if (this.template.includes('if ') || this.template.includes('elif ')) score += 1;

    if (score <= 2) return 'simple';
    if (score <= 5) return 'medium';
    return 'complex';
  }

  render() {
    const hasContent = !!this.template;
    const hasError = !!this.renderError;
    const complexity = this.getTemplateComplexity();

    return html`
      <div class="preview-container">
        <div class="preview-header">
          <div class="preview-title">
            <span>SQL Preview</span>
            <span class="status-indicator ${classMap({
              success: !hasError && hasContent,
              error: hasError,
              warning: !hasContent
            })}"></span>
          </div>

          <div class="preview-actions">
            ${this.showOriginal ? html`
              <button
                class="toggle-button"
                @click=${this.toggleOriginalTemplate}
                title="Toggle original template"
              >
                Hide Template
              </button>
            ` : html`
              <button
                class="toggle-button"
                @click=${this.toggleOriginalTemplate}
                title="Show original template"
              >
                Show Template
              </button>
            `}

            ${!this.autoRender ? html`
              <button
                class="render-button"
                @click=${this.handleManualRender}
                ?disabled=${this.isRendering}
                title="Render template"
              >
                ${this.isRendering ? html`<span class="spinner"></span>` : '▶'}
                Render
              </button>
            ` : ''}
          </div>
        </div>

        <div class="preview-content">
          ${this.showOriginal && this.template ? html`
            <div class="template-section">
              <div class="template-header">
                <span class="template-title">Original Template</span>
                <span class="template-meta">${complexity} complexity</span>
              </div>
              <div class="template-content">${this.template}</div>
            </div>
          ` : ''}

          <div class="sql-section">
            ${hasError ? html`
              <div class="error-section">
                <span class="error-icon">⚠</span>
                <div>
                  <div>Template rendering failed</div>
                  <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${this.renderError}</div>
                </div>
              </div>
            ` : hasContent ? html`
              <div class="sql-content ${classMap({
                [`theme-${this.theme}`]: true
              })}" .innerHTML=${this.highlightSQL(this.renderedSQL)}></div>
            ` : html`
              <div class="empty-state">
                <div class="empty-icon">📄</div>
                <div class="empty-text">No template to preview</div>
                <div class="empty-subtext">Enter a Jinja2 template to see the rendered SQL</div>
              </div>
            `}
          </div>
        </div>

        <div class="status-bar">
          <div class="status-info">
            <div class="status-item">
              <span class="status-indicator ${classMap({
                success: !hasError && hasContent,
                error: hasError,
                warning: !hasContent
              })}"></span>
              <span>${this.getVariableCount()} variables</span>
            </div>
            ${this.lastRenderTime > 0 ? html`
              <div class="status-item">
                <span>${Math.round(this.lastRenderTime)}ms</span>
              </div>
            ` : ''}
          </div>

          ${hasContent && !hasError ? html`
            <button
              class="copy-button"
              @click=${this.copyToClipboard}
              title="Copy SQL to clipboard"
            >
              Copy
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'jinja-sql-preview': JinjaSqlPreview;
  }
}

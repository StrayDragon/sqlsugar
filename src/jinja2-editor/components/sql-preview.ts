import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state } from 'lit/decorators.js';
import { Jinja2Variable, Jinja2VariableValue } from '../types.js';

declare const nunjucks: any;

@customElement('jinja-sql-preview')
export class JinjaSqlPreview extends LitElement {
  @property({ type: String }) accessor template: string = '';
  @property({ attribute: false }) accessor values: Record<string, Jinja2VariableValue> = {};
  @property({ attribute: false }) accessor variables: Jinja2Variable[] = [];
  @property({ type: String }) accessor theme: string = 'vscode-dark';
  @property({ type: Boolean }) accessor showOriginal: boolean = true;
  @property({ type: Boolean }) accessor autoRender: boolean = true;
  @property({ type: Boolean }) accessor highlightSyntax: boolean = true;
  @state() accessor renderedSQL: string = '';
  @state() accessor renderError: string | null = null;
  @state() accessor isRendering = false;
  @state() accessor lastRenderTime = 0;

  static styles = css`
    /* Highlight.js base styles for Shadow DOM - VS2015 theme */
    .hljs {
      background: #1e1e1e;
      color: #dcdcdc;
      display: block;
      overflow-x: auto;
      padding: 1em;
    }

    .hljs-keyword,
    .hljs-literal,
    .hljs-name,
    .hljs-symbol {
      color: #569cd6;
    }

    .hljs-link {
      color: #569cd6;
      text-decoration: underline;
    }

    .hljs-built_in,
    .hljs-type {
      color: #4ec9b0;
    }

    .hljs-class,
    .hljs-number {
      color: #b8d7a3;
    }

    .hljs-meta .hljs-string,
    .hljs-string {
      color: #d69d85;
    }

    .hljs-regexp,
    .hljs-template-tag {
      color: #9a5334;
    }

    .hljs-formula,
    .hljs-function,
    .hljs-params,
    .hljs-subst,
    .hljs-title {
      color: #dcdcdc;
    }

    .hljs-comment,
    .hljs-quote {
      color: #57a64a;
      font-style: italic;
    }

    .hljs-doctag {
      color: #608b4e;
    }

    .hljs-meta,
    .hljs-meta .hljs-keyword,
    .hljs-tag {
      color: #9b9b9b;
    }

    .hljs-template-variable,
    .hljs-variable {
      color: #bd63c5;
    }

    .hljs-attr,
    .hljs-attribute {
      color: #9cdcfe;
    }

    .hljs-section {
      color: gold;
    }

    .hljs-emphasis {
      font-style: italic;
    }

    .hljs-strong {
      font-weight: 700;
    }

    .hljs-bullet,
    .hljs-selector-attr,
    .hljs-selector-class,
    .hljs-selector-id,
    .hljs-selector-pseudo,
    .hljs-selector-tag {
      color: #d7ba7d;
    }

    .hljs-addition {
      background-color: #144212;
      display: inline-block;
      width: 100%;
    }

    .hljs-deletion {
      background-color: #600;
      display: inline-block;
      width: 100%;
    }

    pre code.hljs {
      display: block;
      overflow-x: auto;
      padding: 1em;
    }

    code.hljs {
      padding: 3px 5px;
    }

    :host {
      display: block;
      height: 100%;
      font-family: var(--vscode-font-family);
      /* Enhanced variables */
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --border-radius-sm: 4px;
      --border-radius-md: 6px;
      --border-radius-lg: 8px;
      --border-width: 1px;
      --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
      --shadow-md: 0 2px 6px rgba(0, 0, 0, 0.15);
      --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.2);
      --transition-fast: 0.15s ease;
      --font-size-xs: 11px;
      --font-size-sm: 12px;
      --font-size-md: 13px;
      --font-size-lg: 14px;
      --font-weight-normal: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --line-height-tight: 1.3;
      --line-height-normal: 1.5;
      --line-height-relaxed: 1.6;
    }

    .preview-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
      border-radius: var(--border-radius-lg);
      border: var(--border-width) solid var(--vscode-widget-border);
      overflow: hidden;
      box-shadow: var(--shadow-md);
      backdrop-filter: blur(10px);
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-lg);
      border-bottom: var(--border-width) solid var(--vscode-widget-border);
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-textBlockQuote-background) 100%);
      min-height: 48px;
      box-shadow: var(--shadow-sm);
    }

    .preview-title {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      font-size: var(--font-size-md);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .preview-actions {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .toggle-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: var(--border-width) solid var(--vscode-widget-border);
      padding: 6px 12px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
      font-weight: var(--font-weight-medium);
      box-shadow: var(--shadow-sm);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toggle-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .toggle-button:active {
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }

    .toggle-button.active {
      background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-badge-background) 100%);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .render-button {
      background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-badge-background) 100%);
      color: var(--vscode-button-foreground);
      border: var(--border-width) solid var(--vscode-button-border);
      padding: 6px 16px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: var(--font-weight-medium);
      box-shadow: var(--shadow-sm);
    }

    .render-button:hover {
      background: linear-gradient(135deg, var(--vscode-button-hoverBackground) 0%, var(--vscode-button-background) 100%);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }

    .render-button:active {
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }

    .render-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
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
      border-top: var(--border-width) solid var(--vscode-widget-border);
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

    .status-actions {
      display: flex;
      gap: var(--spacing-xs);
      align-items: center;
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
      if (typeof nunjucks !== 'undefined') {
        this.renderedSQL = this.renderWithNunjucks(this.template, this.values);
      } else {
        this.renderedSQL = this.simulateTemplateRendering(this.template, this.values);
      }
      this.renderError = null;
    } catch (error) {
      console.error('SQL Preview rendering failed:', error);
      console.error('Template:', this.template);
      console.error('Values:', this.values);
      this.renderedSQL = '';
      this.renderError = error instanceof Error ? error.message : 'Unknown error';

      // Try fallback rendering
      try {
        this.renderedSQL = this.simulateTemplateRendering(this.template, this.values);
        this.renderError = null; // Clear error if fallback works
      } catch (fallbackError) {
        console.error('Fallback rendering also failed:', fallbackError);
        this.renderedSQL = '// Rendering failed. Please check your template and values.';
      }
    } finally {
      this.isRendering = false;
      this.lastRenderTime = performance.now() - startTime;
    }
  }

  private simulateTemplateRendering(template: string, values: Record<string, Jinja2VariableValue>): string {
    let result = template;
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*}}`, 'g');
      result = result.replace(regex, this.formatValue(value));
    });
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
      const env = nunjucks.configure({ autoescape: false });
      env.addFilter('float', (value: unknown) => {
        const num = parseFloat(value as string);
        return isNaN(num) ? 0 : num;
      });
      env.addFilter('int', (value: unknown) => {
        const num = parseInt(value as string, 10);
        return isNaN(num) ? 0 : num;
      });
      env.addFilter('default', (value: unknown, defaultValue: unknown) => {
        return value !== null && value !== undefined && value !== '' ? value : defaultValue;
      });
      env.addFilter('length', (value: unknown) => {
        if (Array.isArray(value)) return value.length;
        if (typeof value === 'string') return value.length;
        if (typeof value === 'object' && value !== null) return Object.keys(value as object).length;
        return 0;
      });
      env.addFilter('bool', (value: unknown) => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          return lowerValue === 'true' || lowerValue === '1' || (lowerValue !== 'false' && lowerValue !== '0' && value !== '');
        }
        return Boolean(value);
      });
      env.addFilter('string', (value: unknown) => String(value));
      env.addFilter('abs', (value: unknown) => Math.abs(Number(value)));
      env.addFilter('round', (value: unknown) => Math.round(Number(value)));
      env.addFilter('sum', (value: unknown) => {
        if (Array.isArray(value)) {
          return (value as unknown[]).reduce((acc: number, item: unknown) => acc + Number(item), 0);
        }
        return Number(value);
      });
      env.addFilter('min', (value: unknown) => {
        if (Array.isArray(value)) {
          return Math.min(...(value as unknown[]).map(item => Number(item)));
        }
        return Number(value);
      });
      env.addFilter('max', (value: unknown) => {
        if (Array.isArray(value)) {
          return Math.max(...(value as unknown[]).map(item => Number(item)));
        }
        return Number(value);
      });
      env.addFilter('striptags', (value: unknown) => String(value).replace(/<[^>]*>/g, ''));
      env.addFilter('truncate', (value: unknown) => String(value).substring(0, 255) + '...');
      env.addFilter('unique', (value: unknown) => Array.isArray(value) ? [...new Set(value as unknown[])] : value);
      env.addFilter('reverse', (value: unknown) => {
        if (Array.isArray(value)) return [...(value as unknown[])].reverse();
        if (typeof value === 'string') return (value as string).split('').reverse().join('');
        return value;
      });
      env.addFilter('first', (value: unknown) => Array.isArray(value) ? (value as unknown[])[0] : value);
      env.addFilter('last', (value: unknown) => Array.isArray(value) ? (value as unknown[])[(value as unknown[]).length - 1] : value);
      env.addFilter('slice', (value: unknown) => Array.isArray(value) ? (value as unknown[]).slice(0, 10) : value);
      env.addFilter('wordwrap', (value: unknown, width: unknown = 80) => {
        const text = String(value);
        const w = typeof width === 'number' ? width : 80;
        const result: string[] = [];
        for (let i = 0; i < text.length; i += w) {
          result.push(text.substring(i, i + w));
        }
        return result.join('\n');
      });
      env.addFilter('urlencode', (value: unknown) => encodeURIComponent(String(value)));
      env.addFilter('sql_quote', (value: unknown) => {
        if (value == null) return 'NULL';
        if (typeof value === 'string') return `'${(value as string).replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (typeof value === 'number') return String(value);
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        return String(value);
      });
      env.addFilter('sql_identifier', (value: unknown) => typeof value !== 'string' ? String(value) : `"${(value as string).replace(/"/g, '""')}"`);
      env.addFilter('sql_date', (value: unknown) => {
        if (value == null) return 'NULL';
        const date = new Date(value as string | number | Date);
        if (isNaN(date.getTime())) return `'${String(value)}'`;
        return `'${date.toISOString().split('T')[0]}'`;
      });
      env.addFilter('sql_datetime', (value: unknown) => {
        if (value == null) return 'NULL';
        const date = new Date(value as string | number | Date);
        if (isNaN(date.getTime())) return `'${String(value)}'`;
        return `'${date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')}'`;
      });
      env.addFilter('sql_in', (value: unknown) => {
        if (value == null) return 'NULL';
        if (Array.isArray(value)) {
          return `(${(value as unknown[]).map(v => {
            if (v == null) return 'NULL';
            if (typeof v === 'string') return `'${(v as string).replace(/'/g, "''")}'`;
            if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
            return String(v);
          }).join(', ')})`;
        }
        if (typeof value === 'string') return `'${(value as string).replace(/'/g, "''")}'`;
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        return String(value);
      });

      const rendered = nunjucks.renderString(template, values);
      return rendered;
    } catch (error) {
      console.error('Nunjucks rendering failed:', error);
      console.error('Template:', template);
      console.error('Values:', values);
      console.error('Error details:', error instanceof Error ? error.stack : error);
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
    if (!this.highlightSyntax) return this.escapeHtml(sql);

    // Try to use highlight.js if available
    try {
      const hljs = (globalThis as any).hljs;
      if (hljs && hljs.highlight) {
        const result = hljs.highlight(sql, { language: 'sql', ignoreIllegals: true });
        return `<pre><code class="hljs sql">${result.value}</code></pre>`;
      }
    } catch (error) {
      // Fallback to simple highlighting if highlight.js fails
      console.warn('highlight.js not available, using fallback highlighting:', error);
    }

    // Fallback to simple keyword highlighting
    return `<pre><code class="sql-content">${this.simpleHighlightSQL(sql)}</code></pre>`;
  }

  private simpleHighlightSQL(sql: string): string {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'TABLE', 'INDEX', 'CREATE', 'ALTER', 'DROP', 'DATABASE', 'SCHEMA', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION'];
    let result = this.escapeHtml(sql);
    keywords.sort((a, b) => b.length - a.length);
    keywords.forEach(keyword => {
      const upperKeyword = keyword.toUpperCase();
      const upperResult = result.toUpperCase();
      let lastIndex = 0;
      let highlighted = '';
      while (true) {
        const index = upperResult.indexOf(upperKeyword, lastIndex);
        if (index === -1) break;
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
    result = result.replace(/'[^']*'/g, match => '<span class="sql-string">' + match + '</span>');
    result = result.replace(/`[^`]*`/g, match => '<span class="sql-identifier">' + match + '</span>');
    result = result.replace(/"[^"]*"/g, match => '<span class="sql-identifier">' + match + '</span>');
    result = result.replace(/\b\d+(\.\d+)?\b/g, match => '<span class="sql-number">' + match + '</span>');
    result = result.replace(/--.*$/gm, match => '<span class="sql-comment">' + match + '</span>');
    result = result.replace(/\/\*[\s\S]*?\*\//g, match => '<span class="sql-comment">' + match + '</span>');
    return result;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private async copyToClipboard() {
    try {
      // Ensure we have the latest rendered SQL
      if (!this.renderedSQL && this.template) {
        await this.renderTemplate();
      }

      const sqlToCopy = this.renderedSQL || this.template || '';

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sqlToCopy);
        this.showCopySuccess();
      } else {
        await this.fallbackCopyToExtension(sqlToCopy);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      await this.fallbackCopyToExtension(this.renderedSQL || this.template || '');
    }
  }

  private async fallbackCopyToExtension(textToCopy?: string, buttonSelector: string = '.copy-button') {
    try {
      const text = textToCopy || this.renderedSQL || this.template || '';
      const message = { command: 'copyToClipboard', text };
      window.parent.postMessage(message, '*');
      this.showCopySuccess(buttonSelector);
    } catch (error) {
      console.error('Fallback clipboard copy failed:', error);
    }
  }

  private async copyTemplateToClipboard() {
    try {
      const templateToCopy = this.template || '';

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(templateToCopy);
        this.showCopySuccess('copy-template-button');
      } else {
        await this.fallbackCopyToExtension(templateToCopy, 'copy-template-button');
      }
    } catch (error) {
      console.error('Failed to copy template to clipboard:', error);
      await this.fallbackCopyToExtension(this.template || '', 'copy-template-button');
    }
  }

  private showCopySuccess(buttonSelector: string = '.copy-button') {
    const button = this.shadowRoot?.querySelector(buttonSelector) as HTMLButtonElement;
    if (button) {
      const originalText = button.textContent;
      button.textContent = '已复制!';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = originalText as string;
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
              <button class="toggle-button" @click=${this.toggleOriginalTemplate} title="Toggle original template">Hide Template</button>
            ` : html`
              <button class="toggle-button" @click=${this.toggleOriginalTemplate} title="Show original template">Show Template</button>
            `}
            ${!this.autoRender ? html`
              <button class="render-button" @click=${this.handleManualRender} ?disabled=${this.isRendering} title="Render template">
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
              <div class="sql-content ${classMap({ [`theme-${this.theme}`]: true })}">${unsafeHTML(this.highlightSQL(this.renderedSQL))}</div>
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
            ${this.lastRenderTime > 0 ? html`<div class="status-item"><span>${Math.round(this.lastRenderTime)}ms</span></div>` : ''}
          </div>
          <div class="status-actions">
            ${hasContent && !hasError ? html`
              <button class="copy-button copy-template-button" @click=${this.copyTemplateToClipboard} title="复制原始模板到剪贴板">复制模板</button>
              <button class="copy-button copy-sql-button" @click=${this.copyToClipboard} title="Copy SQL to clipboard">复制 SQL</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}


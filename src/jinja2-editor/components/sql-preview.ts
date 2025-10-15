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
  @state() accessor activeVariable: string | null = null;
  @state() accessor popupPosition: { x: number; y: number } = { x: 0, y: 0 };
  @state() accessor popupValue: string = '';

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
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
    }

    .sql-variable:hover {
      background-color: rgba(78, 201, 176, 0.2);
      transform: scale(1.05);
      box-shadow: 0 1px 3px rgba(78, 201, 176, 0.3);
    }

    .template-variable {
      color: #d19a66;
      background-color: rgba(209, 154, 102, 0.1);
      padding: 0 2px;
      border-radius: 2px;
      cursor: pointer;
      transition: all var(--transition-fast);
      text-decoration: underline;
      text-decoration-style: dotted;
      text-underline-offset: 2px;
      font-weight: var(--font-weight-medium);
    }

    .template-variable:hover {
      background-color: rgba(209, 154, 102, 0.2);
      transform: scale(1.05);
      box-shadow: 0 1px 3px rgba(209, 154, 102, 0.3);
    }

    /* Variable Popup */
    .variable-popup {
      position: absolute;
      background: var(--vscode-editor-background);
      border: var(--border-width) solid var(--vscode-widget-border);
      border-radius: var(--border-radius-md);
      box-shadow: var(--shadow-lg);
      padding: var(--spacing-md);
      z-index: 1000;
      min-width: 280px;
      max-width: 400px;
      backdrop-filter: blur(10px);
    }

    .variable-popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);
      padding-bottom: var(--spacing-sm);
      border-bottom: var(--border-width) solid var(--vscode-widget-border);
    }

    .variable-popup-title {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      font-size: var(--font-size-md);
    }

    .variable-popup-close {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: var(--font-size-lg);
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--border-radius-sm);
      transition: all var(--transition-fast);
    }

    .variable-popup-close:hover {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .variable-popup-content {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    .variable-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--font-size-sm);
    }

    .variable-info-label {
      color: var(--vscode-descriptionForeground);
      font-weight: var(--font-weight-medium);
    }

    .variable-info-value {
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
    }

    .variable-value-input {
      width: 100%;
      padding: 6px 8px;
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: var(--font-size-sm);
      font-family: var(--vscode-font-family);
      outline: none;
    }

    .variable-value-input:focus {
      border-color: var(--vscode-focusBorder);
      outline: var(--border-width) solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .variable-value-select {
      width: 100%;
      padding: 6px 8px;
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: var(--font-size-sm);
      font-family: var(--vscode-font-family);
      outline: none;
    }

    .variable-value-select:focus {
      border-color: var(--vscode-focusBorder);
      outline: var(--border-width) solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .variable-value-checkbox {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm);
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      cursor: pointer;
    }

    .variable-value-checkbox:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .variable-value-checkbox input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
    }

    .variable-value-checkbox label {
      cursor: pointer;
      user-select: none;
    }

    .variable-popup-actions {
      display: flex;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-sm);
      padding-top: var(--spacing-sm);
      border-top: var(--border-width) solid var(--vscode-widget-border);
    }

    .variable-popup-button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: var(--border-width) solid var(--vscode-button-border);
      padding: 6px 12px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
      font-weight: var(--font-weight-medium);
    }

    .variable-popup-button:hover {
      background: var(--vscode-button-hoverBackground);
      border-color: var(--vscode-focusBorder);
    }

    .variable-popup-button.primary {
      background: linear-gradient(135deg, var(--vscode-badge-background) 0%, var(--vscode-button-background) 100%);
      color: var(--vscode-badge-foreground);
      border-color: var(--vscode-focusBorder);
    }

    .variable-popup-button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-color: var(--vscode-widget-border);
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

    // Process {% if %} blocks first
    result = this.processIfBlocks(result, values);

    // Process {% for %} blocks
    result = this.processForBlocks(result, values);

    // Process simple variable substitutions {{ variable }}
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${this.escapeRegex(key)}\\s*}}`, 'g');
      result = result.replace(regex, this.formatValue(value));
    });

    // Process complex variable expressions with filters and attributes
    result = this.processComplexVariables(result, values);

    return result;
  }

  private processIfBlocks(template: string, values: Record<string, Jinja2VariableValue>): string {
    let result = template;

    // Handle {% if condition %}...{% endif %} blocks
    const ifBlockRegex = /{%\s*if\s+([^%]+?)\s*%}([\s\S]*?){%\s*endif\s*%}/g;

    result = result.replace(ifBlockRegex, (match, condition, content) => {
      const shouldRender = this.evaluateCondition(condition, values);
      return shouldRender ? content : '';
    });

    // Handle {% if condition %}...{% else %}...{% endif %} blocks
    const ifElseRegex = /{%\s*if\s+([^%]+?)\s*%}([\s\S]*?){%\s*else\s*%}([\s\S]*?){%\s*endif\s*%}/g;

    result = result.replace(ifElseRegex, (match, condition, ifContent, elseContent) => {
      const shouldRender = this.evaluateCondition(condition, values);
      return shouldRender ? ifContent : elseContent;
    });

    // Handle {% if condition %}...{% elif condition %}...{% else %}...{% endif %} blocks
    const ifElifRegex = /{%\s*if\s+([^%]+?)\s*%}([\s\S]*?){%\s*elif\s+([^%]+?)\s*%}([\s\S]*?){%\s*else\s*%}([\s\S]*?){%\s*endif\s*%}/g;

    result = result.replace(ifElifRegex, (match, ifCondition, ifContent, elifCondition, elifContent, elseContent) => {
      if (this.evaluateCondition(ifCondition, values)) {
        return ifContent;
      } else if (this.evaluateCondition(elifCondition, values)) {
        return elifContent;
      } else {
        return elseContent;
      }
    });

    return result;
  }

  private processForBlocks(template: string, values: Record<string, Jinja2VariableValue>): string {
    let result = template;

    // Handle simple {% for item in items %}...{% endfor %} blocks
    const forRegex = /{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}([\s\S]*?){%\s*endfor\s*%}/g;

    result = result.replace(forRegex, (match, itemVar, arrayVar, content) => {
      const arrayValue = values[arrayVar];
      if (!Array.isArray(arrayValue)) return '';

      return arrayValue.map((item, index) => {
        let itemContent = content;

        // Replace {{ itemVar }} with actual item
        const itemRegex = new RegExp(`{{\\s*${this.escapeRegex(itemVar)}\\s*}}`, 'g');
        itemContent = itemContent.replace(itemRegex, this.formatValue(item));

        // Replace {{ loop.index }} with 1-based index
        const loopIndexRegex = /\{\{\s*loop\.index\s*\}\}/g;
        itemContent = itemContent.replace(loopIndexRegex, String(index + 1));

        // Replace {{ loop.index0 }} with 0-based index
        const loopIndex0Regex = /\{\{\s*loop\.index0\s*\}\}/g;
        itemContent = itemContent.replace(loopIndex0Regex, String(index));

        return itemContent;
      }).join('\n');
    });

    return result;
  }

  private processComplexVariables(template: string, values: Record<string, Jinja2VariableValue>): string {
    let result = template;

    // Handle variables with filters: {{ variable | filter }}
    result = result.replace(/\{\{\s*([^|}]+?)\s*\|\s*([^}]+?)\s*\}\}/g, (match, varExpression, filterExpression) => {
      const varName = varExpression.trim();
      const filterName = filterExpression.trim();
      const value = values[varName];

      if (value === undefined) return match;

      return this.applyFilter(value, filterName);
    });

    // Handle object attributes: {{ object.property }}
    result = result.replace(/\{\{\s*(\w+)\.(\w+)\s*\}\}/g, (match, objName, propName) => {
      const objValue = values[objName];
      if (typeof objValue === 'object' && objValue !== null) {
        const propValue = (objValue as Record<string, unknown>)[propName];
        return this.formatValue(propValue);
      }
      return match;
    });

    return result;
  }

  private evaluateCondition(condition: string, values: Record<string, Jinja2VariableValue>): boolean {
    const trimmedCondition = condition.trim();

    // Handle simple variable conditions: {% if variable %}
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmedCondition)) {
      const value = values[trimmedCondition];
      return this.isTruthy(value);
    }

    // Handle negation: {% if not variable %}
    if (trimmedCondition.startsWith('not ')) {
      const varName = trimmedCondition.substring(4).trim();
      const value = values[varName];
      return !this.isTruthy(value);
    }

    // Handle equality: {% if variable == value %}
    const equalityMatch = trimmedCondition.match(/^(.+?)\s*==\s*(.+?)$/);
    if (equalityMatch) {
      const [, left, right] = equalityMatch;
      const leftValue = this.extractValue(left, values);
      const rightValue = this.extractValue(right, values);
      return leftValue === rightValue;
    }

    // Handle inequality: {% if variable != value %}
    const inequalityMatch = trimmedCondition.match(/^(.+?)\s*!=\s*(.+?)$/);
    if (inequalityMatch) {
      const [, left, right] = inequalityMatch;
      const leftValue = this.extractValue(left, values);
      const rightValue = this.extractValue(right, values);
      return leftValue !== rightValue;
    }

    // Handle boolean AND: {% if variable1 and variable2 %}
    if (trimmedCondition.includes(' and ')) {
      const parts = trimmedCondition.split(/\s+and\s+/);
      return parts.every(part => this.evaluateCondition(part, values));
    }

    // Handle boolean OR: {% if variable1 or variable2 %}
    if (trimmedCondition.includes(' or ')) {
      const parts = trimmedCondition.split(/\s+or\s+/);
      return parts.some(part => this.evaluateCondition(part, values));
    }

    // Default: treat as variable existence check
    const value = values[trimmedCondition];
    return this.isTruthy(value);
  }

  private extractValue(expr: string, values: Record<string, Jinja2VariableValue>): unknown {
    const trimmed = expr.trim();

    // Handle string literals
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }

    // Handle numeric literals
    if (/^\d+$/.test(trimmed)) {
      return parseInt(trimmed, 10);
    }

    if (/^\d+\.\d+$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // Handle boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;

    // Handle variables
    return values[trimmed];
  }

  private isTruthy(value: Jinja2VariableValue): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0 && value !== 'false' && value !== '0';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return Boolean(value);
  }

  private applyFilter(value: Jinja2VariableValue, filterName: string): string {
    const filter = filterName.trim();
    const val = value === null ? null : value;

    switch (filter) {
      case 'upper':
        return String(val).toUpperCase();
      case 'lower':
        return String(val).toLowerCase();
      case 'title':
        return String(val).replace(/\b\w/g, l => l.toUpperCase());
      case 'trim':
        return String(val).trim();
      case 'sql_quote':
        if (val == null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return String(val);
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
      case 'default':
        // For simplicity, just return the value
        return this.formatValue(val);
      default:
        return this.formatValue(val);
    }
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
        return `<pre><code class="hljs sql">${this.highlightVariablesInHighlightedSQL(result.value)}</code></pre>`;
      }
    } catch (error) {
      // Fallback to simple highlighting if highlight.js fails
      console.warn('highlight.js not available, using fallback highlighting:', error);
    }

    // Fallback to simple keyword highlighting
    return `<pre><code class="sql-content">${this.simpleHighlightSQL(sql)}</code></pre>`;
  }

  private highlightVariablesInHighlightedSQL(highlightedSQL: string): string {
    let result = highlightedSQL;

    // Apply variable highlighting to the already highlighted SQL
    Object.keys(this.values).forEach(varName => {
      const regex = new RegExp(`(${this.escapeRegex(varName)})`, 'gi');
      result = result.replace(regex, (match, p1, offset) => {
        // Check if this match is already inside an HTML tag
        const beforeMatch = result.substring(0, offset);
        const lastLtIndex = beforeMatch.lastIndexOf('<');
        const lastGtIndex = beforeMatch.lastIndexOf('>');
        const isInTag = lastLtIndex > lastGtIndex;

        if (!isInTag) {
          return `<span class="sql-variable" data-variable="${varName}">${match}</span>`;
        }
        return match;
      });
    });

    return result;
  }

  // Highlight variables in the original template
  private highlightTemplateVariables(template: string): string {
    if (!template) return '';

    let result = this.escapeHtml(template);

    // Highlight all variable references in the template
    // Match {{ variable }} patterns (including complex expressions)
    result = result.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, varExpression) => {
      // Extract the primary variable name from expressions like:
      // - variable
      // - variable.property
      // - variable | filter
      // - object.property
      const varName = varExpression.trim().split('.')[0].split('|')[0].trim();

      if (this.values.hasOwnProperty(varName)) {
        return `<span class="template-variable" data-variable="${varName}">${match}</span>`;
      }
      return match;
    });

    // Highlight variables in control structures like {% if variable %}
    result = result.replace(/\{%\s*if\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    // Highlight variables in {% elif condition %}
    result = result.replace(/\{%\s*elif\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    // Highlight variables in {% for item in items %}
    result = result.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}/g, (match, itemVar, arrayVar) => {
      let highlightedMatch = match;

      // Highlight the array variable
      if (this.values.hasOwnProperty(arrayVar)) {
        const regex = new RegExp(`\\b${this.escapeRegex(arrayVar)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="template-variable" data-variable="${arrayVar}">${arrayVar}</span>`);
      }

      return highlightedMatch;
    });

    return result;
  }

  private highlightVariablesInCondition(match: string, condition: string): string {
    let highlightedMatch = match;

    // Extract variable names from complex conditions
    // Handle patterns like:
    // - variable
    // - not variable
    // - variable == value
    // - variable != value
    // - variable1 and variable2
    // - variable1 or variable2

    // Find all potential variable names
    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = condition.match(variableRegex) || [];

    // Filter out keywords and operators
    const excludedWords = new Set([
      'and', 'or', 'not', 'in', 'like', 'between', 'is', 'null', 'true', 'false', 'exists',
      'eq', 'ne', 'lt', 'gt', 'le', 'ge', // comparison operators
      'defined', 'undefined' // other operators
    ]);

    const varNames = matches
      .map(match => match.trim())
      .filter(match => !excludedWords.has(match.toLowerCase()))
      .filter(varName => this.values.hasOwnProperty(varName));

    // Highlight each variable
    varNames.forEach(varName => {
      const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
      highlightedMatch = highlightedMatch.replace(regex,
        `<span class="template-variable" data-variable="${varName}">${varName}</span>`);
    });

    return highlightedMatch;
  }

  private simpleHighlightSQL(sql: string): string {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'TABLE', 'INDEX', 'CREATE', 'ALTER', 'DROP', 'DATABASE', 'SCHEMA', 'VIEW', 'TRIGGER', 'PROCEDURE', 'FUNCTION'];
    let result = this.escapeHtml(sql);

    // First, highlight Jinja2 variables before SQL keywords
    // This ensures we don't double-highlight variables that might be part of SQL strings
    Object.keys(this.values).forEach(varName => {
      const regex = new RegExp(`(${this.escapeRegex(varName)})`, 'gi');
      result = result.replace(regex, (match, p1, offset) => {
        // Check if this match is already inside an HTML tag
        const beforeMatch = result.substring(0, offset);
        const lastLtIndex = beforeMatch.lastIndexOf('<');
        const lastGtIndex = beforeMatch.lastIndexOf('>');
        const isInTag = lastLtIndex > lastGtIndex;

        if (!isInTag) {
          return `<span class="sql-variable" data-variable="${varName}">${match}</span>`;
        }
        return match;
      });
    });

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

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  private async fallbackCopyToExtension(textToCopy?: string, buttonSelector: string = '.copy-button', isTemplate: boolean = false) {
    try {
      const text = textToCopy || this.renderedSQL || this.template || '';
      const message = { command: 'copyToClipboard', text, isTemplate };
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
        this.showCopySuccess('.copy-template-button');
        // Also send message to extension for consistent feedback
        const message = { command: 'copyToClipboard', text: templateToCopy, isTemplate: true };
        window.parent.postMessage(message, '*');
      } else {
        await this.fallbackCopyToExtension(templateToCopy, '.copy-template-button', true);
      }
    } catch (error) {
      console.error('Failed to copy template to clipboard:', error);
      await this.fallbackCopyToExtension(this.template || '', '.copy-template-button', true);
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

  // Handle variable click events
  private handleVariableClick(event: Event) {
    const target = event.target as HTMLElement;
    const variableName = target.getAttribute('data-variable');

    if (!variableName) return;

    // Calculate popup position
    const rect = target.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.popupPosition = {
      x: rect.left + scrollX,
      y: rect.bottom + scrollY + 5
    };

    // Set the active variable and its current value
    this.activeVariable = variableName;
    const variableType = this.getVariableType(variableName);
    this.popupValue = this.formatValueForEdit(this.values[variableName], variableType);

    // Prevent event bubbling
    event.stopPropagation();
  }

  // Handle template variable click events
  private handleTemplateVariableClick(event: Event) {
    const target = event.target as HTMLElement;
    const variableName = target.getAttribute('data-variable');

    if (!variableName) return;

    // Calculate popup position
    const rect = target.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.popupPosition = {
      x: rect.left + scrollX,
      y: rect.bottom + scrollY + 5
    };

    // Set the active variable and its current value
    this.activeVariable = variableName;
    const variableType = this.getVariableType(variableName);
    this.popupValue = this.formatValueForEdit(this.values[variableName], variableType);

    // Prevent event bubbling
    event.stopPropagation();
  }

  // Close popup when clicking outside
  private handleDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Check if click is inside popup or on a variable
    const isClickInsidePopup = target.closest('.variable-popup') !== null;
    const isClickOnVariable = target.classList.contains('sql-variable');
    const isClickOnTemplateVariable = target.classList.contains('template-variable');

    if (!isClickInsidePopup && !isClickOnVariable && !isClickOnTemplateVariable) {
      this.activeVariable = null;
      this.popupValue = '';
    }
  }

  // Handle popup value change
  private handlePopupValueChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.popupValue = target.value;
  }

  // Handle popup checkbox change
  private handlePopupCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.popupValue = target.checked.toString();
  }

  // Save variable value from popup
  private handleSaveVariable() {
    if (!this.activeVariable) return;

    const variableType = this.getVariableType(this.activeVariable);
    const newValue = this.parseValueFromEdit(this.popupValue, variableType);

    // Update the values object
    this.values = {
      ...this.values,
      [this.activeVariable]: newValue
    };

    // Dispatch change event to parent
    this.dispatchEvent(new CustomEvent('variable-change', {
      detail: {
        name: this.activeVariable,
        value: newValue,
        type: variableType
      },
      bubbles: true,
      composed: true
    }));

    // Re-render the template with new values
    this.renderTemplate();

    // Close popup
    this.activeVariable = null;
    this.popupValue = '';
  }

  // Cancel popup editing
  private handleCancelPopup() {
    this.activeVariable = null;
    this.popupValue = '';
  }

  // Format value for editing in popup
  private formatValueForEdit(value: Jinja2VariableValue, variableType?: string): string {
    const type = variableType || this.getVariableType(this.activeVariable!);

    if (value == null) {
      return type === 'null' ? 'null' : '';
    }

    switch (type) {
      case 'boolean':
        return value === true ? 'true' : 'false';

      case 'number':
      case 'integer':
        return String(value);

      case 'date':
        // Format date for date input
        if (typeof value === 'string') {
          return value.startsWith('T') ? value.substring(1) : value;
        }
        return String(value);

      case 'datetime':
        // Format datetime for datetime-local input
        if (typeof value === 'string') {
          return value.replace('T', 'T').replace(/\.\d{3}Z$/, '');
        }
        return String(value);

      case 'json':
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2);
        }
        return String(value);

      default:
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
    }
  }

  // Parse value from popup input
  private parseValueFromEdit(value: string, variableType?: string): Jinja2VariableValue {
    const type = variableType || this.getVariableType(this.activeVariable!);

    // Handle empty values
    if (!value || value.trim() === '') {
      if (type === 'null') return null;
      if (type === 'boolean') return false;
      if (type === 'number' || type === 'integer') return 0;
      return '';
    }

    switch (type) {
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';

      case 'number':
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;

      case 'integer':
        const intValue = parseInt(value, 10);
        return isNaN(intValue) ? 0 : intValue;

      case 'null':
        return value.toLowerCase() === 'null' ? null : value;

      case 'date':
      case 'datetime':
        return value; // Keep as string, let rendering handle date formatting

      case 'email':
      case 'url':
        return value; // Keep as string, validation can be added if needed

      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value; // Return as string if invalid JSON
        }

      default:
        // Try to parse as JSON for complex values
        try {
          return JSON.parse(value);
        } catch {
          // Return as string if not valid JSON
          return value;
        }
    }
  }

  // Get variable type from variables array
  private getVariableType(variableName: string): string {
    const variable = this.variables.find(v => v.name === variableName);
    return variable?.type || 'string';
  }

  // Get variable info for popup display
  private getVariableInfo(variableName: string) {
    return this.variables.find(v => v.name === variableName);
  }

  // Render appropriate input control based on variable type
  private renderVariableInput(variableType: string, currentValue: Jinja2VariableValue) {
    switch (variableType) {
      case 'boolean':
        return html`
          <div class="variable-value-checkbox">
            <input
              type="checkbox"
              ?checked=${currentValue === true}
              @change=${this.handlePopupCheckboxChange}
              id="boolean-input"
            />
            <label for="boolean-input">
              ${currentValue === true ? '是 (true)' : '否 (false)'}
            </label>
          </div>
        `;

      case 'number':
      case 'integer':
        return html`
          <input
            class="variable-value-input"
            type="number"
            step="${variableType === 'integer' ? '1' : 'any'}"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
            placeholder="输入数字..."
          />
        `;

      case 'date':
        return html`
          <input
            class="variable-value-input"
            type="date"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
          />
        `;

      case 'datetime':
        return html`
          <input
            class="variable-value-input"
            type="datetime-local"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
          />
        `;

      case 'null':
        return html`
          <select
            class="variable-value-select"
            .value=${this.popupValue}
            @change=${this.handlePopupValueChange}
          >
            <option value="null">NULL</option>
            <option value="">空字符串</option>
          </select>
        `;

      default:
        // For string, email, url, json, uuid, etc.
        if (variableType === 'email') {
          return html`
            <input
              class="variable-value-input"
              type="email"
              .value=${this.popupValue}
              @input=${this.handlePopupValueChange}
              placeholder="输入邮箱地址..."
            />
          `;
        }

        if (variableType === 'url') {
          return html`
            <input
              class="variable-value-input"
              type="url"
              .value=${this.popupValue}
              @input=${this.handlePopupValueChange}
              placeholder="输入URL..."
            />
          `;
        }

        // Default to text input for string and other types
        return html`
          <input
            class="variable-value-input"
            type="text"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
            placeholder="输入新的变量值..."
          />
        `;
    }
  }

  render() {
    const hasContent = !!this.template;
    const hasError = !!this.renderError;
    const complexity = this.getTemplateComplexity();

    return html`
      <div class="preview-container" @click=${this.handleDocumentClick}>
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
              <div
                class="template-content"
                @click=${this.handleTemplateVariableClick}
              >${unsafeHTML(this.highlightTemplateVariables(this.template))}</div>
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
              <div
                class="sql-content ${classMap({ [`theme-${this.theme}`]: true })}"
                @click=${this.handleVariableClick}
              >${unsafeHTML(this.highlightSQL(this.renderedSQL))}</div>
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

        <!-- Variable Popup -->
        ${this.activeVariable ? html`
          <div
            class="variable-popup"
            style="left: ${this.popupPosition.x}px; top: ${this.popupPosition.y}px;"
            @click=${(e: Event) => e.stopPropagation()}
          >
            <div class="variable-popup-header">
              <div class="variable-popup-title">📝 ${this.activeVariable}</div>
              <button class="variable-popup-close" @click=${this.handleCancelPopup}>×</button>
            </div>
            <div class="variable-popup-content">
              ${(() => {
                const varInfo = this.getVariableInfo(this.activeVariable!);
                const variableType = varInfo?.type || 'string';
                const currentValue = this.values[this.activeVariable!];

                return html`
                  <div class="variable-info-row">
                    <span class="variable-info-label">类型:</span>
                    <span class="variable-info-value">${variableType}</span>
                  </div>
                  <div class="variable-info-row">
                    <span class="variable-info-label">当前值:</span>
                    <span class="variable-info-value">${this.formatValueForEdit(currentValue)}</span>
                  </div>
                  ${varInfo?.description ? html`
                    <div class="variable-info-row">
                      <span class="variable-info-label">描述:</span>
                      <span class="variable-info-value">${varInfo.description}</span>
                    </div>
                  ` : ''}
                  <div class="variable-info-row">
                    <span class="variable-info-label">新值:</span>
                  </div>
                  ${this.renderVariableInput(variableType, currentValue)}
                `;
              })()}
            </div>
            <div class="variable-popup-actions">
              <button class="variable-popup-button primary" @click=${this.handleSaveVariable}>
                ✅ 保存
              </button>
              <button class="variable-popup-button secondary" @click=${this.handleCancelPopup}>
                ❌ 取消
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}


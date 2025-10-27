/**
 * SQL Preview Component V2
 *
 * Enhanced preview with syntax highlighting, error display, and diff view
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import SqlHighlighter from '../utils/sql-highlighter.js';
import type {
  EnhancedVariable,
  Jinja2VariableValue,
  TemplateRenderEventV2
} from '../types.js';

@customElement('sql-preview-v2')
export class SqlPreviewV2 extends LitElement {
  @property({ type: String }) accessor template: string = '';
  @property({ attribute: false }) accessor values: Record<string, Jinja2VariableValue> = {};
  @property({ attribute: false }) accessor variables: EnhancedVariable[] = [];
  @property({ type: String }) accessor theme: string = 'vscode-dark';
  @property({ type: Boolean }) accessor showOriginal: boolean = true;
  @property({ type: Boolean }) accessor autoRender: boolean = true;
  @property({ type: Boolean }) accessor showLineNumbers: boolean = true;
  @property({ type: Boolean }) accessor wordWrap: boolean = true;

  @state() accessor renderedSQL: string = '';
  @state() accessor renderError: string | null = null;
  @state() accessor isRendering: boolean = false;
  @state() accessor lastRenderTime: number = 0;
  @state() accessor renderMetrics: TemplateRenderEventV2['metrics'] | null = null;
  @state() accessor viewMode: 'split' | 'rendered' | 'diff' = 'split';
  @state() accessor highlightedRendered: string = '';
  @state() accessor highlightedOriginal: string = '';

  @property({ type: Boolean }) accessor syncScroll: boolean = false;

  private renderTimeout: number | null = null;
  private sqlHighlighter: SqlHighlighter;
  private leftScrollContainer: HTMLElement | null = null;
  private rightScrollContainer: HTMLElement | null = null;
  private isScrollingSync: boolean = false;
  private contentUpdateObserver: MutationObserver | null = null;

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
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
      --transition-slow: 0.3s ease;
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

    /* Toolbar */
    .preview-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-sm) var(--spacing-md);
      border-bottom: var(--border-width) solid var(--vscode-widget-border);
      background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-textBlockQuote-background) 100%);
      flex-shrink: 0;
    }

    .toolbar-section {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .toolbar-title {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .view-mode-toggle {
      display: flex;
      background: var(--vscode-button-secondaryBackground);
      border-radius: var(--border-radius-sm);
      padding: 2px;
      gap: 2px;
    }

    .view-mode-button {
      background: transparent;
      border: none;
      color: var(--vscode-button-secondaryForeground);
      padding: 4px 8px;
      border-radius: 3px;
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .view-mode-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .view-mode-button.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .toolbar-actions {
      display: flex;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .toolbar-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: var(--border-width) solid var(--vscode-widget-border);
      padding: 4px 8px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .toolbar-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
    }

    .toolbar-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toolbar-button.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 8px rgba(66, 133, 244, 0.3);
    }

    /* Content Container */
    .preview-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    /* Split View */
    .split-view {
      display: grid;
      grid-template-columns: 1fr 1fr;
      height: 100%;
      gap: var(--border-width);
    }

    .split-pane {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .pane-header {
      padding: var(--spacing-xs) var(--spacing-sm);
      background: var(--vscode-textBlockQuote-background);
      border-bottom: var(--border-width) solid var(--vscode-widget-border);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      color: var(--vscode-descriptionForeground);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }

    .pane-content {
      flex: 1;
      overflow: auto;
      position: relative;
    }

    /* Code Editor Styles */
    .code-editor {
      height: 100%;
      position: relative;
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      white-space: pre;
      overflow: auto;
      padding: var(--spacing-md);
    }

    .code-editor.word-wrap {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .code-content {
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
    }

    /* Line Numbers */
    .line-numbers {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 40px;
      background: var(--vscode-editor-lineNumbers-background);
      border-right: var(--border-width) solid var(--vscode-editor-lineNumbers-border);
      color: var(--vscode-editorLineNumbers-foreground);
      font-size: var(--font-size-xs);
      text-align: right;
      padding-right: 8px;
      padding-top: var(--spacing-md);
      user-select: none;
      overflow: hidden;
    }

    .line-number {
      height: calc(var(--line-height-normal) * 1em);
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .code-content.with-line-numbers {
      margin-left: 40px;
    }

    /* SQL Syntax Highlighting */
    .sql-keyword {
      color: var(--vscode-keyword-foreground, #569cd6);
      font-weight: var(--font-weight-medium);
    }

    .sql-string {
      color: var(--vscode-string-foreground, #ce9178);
    }

    .sql-number {
      color: var(--vscode-number-foreground, #b5cea8);
    }

    .sql-function {
      color: var(--vscode-function-foreground, #dcdcaa);
    }

    .sql-operator {
      color: var(--vscode-operator-foreground, #d4d4d4);
    }

    .sql-comment {
      color: var(--vscode-comment-foreground, #6a9955);
      font-style: italic;
    }

    .sql-variable {
      background: rgba(66, 133, 244, 0.2);
      border: 1px solid var(--vscode-focusBorder);
      border-radius: 3px;
      padding: 1px 3px;
      color: var(--vscode-foreground);
    }

    /* Error Display */
    .error-container {
      background: var(--vscode-inputValidation-errorBackground);
      border: var(--border-width) solid var(--vscode-inputValidation-errorBorder);
      border-radius: var(--border-radius-sm);
      padding: var(--spacing-md);
      margin: var(--spacing-md);
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
    }

    .error-icon {
      color: var(--vscode-errorForeground);
      font-size: var(--font-size-lg);
      flex-shrink: 0;
    }

    .error-content {
      flex: 1;
    }

    .error-title {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-errorForeground);
      margin-bottom: var(--spacing-xs);
    }

    .error-message {
      font-size: var(--font-size-sm);
      color: var(--vscode-foreground);
      line-height: var(--line-height-normal);
    }

    /* Diff View */
    .diff-view {
      height: 100%;
      overflow: auto;
      padding: var(--spacing-md);
    }

    .diff-line {
      display: flex;
      align-items: stretch;
      min-height: calc(var(--line-height-normal) * 1em);
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      font-size: var(--font-size-sm);
    }

    .diff-line-number {
      width: 40px;
      background: var(--vscode-editor-lineNumbers-background);
      color: var(--vscode-editorLineNumbers-foreground);
      text-align: right;
      padding-right: 8px;
      border-right: var(--border-width) solid var(--vscode-editor-lineNumbers-border);
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-size: var(--font-size-xs);
    }

    .diff-content {
      flex: 1;
      padding: 0 8px;
      display: flex;
      align-items: center;
      white-space: pre;
    }

    .diff-line.unchanged {
      background: transparent;
    }

    .diff-line.added {
      background: rgba(74, 184, 114, 0.1);
    }

    .diff-line.removed {
      background: rgba(249, 86, 79, 0.1);
    }

    .diff-line.modified {
      background: rgba(255, 184, 0, 0.1);
    }

    .diff-line.added .diff-content {
      color: var(--vscode-charts-green);
    }

    .diff-line.removed .diff-content {
      color: var(--vscode-charts-red);
    }

    .diff-line.modified .diff-content {
      color: var(--vscode-charts-orange);
    }

    /* Loading State */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--vscode-descriptionForeground);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--vscode-progressBar-background);
      border-top: 3px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: var(--spacing-md);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      padding: var(--spacing-xl);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: var(--spacing-md);
      opacity: 0.6;
    }

    .empty-title {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      margin-bottom: var(--spacing-sm);
      color: var(--vscode-foreground);
    }

    .empty-description {
      font-size: var(--font-size-sm);
      line-height: var(--line-height-normal);
      opacity: 0.8;
      max-width: 400px;
    }

    /* Metrics Display */
    .metrics-display {
      display: flex;
      gap: var(--spacing-md);
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
    }

    .metric-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .metric-value {
      font-weight: var(--font-weight-medium);
      color: var(--vscode-foreground);
    }

    /* Status Bar */
    .status-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--spacing-xs) var(--spacing-md);
      border-top: var(--border-width) solid var(--vscode-widget-border);
      background: var(--vscode-textBlockQuote-background);
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
    }

    .status-info {
      display: flex;
      gap: var(--spacing-md);
      align-items: center;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--vscode-badge-background);
    }

    .status-indicator.success {
      background-color: var(--vscode-charts-green);
    }

    .status-indicator.error {
      background-color: var(--vscode-charts-red);
    }

    .status-indicator.processing {
      background-color: var(--vscode-charts-blue);
      animation: pulse 1.5s ease-in-out infinite;
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

    /* Responsive Design */
    @media (max-width: 768px) {
      .split-view {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }

      .preview-toolbar {
        flex-wrap: wrap;
        gap: var(--spacing-xs);
      }

      .toolbar-section {
        flex-wrap: wrap;
      }

      .metrics-display {
        flex-direction: column;
        gap: var(--spacing-xs);
      }
    }
  `;

  override willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('template') || changedProperties.has('values')) {
      if (this.autoRender) {
        this.scheduleRender();
      }
    }

    if (changedProperties.has('syncScroll')) {
      if (this.syncScroll) {

        this.setupScrollSync();
      } else {

        this.cleanupScrollSync();
      }
    }
  }

  override connectedCallback() {
    super.connectedCallback();


    this.sqlHighlighter = new SqlHighlighter({
      theme: this.theme,
      fontSize: 14,
      showLineNumbers: this.showLineNumbers,
      wordWrap: this.wordWrap,
      highlightVariables: true
    });

    if (this.autoRender) {
      this.scheduleRender();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
      this.renderTimeout = null;
    }

    this.cleanupScrollSync();
  }

  private scheduleRender() {
    if (this.renderTimeout) {
      clearTimeout(this.renderTimeout);
    }

    this.renderTimeout = window.setTimeout(() => {
      void this.performRender();
    }, 300);
  }

  private async performRender() {
    if (!this.template) {
      this.renderedSQL = '';
      this.renderError = null;
      this.renderMetrics = null;
      return;
    }

    this.isRendering = true;
    const startTime = performance.now();

    try {

      await new Promise(resolve => setTimeout(resolve, 100));

      let result = this.template;
      const usedVariables: string[] = [];


      Object.entries(this.values).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
        if (regex.test(result)) {
          usedVariables.push(key);
          result = result.replace(regex, this.formatValue(value));
        }
      });

      const renderTime = performance.now() - startTime;
      const missingVariables = this.variables
        .filter(v => !this.values[v.name])
        .map(v => v.name);

      this.renderedSQL = result;
      this.renderError = null;
      this.renderMetrics = {
        renderTime,
        variableCount: this.variables.length,
        templateLength: this.template.length
      };


      this.highlightedRendered = this.highlightSQL(result);
      this.highlightedOriginal = this.highlightSQL(this.template);

      const renderEvent: TemplateRenderEventV2 = {
        template: this.template,
        values: this.values,
        result,
        error: undefined,
        usedVariables,
        missingVariables,
        metrics: this.renderMetrics
      };

      this.dispatchEvent(new CustomEvent('template-render', {
        detail: renderEvent,
        bubbles: true,
        composed: true
      }));

    } catch (error) {
      const renderTime = performance.now() - startTime;
      this.renderedSQL = '';
      this.renderError = error instanceof Error ? error.message : 'Unknown error';
      this.renderMetrics = {
        renderTime,
        variableCount: this.variables.length,
        templateLength: this.template.length
      };

      const renderEvent: TemplateRenderEventV2 = {
        template: this.template,
        values: this.values,
        result: '',
        error: this.renderError,
        usedVariables: [],
        missingVariables: [],
        metrics: this.renderMetrics
      };

      this.dispatchEvent(new CustomEvent('template-render', {
        detail: renderEvent,
        bubbles: true,
        composed: true
      }));
    } finally {
      this.isRendering = false;
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
    try {
      const result = this.sqlHighlighter.highlightSQL(sql, this.values);
      return result.html;
    } catch (error) {
      console.warn('SQL highlighting failed, using fallback:', error);

      return this.fallbackSQLHighlight(sql);
    }
  }

  /**
   * Fallback SQL highlighting when highlight.js fails
   */
  private fallbackSQLHighlight(sql: string): string {

    return sql

      .replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AS|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|NULL|IS|TRUE|FALSE)\b/gi, '<span class="sql-keyword">$1</span>')

      .replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>')

      .replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>')

      .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="sql-function">$1</span>(')

      .replace(/([=<>!]+|LIKE|IN|IS|AND|OR|NOT|BETWEEN)/gi, '<span class="sql-operator">$1</span>')

      .replace(/(--.*$)/gm, '<span class="sql-comment">$1</span>');
  }

  private handleViewModeChange(mode: 'split' | 'rendered' | 'diff') {
    this.viewMode = mode;


    if (mode === 'split' && this.syncScroll) {
      setTimeout(() => {
        this.setupScrollSync();
      }, 100);
    } else if (mode !== 'split') {

      this.cleanupScrollSync();
    }
  }

  private handleCopyResult() {
    void navigator.clipboard.writeText(this.renderedSQL).then(() => {
      this.showNotification('SQL已复制到剪贴板');
    });
  }

  private handleCopyTemplate() {
    void navigator.clipboard.writeText(this.template).then(() => {
      this.showNotification('模板已复制到剪贴板');
    });
  }

  private handleToggleLineNumbers() {
    this.showLineNumbers = !this.showLineNumbers;
  }

  private handleToggleWordWrap() {
    this.wordWrap = !this.wordWrap;
  }

  public setupScrollSync() {

    setTimeout(() => {
      this.initializeScrollContainers();
    }, 100);


    if (!this.contentUpdateObserver) {
      this.contentUpdateObserver = new MutationObserver(() => {
        if (this.syncScroll && this.viewMode === 'split') {

          setTimeout(() => {
            this.initializeScrollContainers();
          }, 50);
        }
      });
    }
  }

  public cleanupScrollSync() {

    if (this.leftScrollContainer) {
      this.leftScrollContainer.removeEventListener('scroll', this.handleLeftScroll);
      this.leftScrollContainer = null;
    }
    if (this.rightScrollContainer) {
      this.rightScrollContainer.removeEventListener('scroll', this.handleRightScroll);
      this.rightScrollContainer = null;
    }


    if (this.contentUpdateObserver) {
      this.contentUpdateObserver.disconnect();
      this.contentUpdateObserver = null;
    }
  }

  private initializeScrollContainers() {

    const leftPane = this.shadowRoot?.querySelector('.split-pane:first-child .pane-content');
    const rightPane = this.shadowRoot?.querySelector('.split-pane:last-child .pane-content');

    if (leftPane && rightPane) {
      this.leftScrollContainer = leftPane as HTMLElement;
      this.rightScrollContainer = rightPane as HTMLElement;


      this.leftScrollContainer.removeEventListener('scroll', this.handleLeftScroll.bind(this));
      this.rightScrollContainer.removeEventListener('scroll', this.handleRightScroll.bind(this));


      this.leftScrollContainer.addEventListener('scroll', this.handleLeftScroll.bind(this));
      this.rightScrollContainer.addEventListener('scroll', this.handleRightScroll.bind(this));


      if (this.contentUpdateObserver) {
        this.contentUpdateObserver.observe(leftPane, {
          childList: true,
          subtree: true,
          characterData: true
        });
        this.contentUpdateObserver.observe(rightPane, {
          childList: true,
          subtree: true,
          characterData: true
        });
      }
    }
  }

  private handleLeftScroll(event: Event) {
    if (!this.syncScroll || this.isScrollingSync) return;

    const leftElement = event.target as HTMLElement;
    this.syncScrollPosition('left-to-right', leftElement);
  }

  private handleRightScroll(event: Event) {
    if (!this.syncScroll || this.isScrollingSync) return;

    const rightElement = event.target as HTMLElement;
    this.syncScrollPosition('right-to-left', rightElement);
  }

  private syncScrollPosition(direction: 'left-to-right' | 'right-to-left', sourceElement: HTMLElement) {
    if (!this.leftScrollContainer || !this.rightScrollContainer) return;

    this.isScrollingSync = true;

    try {
      const sourceScrollTop = sourceElement.scrollTop;
      const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;

      if (sourceScrollHeight <= 0) return;


      const targetElement = direction === 'left-to-right'
        ? this.rightScrollContainer
        : this.leftScrollContainer;

      const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;

      if (targetScrollHeight <= 0) return;


      let targetScrollTop: number;

      try {
        targetScrollTop = this.calculateScrollPositionWithLineMapping(
          sourceScrollTop,
          sourceScrollHeight,
          targetScrollHeight,
          direction
        );
      } catch (error) {
        console.warn('Line mapping failed, using ratio-based mapping:', error);

        const scrollRatio = sourceScrollTop / sourceScrollHeight;
        targetScrollTop = scrollRatio * targetScrollHeight;
      }


      targetElement.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });

    } finally {

      setTimeout(() => {
        this.isScrollingSync = false;
      }, 50);
    }
  }

  private calculateScrollPositionWithLineMapping(
    sourceScrollTop: number,
    sourceScrollHeight: number,
    targetScrollHeight: number,
    direction: 'left-to-right' | 'right-to-left'
  ): number {

    const sourceText = direction === 'left-to-right' ? this.template : this.renderedSQL;
    const targetText = direction === 'left-to-right' ? this.renderedSQL : this.template;

    if (!sourceText || !targetText) {
      throw new Error('Missing source or target text');
    }


    const sourceLines = sourceText.split('\n');
    const sourceLineHeight = sourceScrollHeight / sourceLines.length;
    const startLineIndex = Math.floor(sourceScrollTop / sourceLineHeight);


    const sourceLinePosition = startLineIndex / sourceLines.length;
    const targetScrollTop = sourceLinePosition * targetScrollHeight;

    return Math.max(0, Math.min(targetScrollTop, targetScrollHeight));
  }

  private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {

    const typeColors = {
      info: 'var(--vscode-charts-blue)',
      success: 'var(--vscode-charts-green)',
      warning: 'var(--vscode-charts-orange)',
      error: 'var(--vscode-charts-red)'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: var(--vscode-notification-background);
      color: var(--vscode-notification-foreground);
      border-left: 4px solid ${typeColors[type]};
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: var(--vscode-font-family);
      font-size: 13px;
      max-width: 300px;
      word-wrap: break-word;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);


    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });


    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  private createDiffView(): string {
    if (!this.template || !this.renderedSQL) return '';

    const originalLines = this.template.split('\n');
    const renderedLines = this.renderedSQL.split('\n');
    const maxLines = Math.max(originalLines.length, renderedLines.length);

    let diffHTML = '';

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const renderedLine = renderedLines[i] || '';

      let lineClass = 'unchanged';
      if (originalLine !== renderedLine) {
        lineClass = originalLine ? 'modified' : 'added';
      }

      diffHTML += `
        <div class="diff-line ${lineClass}">
          <div class="diff-line-number">${i + 1}</div>
          <div class="diff-content">${this.highlightSQL(renderedLine)}</div>
        </div>
      `;
    }

    return diffHTML;
  }

  private renderContent() {
    if (this.isRendering) {
      return html`
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <div>正在渲染模板...</div>
        </div>
      `;
    }

    if (this.renderError) {
      return html`
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <div class="error-content">
            <div class="error-title">渲染错误</div>
            <div class="error-message">${this.renderError}</div>
          </div>
        </div>
      `;
    }

    if (!this.template) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <div class="empty-title">没有模板内容</div>
          <div class="empty-description">
            请提供一个Jinja2模板以查看渲染结果。
          </div>
        </div>
      `;
    }

    switch (this.viewMode) {
      case 'split':
        return html`
          <div class="split-view">
            <div class="split-pane">
              <div class="pane-header">
                <span>原始模板</span>
                <span>${this.template.length} 字符</span>
              </div>
              <div class="pane-content">
                <div class="code-editor ${classMap({ 'word-wrap': this.wordWrap })}">
                  ${this.showLineNumbers ? html`
                    <div class="line-numbers">
                      ${this.template.split('\n').map((_, i) => html`
                        <div class="line-number">${i + 1}</div>
                      `)}
                    </div>
                  ` : ''}
                  <div class="code-content ${classMap({ 'with-line-numbers': this.showLineNumbers })}">
                    ${unsafeHTML(this.highlightedOriginal)}
                  </div>
                </div>
              </div>
            </div>
            <div class="split-pane">
              <div class="pane-header">
                <span>渲染结果</span>
                <span>${this.renderedSQL.length} 字符</span>
              </div>
              <div class="pane-content">
                <div class="code-editor ${classMap({ 'word-wrap': this.wordWrap })}">
                  ${this.showLineNumbers ? html`
                    <div class="line-numbers">
                      ${this.renderedSQL.split('\n').map((_, i) => html`
                        <div class="line-number">${i + 1}</div>
                      `)}
                    </div>
                  ` : ''}
                  <div class="code-content ${classMap({ 'with-line-numbers': this.showLineNumbers })}">
                    ${unsafeHTML(this.highlightedRendered)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

      case 'rendered':
        return html`
          <div class="code-editor ${classMap({ 'word-wrap': this.wordWrap })}">
            ${this.showLineNumbers ? html`
              <div class="line-numbers">
                ${this.renderedSQL.split('\n').map((_, i) => html`
                  <div class="line-number">${i + 1}</div>
                `)}
              </div>
            ` : ''}
            <div class="code-content ${classMap({ 'with-line-numbers': this.showLineNumbers })}">
              ${unsafeHTML(this.highlightedRendered)}
            </div>
          </div>
        `;

      case 'diff':
        return html`
          <div class="diff-view ${classMap({ 'word-wrap': this.wordWrap })}">
            ${unsafeHTML(this.createDiffView())}
          </div>
        `;

      default:
        return '';
    }
  }

  override render() {
    return html`
      <div class="preview-content">
        <!-- Toolbar -->
        <div class="preview-toolbar">
          <div class="toolbar-section">
            <div class="toolbar-title">
              <span>👁️</span>
              SQL 预览
            </div>
            <div class="view-mode-toggle">
              <button
                class="view-mode-button ${classMap({ active: this.viewMode === 'split' })}"
                @click=${() => this.handleViewModeChange('split')}
                title="分屏视图"
              >
                <span>⚏</span>
                <span>分屏</span>
              </button>
              <button
                class="view-mode-button ${classMap({ active: this.viewMode === 'rendered' })}"
                @click=${() => this.handleViewModeChange('rendered')}
                title="渲染结果"
              >
                <span>📄</span>
                <span>结果</span>
              </button>
              <button
                class="view-mode-button ${classMap({ active: this.viewMode === 'diff' })}"
                @click=${() => this.handleViewModeChange('diff')}
                title="差异对比"
              >
                <span>⚖</span>
                <span>差异</span>
              </button>
            </div>
          </div>

          <div class="toolbar-actions">
            <button
              class="toolbar-button"
              @click=${this.handleToggleLineNumbers}
              title="切换行号"
            >
              <span>#</span>
              <span>行号</span>
            </button>
            <button
              class="toolbar-button"
              @click=${this.handleToggleWordWrap}
              title="切换自动换行"
            >
              <span>↩</span>
              <span>换行</span>
            </button>
            <button
              class="toolbar-button"
              @click=${this.handleCopyTemplate}
              ?disabled=${!this.template}
              title="复制模板"
            >
              <span>📄</span>
              <span>模板</span>
            </button>
            <button
              class="toolbar-button"
              @click=${this.handleCopyResult}
              ?disabled=${!this.renderedSQL}
              title="复制结果"
            >
              <span>📋</span>
              <span>结果</span>
            </button>
          </div>
        </div>

        <!-- Content -->
        ${this.renderContent()}

        <!-- Status Bar -->
        <div class="status-bar">
          <div class="status-info">
            <div class="status-item">
              <span class="status-indicator ${classMap({
                success: !this.renderError,
                error: !!this.renderError,
                processing: this.isRendering
              })}"></span>
              <span>${this.renderError ? '错误' : '就绪'}</span>
            </div>
            ${this.renderMetrics ? html`
              <div class="metrics-display">
                <div class="metric-item">
                  <span>渲染时间:</span>
                  <span class="metric-value">${Math.round(this.renderMetrics.renderTime)}ms</span>
                </div>
                <div class="metric-item">
                  <span>变量:</span>
                  <span class="metric-value">${this.renderMetrics.variableCount}</span>
                </div>
                <div class="metric-item">
                  <span>长度:</span>
                  <span class="metric-value">${this.renderMetrics.templateLength}</span>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sql-preview-v2': SqlPreviewV2;
  }
}

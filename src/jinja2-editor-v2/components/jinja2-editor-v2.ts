/**
 * Jinja2 Editor V2 - Main Editor Component
 *
 * Enhanced template editor with direct variable interaction
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type {
  EnhancedVariable,
  EditorV2State,
  EditorV2Config,
  VariableChangeEventV2,
  KeyboardNavigationEvent,
  TemplateRenderEventV2,
  Jinja2VariableValue,
  Jinja2VariableType
} from '../types.js';
import { parseTemplate, findVariableAtPosition, sortVariablesForNavigation } from '../utils/template-parser.js';
import { TemplateHighlighter } from './template-highlighter.js';
import { VariablePopover } from './variable-popover.js';
import { SqlPreviewV2 } from './sql-preview-v2.js';

@customElement('jinja2-editor-v2')
export class Jinja2EditorV2 extends LitElement {
  @property({ type: String }) accessor template: string = '';
  @property({ type: Array }) accessor variables: EnhancedVariable[] = [];
  @property({ attribute: false }) accessor config: EditorV2Config = {
    enabled: true,
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

  @state() accessor editorState: EditorV2State = {
    template: '',
    variables: [],
    values: {},
    selectedVariable: null,
    popover: {
      variable: null,
      position: { x: 0, y: 0, placement: 'bottom', availableSpace: { top: 0, bottom: 0, left: 0, right: 0 } },
      isVisible: false,
      editingValue: undefined,
      editingType: 'string' as Jinja2VariableType
    },
    renderedResult: '',
    isProcessing: false,
    lastRenderTime: 0
  };

  @state() accessor isWideLayout = false;
  @state() accessor navigationIndex = -1;
  @state() private resizeObserver: ResizeObserver | null = null;

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
      --transition-slow: 0.3s ease;
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
      flex-direction: column;
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

    /* Keyboard Navigation Help */
    .keyboard-help {
      position: fixed;
      bottom: var(--spacing-lg);
      right: var(--spacing-lg);
      background: var(--vscode-editorHoverWidget-background);
      border: var(--border-width) solid var(--vscode-editorHoverWidget-border);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      box-shadow: var(--shadow-lg);
      font-size: var(--font-size-xs);
      max-width: 300px;
      z-index: 1000;
      opacity: 0;
      transform: translateY(10px);
      transition: all var(--transition-normal);
      pointer-events: none;
    }

    .keyboard-help.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .keyboard-help-title {
      font-weight: var(--font-weight-semibold);
      margin-bottom: var(--spacing-sm);
      color: var(--vscode-foreground);
    }

    .keyboard-shortcut {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-xs);
      color: var(--vscode-descriptionForeground);
    }

    .shortcut-key {
      background: var(--vscode-keybindingLabel-background);
      color: var(--vscode-keybindingLabel-foreground);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 10px;
      border: var(--border-width) solid var(--vscode-keybindingLabel-border);
    }

    /* Loading Overlay */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      border-radius: var(--border-radius-lg);
      backdrop-filter: blur(4px);
    }

    .loading-content {
      background: var(--vscode-editor-background);
      padding: var(--spacing-xl);
      border-radius: var(--border-radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-md);
      box-shadow: var(--shadow-lg);
      border: var(--border-width) solid var(--vscode-widget-border);
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

      .keyboard-help {
        bottom: var(--spacing-md);
        right: var(--spacing-md);
        left: var(--spacing-md);
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
      --vscode-sideBar-background: #f3f3f3;
      --vscode-titleBar-background: #ffffff;
      --vscode-titleBar-activeForeground: #000000;
    }

    :host([theme="dark"]) {
      --vscode-editor-background: #1e1e1e;
      --vscode-foreground: #d4d4d4;
      --vscode-widget-border: #333333;
      --vscode-textBlockQuote-background: #2d2d2d;
      --vscode-textBlockQuote-border: #3e3e42;
      --vscode-sideBar-background: #252526;
      --vscode-titleBar-background: #1e1e1e;
      --vscode-titleBar-activeForeground: #d4d4d4;
    }
  `;

  override willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('template')) {
      this.handleTemplateChange();
    }
    if (changedProperties.has('variables')) {
      this.handleVariablesChange();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setupResizeObserver();
    this.setupKeyboardListeners();
    this.initializeEditor();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeResizeObserver();
    this.removeKeyboardListeners();
  }

  private setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const newIsWide = width >= 1024;
        if (newIsWide !== this.isWideLayout) {
          this.isWideLayout = newIsWide;
          this.requestUpdate();
        }
      }
    });

    this.resizeObserver.observe(this);
  }

  private removeResizeObserver() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  private setupKeyboardListeners() {
    if (!this.config.keyboardNavigation) return;

    document.addEventListener('keydown', this.handleGlobalKeyDown);
  }

  private removeKeyboardListeners() {
    document.removeEventListener('keydown', this.handleGlobalKeyDown);
  }

  private handleGlobalKeyDown = (event: KeyboardEvent) => {
    // Handle global keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case '?':
          event.preventDefault();
          this.toggleKeyboardHelp();
          break;
      }
    }

    // Handle navigation when popover is not visible
    if (!this.editorState.popover.isVisible && this.config.keyboardNavigation) {
      switch (event.key) {
        case 'Tab':
          event.preventDefault();
          this.navigateVariable(event.shiftKey ? 'previous' : 'next');
          break;
        case 'Enter':
          event.preventDefault();
          this.editSelectedVariable();
          break;
        case 'Escape':
          event.preventDefault();
          this.clearSelection();
          break;
      }
    }
  };

  private initializeEditor() {
    this.handleTemplateChange();
    this.handleVariablesChange();
  }

  private handleTemplateChange() {
    if (this.template !== this.editorState.template) {
      this.editorState.template = this.template;

      if (this.template) {
        const parsed = parseTemplate(this.template);
        this.editorState.variables = parsed.variables;
        this.variables = parsed.variables;
      } else {
        this.editorState.variables = [];
        this.variables = [];
      }

      if (this.config.autoPreview) {
        this.renderTemplate();
      }
    }
  }

  private handleVariablesChange() {
    // Sync external variables with internal state
    if (this.variables !== this.editorState.variables) {
      this.editorState.variables = this.variables;
    }
  }

  private handleVariableClick(event: CustomEvent) {
    const { variable } = event.detail;
    this.selectVariable(variable);
  }

  private handleVariableHover(event: CustomEvent) {
    // Could be used for showing tooltips or other hover effects
  }

  private handleVariableChange(event: CustomEvent) {
    const changeEvent = event.detail as VariableChangeEventV2;

    this.editorState.values[changeEvent.variable.name] = changeEvent.newValue;

    // Update variable type if changed
    if (changeEvent.newType !== changeEvent.oldType) {
      const varIndex = this.editorState.variables.findIndex(v => v.name === changeEvent.variable.name);
      if (varIndex >= 0) {
        this.editorState.variables[varIndex] = {
          ...this.editorState.variables[varIndex],
          type: changeEvent.newType as Jinja2VariableType
        };
      }
    }

    if (this.config.autoPreview) {
      this.renderTemplate();
    }

    this.dispatchEvent(new CustomEvent('variable-change', {
      detail: changeEvent,
      bubbles: true,
      composed: true
    }));
  }

  private handleTemplateRender(event: CustomEvent) {
    const renderEvent = event.detail as TemplateRenderEventV2;
    this.editorState.renderedResult = renderEvent.result;
    this.editorState.isProcessing = false;
    this.editorState.lastRenderTime = renderEvent.metrics.renderTime;

    this.dispatchEvent(new CustomEvent('template-render', {
      detail: renderEvent,
      bubbles: true,
      composed: true
    }));
  }

  private selectVariable(variable: EnhancedVariable) {
    this.editorState.selectedVariable = variable.name;
    this.navigationIndex = this.editorState.variables.findIndex(v => v.name === variable.name);

    // Show popover for the variable
    this.showVariablePopover(variable);
  }

  private showVariablePopover(variable: EnhancedVariable) {
    const highlighter = this.shadowRoot?.querySelector('template-highlighter') as TemplateHighlighter;
    const container = this.shadowRoot?.querySelector('.editor-panel') as HTMLElement;

    if (!highlighter || !container) return;

    // Find the highlighted element for this variable
    const variableElement = highlighter.shadowRoot?.querySelector(
      `[data-variable="${variable.name}"]`
    ) as HTMLElement;

    if (!variableElement) return;

    const popover = this.shadowRoot?.querySelector('variable-popover') as VariablePopover;
    if (!popover) return;

    // Setup popover properties
    popover.variable = variable;
    popover.currentValue = this.editorState.values[variable.name];
    popover.targetElement = variableElement;
    popover.containerElement = container;
    popover.config = this.config;
    popover.theme = this.theme;

    // Show popover
    popover.show(variable, this.editorState.values[variable.name] ?? variable.defaultValue);

    // Update editor state
    this.editorState.popover = {
      variable,
      position: { x: 0, y: 0, placement: 'bottom', availableSpace: { top: 0, bottom: 0, left: 0, right: 0 } },
      isVisible: true,
      editingValue: this.editorState.values[variable.name],
      editingType: variable.type
    };
  }

  private hideVariablePopover() {
    const popover = this.shadowRoot?.querySelector('variable-popover') as VariablePopover;
    if (popover) {
      popover.hide();
    }

    this.editorState.popover.isVisible = false;
    this.editorState.selectedVariable = null;
  }

  private navigateVariable(direction: 'next' | 'previous' | 'first' | 'last') {
    const sortedVars = sortVariablesForNavigation(this.editorState.variables);

    if (sortedVars.length === 0) return;

    let newIndex: number;

    switch (direction) {
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = sortedVars.length - 1;
        break;
      case 'next':
        newIndex = this.navigationIndex + 1;
        if (newIndex >= sortedVars.length) newIndex = 0;
        break;
      case 'previous':
        newIndex = this.navigationIndex - 1;
        if (newIndex < 0) newIndex = sortedVars.length - 1;
        break;
    }

    this.navigationIndex = newIndex;
    this.selectVariable(sortedVars[newIndex]);
  }

  private editSelectedVariable() {
    if (this.navigationIndex >= 0 && this.navigationIndex < this.editorState.variables.length) {
      const variable = this.editorState.variables[this.navigationIndex];
      this.showVariablePopover(variable);
    }
  }

  private clearSelection() {
    this.hideVariablePopover();
    this.navigationIndex = -1;
  }

  private async renderTemplate() {
    if (!this.template) {
      this.editorState.renderedResult = '';
      return;
    }

    this.editorState.isProcessing = true;
    const startTime = performance.now();

    try {
      // Simulate rendering process (replace with actual Nunjucks rendering)
      await new Promise(resolve => setTimeout(resolve, 100));

      let result = this.template;
      Object.entries(this.editorState.values).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
        result = result.replace(regex, this.formatValue(value));
      });

      const renderTime = performance.now() - startTime;
      const usedVariables = Object.keys(this.editorState.values).filter(key =>
        this.template.includes(`{{ ${key} }}`) || this.template.includes(`{{${key}}}`)
      );
      const missingVariables = this.editorState.variables
        .filter(v => !this.editorState.values[v.name])
        .map(v => v.name);

      const renderEvent: TemplateRenderEventV2 = {
        template: this.template,
        values: this.editorState.values,
        result,
        error: undefined,
        usedVariables,
        missingVariables,
        metrics: {
          renderTime,
          variableCount: this.editorState.variables.length,
          templateLength: this.template.length
        }
      };

      this.handleTemplateRender(new CustomEvent('template-render', {
        detail: renderEvent
      }));

    } catch (error) {
      this.editorState.isProcessing = false;
      this.editorState.renderedResult = '';

      const renderEvent: TemplateRenderEventV2 = {
        template: this.template,
        values: this.editorState.values,
        result: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        usedVariables: [],
        missingVariables: [],
        metrics: {
          renderTime: performance.now() - startTime,
          variableCount: this.editorState.variables.length,
          templateLength: this.template.length
        }
      };

      this.handleTemplateRender(new CustomEvent('template-render', {
        detail: renderEvent
      }));
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

  private handleCopyTemplate() {
    navigator.clipboard.writeText(this.template).then(() => {
      this.showNotification('模板已复制到剪贴板');
    });
  }

  private handleCopyResult() {
    navigator.clipboard.writeText(this.editorState.renderedResult).then(() => {
      this.showNotification('SQL已复制到剪贴板');
    });
  }

  private handleSubmit() {
    this.dispatchEvent(new CustomEvent('template-submit', {
      detail: {
        template: this.template,
        values: this.editorState.values,
        result: this.editorState.renderedResult
      },
      bubbles: true,
      composed: true
    }));
  }

  private showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    // Simple notification implementation
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

  private toggleKeyboardHelp() {
    const helpElement = this.shadowRoot?.querySelector('.keyboard-help') as HTMLElement;
    if (helpElement) {
      helpElement.classList.toggle('visible');
    }
  }

  private getLayoutClass() {
    return this.isWideLayout ? 'wide-layout' : 'narrow-layout';
  }

  private getVariableStats() {
    const total = this.editorState.variables.length;
    const configured = Object.keys(this.editorState.values).filter(key =>
      this.editorState.values[key] !== undefined && this.editorState.values[key] !== null
    ).length;
    const required = this.editorState.variables.filter(v => v.isRequired).length;
    const requiredConfigured = this.editorState.variables.filter(v =>
      v.isRequired && this.editorState.values[v.name] !== undefined && this.editorState.values[v.name] !== null
    ).length;

    return { total, configured, required, requiredConfigured };
  }

  override render() {
    const stats = this.getVariableStats();
    const layoutClass = this.getLayoutClass();

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
            ${this.config.keyboardNavigation ? html`
              <button class="header-button" @click=${this.toggleKeyboardHelp} title="Keyboard shortcuts">
                ⌨️ Shortcuts
              </button>
            ` : ''}
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
          <!-- Editor Panel -->
          <section class="editor-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>📝</span>
                Template Editor
                <span class="panel-subtitle">${stats.configured}/${stats.total} configured</span>
              </div>
            </div>
            <div class="panel-content">
              <template-highlighter
                .template=${this.template}
                .config=${this.config}
                .variables=${this.editorState.variables}
                .selectedVariable=${this.editorState.selectedVariable}
                .theme=${this.theme}
                @variable-click=${this.handleVariableClick}
                @variable-hover=${this.handleVariableHover}
              ></template-highlighter>
            </div>
          </section>

          <!-- Preview Panel -->
          <section class="preview-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>👁️</span>
                SQL Preview
                ${this.editorState.lastRenderTime > 0 ? html`
                  <span class="panel-subtitle">${Math.round(this.editorState.lastRenderTime)}ms</span>
                ` : ''}
              </div>
            </div>
            <div class="panel-content">
              <sql-preview-v2
                .template=${this.template}
                .values=${this.editorState.values}
                .variables=${this.editorState.variables}
                .theme=${this.theme}
                .showOriginal=${this.showOriginal}
                .autoRender=${this.config.autoPreview}
                @template-render=${this.handleTemplateRender}
              ></sql-preview-v2>
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

        <!-- Variable Popover -->
        <variable-popover
          .config=${this.config}
          .theme=${this.theme}
          @variable-change=${this.handleVariableChange}
          @popover-hide=${() => this.hideVariablePopover()}
        ></variable-popover>

        <!-- Keyboard Help -->
        ${this.config.keyboardNavigation ? html`
          <div class="keyboard-help">
            <div class="keyboard-help-title">⌨️ Keyboard Shortcuts</div>
            <div class="keyboard-shortcut">
              <span>Navigate variables</span>
              <span class="shortcut-key">Tab</span>
            </div>
            <div class="keyboard-shortcut">
              <span>Edit selected</span>
              <span class="shortcut-key">Enter</span>
            </div>
            <div class="keyboard-shortcut">
              <span>Clear selection</span>
              <span class="shortcut-key">Esc</span>
            </div>
            <div class="keyboard-shortcut">
              <span>Show shortcuts</span>
              <span class="shortcut-key">Ctrl/?</span>
            </div>
          </div>
        ` : ''}

        <!-- Loading Overlay -->
        ${this.editorState.isProcessing ? html`
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

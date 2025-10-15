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
  @state() accessor activeVariable: string | null = null;
  @state() accessor popupPosition: { x: number; y: number } = { x: 0, y: 0 };
  @state() accessor popupValue: string = '';
  @state() accessor variableValues: Record<string, Jinja2VariableValue> = {};

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

    /* Variable value display next to variable */
    .variable-value-display {
      margin-left: 8px;
      padding: 2px 6px;
      background-color: var(--vscode-textBlockQuote-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
    }

    .variable-value-display.string {
      color: #ce9178;
    }

    .variable-value-display.number {
      color: #b5cea8;
    }

    .variable-value-display.boolean {
      color: #569cd6;
      font-weight: var(--font-weight-semibold);
    }

    .variable-value-display.null {
      color: #d4d4d4;
      font-style: italic;
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
      if (this.variableValues[variable.name] !== undefined) {
        newValues[variable.name] = this.variableValues[variable.name];
      } else if (this.values[variable.name] !== undefined) {
        newValues[variable.name] = this.values[variable.name];
      } else {
        newValues[variable.name] = variable.defaultValue ?? this.generateDefaultValue(variable.type);
      }
    });

    this.variableValues = newValues;
    this.values = newValues; // Keep compatibility
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

    let highlighted = this.escapeHtml(this.template);

    // Highlight all variable references in the template - Match {{ variable }} patterns (including complex expressions)
    highlighted = highlighted.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, varExpression) => {
      // Extract the primary variable name from expressions like:
      // - variable
      // - variable.property
      // - variable | filter
      // - object.property
      const varName = varExpression.trim().split('.')[0].split('|')[0].trim();

      if (this.variableValues.hasOwnProperty(varName)) {
        const isSelected = this.selectedVariable === varName;
        const classes = [
          'variable-highlight',
          isSelected ? 'selected' : ''
        ].filter(Boolean).join(' ');

        // Add value display next to variable
        const value = this.variableValues[varName];
        const valueDisplay = this.renderValueDisplay(value);

        return `<span class="${classes}" data-variable="${varName}">${match}</span>${valueDisplay}`;
      }
      return match;
    });

    // Highlight variables in control structures like {% if variable %}
    highlighted = highlighted.replace(/\{%\s*if\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    // Highlight variables in {% elif condition %}
    highlighted = highlighted.replace(/\{%\s*elif\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    // Highlight variables in {% for item in items %}
    highlighted = highlighted.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}/g, (match, itemVar, arrayVar) => {
      let highlightedMatch = match;

      // Highlight the array variable
      if (this.variableValues.hasOwnProperty(arrayVar)) {
        const regex = new RegExp(`\\b${this.escapeRegex(arrayVar)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${arrayVar}">${arrayVar}</span>`);
      }

      return highlightedMatch;
    });

    this.highlightedTemplate = highlighted;
  }

  private highlightVariablesInCondition(match: string, condition: string): string {
    let highlightedMatch = match;

    // Extract variable names from complex conditions
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
      .filter(varName => this.variableValues.hasOwnProperty(varName));

    // Highlight each variable
    varNames.forEach(varName => {
      const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
      highlightedMatch = highlightedMatch.replace(regex,
        `<span class="variable-highlight" data-variable="${varName}">${varName}</span>`);
    });

    return highlightedMatch;
  }

  private escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private renderValueDisplay(value: Jinja2VariableValue): string {
    if (value == null) {
      return `<span class="variable-value-display null">NULL</span>`;
    }

    let displayValue: string;
    let className: string;

    if (typeof value === 'boolean') {
      displayValue = value ? 'true' : 'false';
      className = 'boolean';
    } else if (typeof value === 'number') {
      displayValue = String(value);
      className = 'number';
    } else if (typeof value === 'string') {
      displayValue = `'${value}'`;
      className = 'string';
    } else if (typeof value === 'object') {
      displayValue = JSON.stringify(value);
      className = 'string';
    } else {
      displayValue = String(value);
      className = 'string';
    }

    return `<span class="variable-value-display ${className}">${displayValue}</span>`;
  }

  private handleTemplateClick(event: Event) {
    const target = event.target as HTMLElement;
    const variableElement = target.closest('.variable-highlight') as HTMLElement;

    if (variableElement) {
      const variableName = variableElement.getAttribute('data-variable');
      if (variableName) {
        this.showVariablePopup(variableName, event);
      }
    }
  }

  private showVariablePopup(variableName: string, event: Event) {
    // Calculate popup position
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.popupPosition = {
      x: rect.left + scrollX,
      y: rect.bottom + scrollY + 5
    };

    // Set the active variable and its current value
    this.activeVariable = variableName;
    const variableType = this.getVariableType(variableName);
    this.popupValue = this.formatValueForEdit(this.variableValues[variableName], variableType);

    // Prevent event bubbling
    event.stopPropagation();
  }

  private getVariableType(variableName: string): string {
    const variable = this.variables.find(v => v.name === variableName);
    return variable?.type || 'string';
  }

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
        if (typeof value === 'string') {
          return value.startsWith('T') ? value.substring(1) : value;
        }
        return String(value);
      case 'datetime':
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

  private handlePopupValueChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.popupValue = target.value;
  }

  private handlePopupCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.popupValue = target.checked.toString();
  }

  private handleSaveVariable() {
    if (!this.activeVariable) return;

    const variableType = this.getVariableType(this.activeVariable);
    const newValue = this.parseValueFromEdit(this.popupValue, variableType);

    // Update the variable values
    this.variableValues = {
      ...this.variableValues,
      [this.activeVariable]: newValue
    };

    // Update the main values object for compatibility
    this.values = this.variableValues;

    // Re-render the template with new values
    this.renderTemplate();
    this.highlightTemplate();

    // Close popup
    this.activeVariable = null;
    this.popupValue = '';
  }

  private handleCancelPopup() {
    this.activeVariable = null;
    this.popupValue = '';
  }

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
        return value;
      case 'email':
      case 'url':
        return value;
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
    }
  }

  private handleDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    // Check if click is inside popup or on a variable
    const isClickInsidePopup = target.closest('.variable-popup') !== null;
    const isClickOnVariable = target.classList.contains('variable-highlight');

    if (!isClickInsidePopup && !isClickOnVariable) {
      this.activeVariable = null;
      this.popupValue = '';
    }
  }

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

  private handleVariableChange(variableName: string, value: Jinja2VariableValue) {
    this.values = {
      ...this.values,
      [variableName]: value
    };

    if (this.config?.autoPreview) {
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

      // Use the new variable values system
      let result = this.template;
      Object.entries(this.variableValues).forEach(([key, value]) => {
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
    return html`
      <div class="editor-container" @click=${this.handleDocumentClick}>
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
        <main class="layout-container">
          <!-- Template Panel (Full Width) -->
          <section class="editor-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>📝</span> Template Editor
                <span class="panel-subtitle">${this.variables.length} variables found</span>
              </div>
            </div>
            <div class="panel-content">
              <!-- Template Display -->
              ${this.template ? html`
                <div class="template-display" .innerHTML=${this.highlightedTemplate} @click=${this.handleTemplateClick}></div>
              ` : html`
                <div class="empty-state">
                  <div class="empty-icon">📝</div>
                  <div class="empty-title">No template to edit</div>
                  <div class="empty-description">
                    Add a Jinja2 template with variables like {{ variable_name }} to start editing.
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
                    Click on variables in the template above to configure them and see the rendered SQL here.
                  </div>
                </div>
              `}
            </div>
          </section>
        </main>

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
                const variableType = this.getVariableType(this.activeVariable);
                const currentValue = this.variableValues[this.activeVariable];

                return html`
                  <div class="variable-info-row">
                    <span class="variable-info-label">类型:</span>
                    <span class="variable-info-value">${variableType}</span>
                  </div>
                  <div class="variable-info-row">
                    <span class="variable-info-label">当前值:</span>
                    <span class="variable-info-value">${this.formatValueForEdit(currentValue)}</span>
                  </div>
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

declare global {
  interface HTMLElementTagNameMap {
    'jinja2-editor-v2': Jinja2EditorV2;
  }
}

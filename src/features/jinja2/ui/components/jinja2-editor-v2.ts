/**
 * Jinja2 Editor V2 - Modern visual template editor
 * Features: template highlighting, variable interaction, left-right split layout
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import TemplateHighlighter from '../utils/template-highlighter.js';
import SqlHighlighter from '../utils/sql-highlighter.js';
import type { Jinja2Variable, Jinja2VariableValue, EnhancedVariable, Jinja2VariableType } from '../types.js';
import type { CompleteEditorV2Config } from '../types/config.js';
import nunjucks from 'nunjucks';

@customElement('jinja2-editor-v2')
export class Jinja2EditorV2 extends LitElement {
  @property({ type: String }) accessor template: string = '';
  @property({ type: Array }) accessor variables: Jinja2Variable[] = [];
  @property({ attribute: false }) accessor config: CompleteEditorV2Config = {
    enabled: false,
    popoverPlacement: 'auto',
    highlightStyle: 'background',
    autoPreview: true,
    keyboardNavigation: true,
    animationsEnabled: true,
    showSuggestions: true,
    autoFocusFirst: false,
    logLevel: 'error'
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
  @state() accessor activeVariableType: string = '';
  @state() accessor showTypeSelector: boolean = false;
  @state() accessor syncScroll: boolean = false;


  private variableChangeLogs: Array<{
    timestamp: string;
    variableName: string;
    oldValue: Jinja2VariableValue;
    newValue: Jinja2VariableValue;
    context: Record<string, Jinja2VariableValue>;
    template: string;
    renderedResult?: string;
    rightPanelHTML?: string;
    step: 'variable_change' | 'template_render' | 'html_change';
    phase: 'before_render' | 'after_render' | 'html_update';
    details?: string;
  }> = [];

  private templateHighlighter: TemplateHighlighter;
  private sqlHighlighter: SqlHighlighter;
  private nunjucksEnv: nunjucks.Environment;
  private templateEditor: HTMLElement | null = null;
  private sqlPreview: HTMLElement | null = null;
  private isScrollingSync: boolean = false;
  private lastScrollTime: number = 0;
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
      align-items: stretch;
    }

    /* Narrow Layout (stacked) */
    .narrow-layout {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-md);
      height: 100%;
      gap: var(--spacing-md);
    }

    /* Panel Styles - Enhanced for consistency */
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
      /* Ensure consistent sizing */
      flex: 1;
      min-width: 0;
      /* Add subtle gradient overlay */
      position: relative;
    }

    .editor-panel::before,
    .preview-panel::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg,
        var(--vscode-focusBorder) 0%,
        var(--vscode-charts-blue) 25%,
        var(--vscode-charts-purple) 75%,
        var(--vscode-focusBorder) 100%);
      opacity: 0.6;
      border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
      z-index: 1;
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

    /* Type Selector Styles */
    .type-selector {
      width: 100%;
      padding: 6px 8px;
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-size: var(--font-size-sm);
      font-family: var(--vscode-font-family);
      outline: none;
      margin-bottom: var(--spacing-sm);
    }

    .type-selector:focus {
      border-color: var(--vscode-focusBorder);
      outline: var(--border-width) solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .type-change-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: var(--border-width) solid var(--vscode-widget-border);
      padding: 4px 8px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
      font-weight: var(--font-weight-medium);
      margin-left: var(--spacing-sm);
    }

    .type-change-button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
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

    /* Highlight.js syntax highlighting - Dynamic theme support */
    .highlighted-template .hljs-keyword,
    .sql-preview .hljs-keyword {
      color: var(--hljs-keyword, #569cd6) !important;
      font-weight: bold;
    }

    .highlighted-template .hljs-operator,
    .sql-preview .hljs-operator {
      color: var(--hljs-operator, #d4d4d4) !important;
    }

    .highlighted-template .hljs-string,
    .sql-preview .hljs-string {
      color: var(--hljs-string, #ce9178) !important;
    }

    .highlighted-template .hljs-number,
    .sql-preview .hljs-number {
      color: var(--hljs-number, #b5cea8) !important;
    }

    .highlighted-template .hljs-comment,
    .sql-preview .hljs-comment {
      color: var(--hljs-comment, #6a9955) !important;
      font-style: italic;
    }

    .highlighted-template .hljs-function,
    .sql-preview .hljs-function {
      color: var(--hljs-function, #dcdcaa) !important;
    }

    /* Additional SQL syntax highlighting */
    .sql-preview .hljs-built_in,
    .highlighted-template .hljs-built_in {
      color: var(--hljs-built_in, #4ec9b0) !important;
    }

    .sql-preview .hljs-literal,
    .highlighted-template .hljs-literal {
      color: var(--hljs-literal, #c586c0) !important;
    }

    .sql-preview .hljs-type,
    .highlighted-template .hljs-type {
      color: var(--hljs-type, #9cdcfe) !important;
    }

    /* Enhanced SQL preview styling */
    .sql-preview {
      padding: var(--spacing-lg);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      line-height: var(--line-height-relaxed);
      white-space: pre-wrap;
      word-break: break-word;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: var(--border-radius-sm);
      min-height: 200px;
      position: relative;
    }

    .sql-preview pre {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .sql-preview code {
      font-family: inherit;
      font-size: inherit;
      background: transparent;
      color: inherit;
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
    if (changedProperties.has('theme')) {
      // Update template highlighter theme
      if (this.templateHighlighter) {
        this.templateHighlighter.updateConfig({ theme: this.theme });
        this.highlightTemplate();
      }
      // Update SQL highlighter theme
      if (this.sqlHighlighter) {
        this.sqlHighlighter.updateConfig({ theme: this.theme });
      }
      // Apply theme-specific custom colors
      this.applyThemeColors();
    }
  }

  override connectedCallback() {
    super.connectedCallback();

    // Initialize template highlighter
    this.templateHighlighter = new TemplateHighlighter({
      theme: this.theme,
      fontSize: 14,
      showLineNumbers: false,
      highlightStyle: 'background',
      highlightSQL: true
    });

    // Initialize SQL highlighter
    this.sqlHighlighter = new SqlHighlighter({
      theme: this.theme,
      fontSize: 14,
      showLineNumbers: false,
      wordWrap: true,
      highlightVariables: false // We'll handle variables differently in SQL preview
    });

    // 🚀 NEW: Initialize nunjucks environment for stable rendering
    this.nunjucksEnv = new nunjucks.Environment(null, {
      autoescape: false,
      throwOnUndefined: false
    });

    this.initializeValues();
    this.highlightTemplate();
    this.checkLayout();

    // Listen for resize events
    window.addEventListener('resize', this.handleResize);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.handleResize);
    // 清理联动滚动监听器
    this.cleanupScrollSync();
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

  private applyThemeColors() {
    const root = this.shadowRoot?.host as HTMLElement;
    if (!root) return;

    // Apply theme-specific custom properties for better visibility
    const themeColors = {
      'vscode-dark': {
        '--hljs-keyword': '#569cd6',
        '--hljs-string': '#ce9178',
        '--hljs-number': '#b5cea8',
        '--hljs-comment': '#6a9955',
        '--hljs-function': '#dcdcaa',
        '--hljs-operator': '#d4d4d4',
        '--hljs-literal': '#c586c0',
        '--hljs-type': '#9cdcfe',
        '--hljs-built_in': '#4ec9b0'
      },
      'github-dark': {
        '--hljs-keyword': '#ff7b72',
        '--hljs-string': '#a5d6ff',
        '--hljs-number': '#79c0ff',
        '--hljs-comment': '#8b949e',
        '--hljs-function': '#d2a8ff',
        '--hljs-operator': '#c9d1d9',
        '--hljs-literal': '#ff7b72',
        '--hljs-type': '#ffab70',
        '--hljs-built_in': '#ffa657'
      },
      'monokai': {
        '--hljs-keyword': '#f92672',
        '--hljs-string': '#e6db74',
        '--hljs-number': '#ae81ff',
        '--hljs-comment': '#75715e',
        '--hljs-function': '#66d9ef',
        '--hljs-operator': '#f8f8f2',
        '--hljs-literal': '#ae81ff',
        '--hljs-type': '#66d9ef',
        '--hljs-built_in': '#fd971f'
      },
      'dracula': {
        '--hljs-keyword': '#ff79c6',
        '--hljs-string': '#f1fa8c',
        '--hljs-number': '#bd93f9',
        '--hljs-comment': '#6272a4',
        '--hljs-function': '#50fa7b',
        '--hljs-operator': '#f8f8f2',
        '--hljs-literal': '#bd93f9',
        '--hljs-type': '#8be9fd',
        '--hljs-built_in': '#ffb86c'
      },
      'one-dark': {
        '--hljs-keyword': '#c678dd',
        '--hljs-string': '#98c379',
        '--hljs-number': '#d19a66',
        '--hljs-comment': '#5c6370',
        '--hljs-function': '#61afef',
        '--hljs-operator': '#abb2bf',
        '--hljs-literal': '#d19a66',
        '--hljs-type': '#e06c75',
        '--hljs-built_in': '#56b6c2'
      }
    };

    const colors = themeColors[this.theme as keyof typeof themeColors] || themeColors['vscode-dark'];

    // Apply custom properties to the host element
    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }

  private initializeValues() {
    const newValues: Record<string, Jinja2VariableValue> = {};

    this.variables.forEach(variable => {
      if (this.variableValues[variable.name] !== undefined) {
        newValues[variable.name] = this.variableValues[variable.name];
      } else if (this.values[variable.name] !== undefined) {
        newValues[variable.name] = this.values[variable.name];
      } else {
        // Use processor default values if available
        if (variable.defaultValue !== undefined && variable.defaultValue !== null) {
          newValues[variable.name] = variable.defaultValue;
        } else {
          // Generate fallback defaults if processor didn't provide a value
          newValues[variable.name] = this.generateDefaultValue(variable.type);
        }
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

    const defaultValue = defaults[type] || 'demo_value';

    // 记录生成的默认值，检查是否可能是占位符
    if (typeof defaultValue === 'string' && (/VAR_\d+/.test(defaultValue) || /\d+VAR\d+/.test(defaultValue))) {
      this.sendLogToOutputChannel('DEFAULT_PLACEHOLDER', `Generated suspicious default value for type ${type}: ${defaultValue}`);
    }

    // 默认值生成日志只保留可疑情况的记录
    return defaultValue;
  }

  private highlightTemplate() {
    if (!this.template) {
      this.highlightedTemplate = '';
      return;
    }

    try {
      // Convert Jinja2Variable[] to EnhancedVariable[] for the highlighter
      const enhancedVariables: EnhancedVariable[] = this.variables.map(v => ({
        name: v.name,
        type: v.type,
        isRequired: v.isRequired || false,
        defaultValue: v.defaultValue,
        description: v.description,
        position: {
          startIndex: 0,
          endIndex: 0,
          line: 0,
          column: 0,
          name: v.name,
          fullMatch: `{{ ${v.name} }}`
        }
      }));

      // Use the TemplateHighlighter for professional syntax highlighting
      const result = this.templateHighlighter.highlightTemplate(
        this.template,
        enhancedVariables,
        this.variableValues
      );

      let highlighted = result.html;

      // Apply control structure highlighting to ensure all variables are highlighted
      // This handles variables in {% if %}, {% for %}, {% set %} that TemplateHighlighter might miss
      highlighted = this.applyControlStructureHighlighting(highlighted);

      this.highlightedTemplate = highlighted;
    } catch (error) {
      console.error('Template highlighting failed:', error);
      // Fallback to basic highlighting if TemplateHighlighter fails
      let fallbackHighlighted = this.fallbackTemplateHighlight();
      // Still apply control structure highlighting to ensure variables are properly wrapped
      fallbackHighlighted = this.applyControlStructureHighlighting(fallbackHighlighted);
      this.highlightedTemplate = fallbackHighlighted;
    }
  }

  /**
   * Apply highlighting for control structure variables that might be missed by TemplateHighlighter
   */
  private applyControlStructureHighlighting(html: string): string {
    let highlighted = html;





    highlighted = highlighted.replace(/\{%\s*if\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/&lt;%\s*if\s+([^%]+)\s*%&gt;/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/<span class="hljs-operator">&lt;%<\/span>\s*if\s+([^%]+)\s*<span class="hljs-operator">%&gt;<\/span>/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/<span class="hljs-operator">%<\/span>\s*if\s+([^%]+)\s*<span class="hljs-operator">%<\/span>/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/\{%\s*elif\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    highlighted = highlighted.replace(/&lt;%\s*elif\s+([^%]+)\s*%&gt;/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    highlighted = highlighted.replace(/<span class="hljs-operator">&lt;%<\/span>\s*elif\s+([^%]+)\s*<span class="hljs-operator">%&gt;<\/span>/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });

    highlighted = highlighted.replace(/<span class="hljs-operator">%<\/span>\s*elif\s+([^%]+)\s*<span class="hljs-operator">%<\/span>/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}/g, (match, itemVar, arrayVar) => {
      let highlightedMatch = match;


      if (this.variableValues.hasOwnProperty(arrayVar)) {
        const regex = new RegExp(`\\b${this.escapeRegex(arrayVar)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${arrayVar}">${arrayVar}</span>`);
      }

      return highlightedMatch;
    });

    highlighted = highlighted.replace(/&lt;%\s*for\s+(\w+)\s+in\s+(\w+)\s*%&gt;/g, (match, itemVar, arrayVar) => {
      let highlightedMatch = match;

      if (this.variableValues.hasOwnProperty(arrayVar)) {
        const regex = new RegExp(`\\b${this.escapeRegex(arrayVar)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${arrayVar}">${arrayVar}</span>`);
      }

      return highlightedMatch;
    });


    highlighted = highlighted.replace(/\{%\s*set\s+(\w+)\s*=\s*[^%]*?\s*%\}/g, (match, varName) => {
      let highlightedMatch = match;

      if (this.variableValues.hasOwnProperty(varName)) {
        const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${varName}">${varName}</span>`);
      }

      return highlightedMatch;
    });

    highlighted = highlighted.replace(/&lt;%\s*set\s+(\w+)\s*=\s*[^%]*?\s*%&gt;/g, (match, varName) => {
      let highlightedMatch = match;

      if (this.variableValues.hasOwnProperty(varName)) {
        const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${varName}">${varName}</span>`);
      }

      return highlightedMatch;
    });



    this.variables.forEach(variable => {
      if (this.variableValues.hasOwnProperty(variable.name)) {


        const plainTextRegex = new RegExp(
          `(?<!data-variable="|class="[^"]*\\s)\\b(${this.escapeRegex(variable.name)})\\b(?![^<]*<\/span>|[^"]*")`,
          'g'
        );
        highlighted = highlighted.replace(plainTextRegex, (match, varName) => {

          if (highlighted.includes(`data-variable="${varName}"`) ||
              highlighted.includes(`>${varName}<`) ||
              match.includes('<span') ||
              match.includes('data-variable=')) {
            return match;
          }

          return `<span class="variable-highlight" data-variable="${varName}">${varName}</span>`;
        });
      }
    });

    return highlighted;
  }

  /**
   * Fallback template highlighting when TemplateHighlighter fails
   */
  private fallbackTemplateHighlight(): string {
    let highlighted = this.escapeHtml(this.template);


    highlighted = highlighted.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, varExpression) => {





      const varName = varExpression.trim().split('.')[0].split('|')[0].trim();

      if (this.variableValues.hasOwnProperty(varName)) {
        const isSelected = this.selectedVariable === varName;
        const classes = [
          'variable-highlight',
          isSelected ? 'selected' : ''
        ].filter(Boolean).join(' ');


        const value = this.variableValues[varName];
        const valueDisplay = this.renderValueDisplay(value);

        return `<span class="${classes}" data-variable="${varName}">${match}</span>${valueDisplay}`;
      }
      return match;
    });



    highlighted = highlighted.replace(/\{%\s*if\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/\{%\s*elif\s+([^%]+)\s*%\}/g, (match, condition) => {
      return this.highlightVariablesInCondition(match, condition);
    });


    highlighted = highlighted.replace(/\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}/g, (match, itemVar, arrayVar) => {
      let highlightedMatch = match;


      if (this.variableValues.hasOwnProperty(arrayVar)) {
        const regex = new RegExp(`\\b${this.escapeRegex(arrayVar)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${arrayVar}">${arrayVar}</span>`);
      }

      return highlightedMatch;
    });


    highlighted = highlighted.replace(/\{%\s*set\s+(\w+)\s*=\s*[^%]*?\s*%\}/g, (match, varName) => {
      let highlightedMatch = match;

      if (this.variableValues.hasOwnProperty(varName)) {
        const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${varName}">${varName}</span>`);
      }

      return highlightedMatch;
    });


    this.variables.forEach(variable => {
      if (this.variableValues.hasOwnProperty(variable.name)) {

        const controlVarRegex = new RegExp(`(\\{\\%[^%]*?)\\b(${this.escapeRegex(variable.name)})\\b([^%]*?\\%\\})`, 'g');
        highlighted = highlighted.replace(controlVarRegex, (match, prefix, varName, suffix) => {

          if (match.includes(`data-variable="${varName}"`)) {
            return match;
          }

          return `${prefix}<span class="variable-highlight" data-variable="${varName}">${varName}</span>${suffix}`;
        });
      }
    });

    return highlighted;
  }

  private highlightVariablesInCondition(match: string, condition: string): string {
    let highlightedMatch = match;



    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = condition.match(variableRegex) || [];


    const excludedWords = new Set([
      'and', 'or', 'not', 'in', 'like', 'between', 'is', 'null', 'true', 'false', 'exists',
      'eq', 'ne', 'lt', 'gt', 'le', 'ge',
      'defined', 'undefined', 'length', 'count', 'size', 'first', 'last'
    ]);

    const varNames = matches
      .map(match => match.trim())
      .filter(match => !excludedWords.has(match.toLowerCase()))
      .filter(varName => this.variableValues.hasOwnProperty(varName));


    varNames.forEach(varName => {
      const regex = new RegExp(`\\b${this.escapeRegex(varName)}\\b`, 'g');
      highlightedMatch = highlightedMatch.replace(regex,
        `<span class="variable-highlight" data-variable="${varName}">${varName}</span>`);
    });



    this.variables.forEach(variable => {
      if (!varNames.includes(variable.name) && condition.includes(variable.name)) {
        const regex = new RegExp(`\\b${this.escapeRegex(variable.name)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="variable-highlight" data-variable="${variable.name}">${variable.name}</span>`);
      }
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

  private highlightRenderedSQL(sql: string): string {
    if (!sql || !this.sqlHighlighter) {
      return sql;
    }

    try {


      const result = this.sqlHighlighter.highlightSQLSimple(sql);
      return result.html;
    } catch (error) {
      console.warn('SQL highlighting failed, using fallback:', error);

      return this.escapeHtml(sql);
    }
  }

  private handleTemplateClick(event: Event) {
    const target = event.target as HTMLElement;


    let variableElement: HTMLElement | null = null;


    variableElement = target.closest('.variable-highlight') as HTMLElement;


    if (!variableElement && target.classList.contains('variable-highlight')) {
      variableElement = target;
    }


    if (!variableElement) {
      let parent = target.parentElement;
      while (parent && parent !== document.body) {
        if (parent.classList.contains('variable-highlight')) {
          variableElement = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }


    if (!variableElement) {
      let element: HTMLElement | null = target;
      while (element && element !== document.body) {
        if (element.hasAttribute('data-variable')) {
          variableElement = element;
          break;
        }
        element = element.parentElement;
      }
    }

    if (variableElement) {
      const variableName = variableElement.getAttribute('data-variable');
      if (variableName) {
        this.showVariablePopup(variableName, event);
      }
    }
  }

  private showVariablePopup(variableName: string, event: Event) {

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.popupPosition = {
      x: rect.left + scrollX,
      y: rect.bottom + scrollY + 5
    };


    this.activeVariable = variableName;
    const variableType = this.getVariableType(variableName);
    this.activeVariableType = variableType;
    this.popupValue = this.formatValueForEdit(this.variableValues[variableName], variableType);
    this.showTypeSelector = false;


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

    this.autoSaveVariable();
  }

  private handlePopupCheckboxChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.popupValue = target.checked.toString();

    this.autoSaveVariable();
  }

  private autoSaveVariable() {
    if (!this.activeVariable) return;

    const variableName = this.activeVariable;
    const oldValue = this.variableValues[variableName];
    const newValue = this.parseValueFromEdit(this.popupValue, this.activeVariableType);


    this.recordVariableChange(variableName, oldValue, newValue, 'variable_change', 'before_render');


    this.variableValues = {
      ...this.variableValues,
      [variableName]: newValue
    };


    this.values = this.variableValues;


    this.updateVariableType(variableName, this.activeVariableType);


    this.recordVariableChange(variableName, oldValue, newValue, 'html_change', 'html_update',
      `HTML update triggered by ${variableName} change`);


    void this.renderTemplate();
    void this.highlightTemplate();


    this.recordVariableChange(variableName, oldValue, newValue, 'variable_change', 'after_render',
      `Variable ${variableName} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);
  }
  private handleCancelPopup() {
    this.activeVariable = null;
    this.popupValue = '';
    this.activeVariableType = '';
    this.showTypeSelector = false;
  }

  private handleTypeToggle() {
    this.showTypeSelector = !this.showTypeSelector;
  }

  private handleTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.activeVariableType = target.value;


    const currentValue = this.variableValues[this.activeVariable!];
    this.popupValue = this.formatValueForEdit(currentValue, this.activeVariableType);


    this.autoSaveVariable();
  }

  private updateVariableType(variableName: string, newType: string) {
    const variableIndex = this.variables.findIndex(v => v.name === variableName);
    if (variableIndex >= 0) {
      const updatedVariables = [...this.variables];

      const validType = this.validateVariableType(newType);
      if (validType) {
        updatedVariables[variableIndex] = {
          ...updatedVariables[variableIndex],
          type: validType
        };
        this.variables = updatedVariables;
      }
    }
  }

  /**
   * Validate and convert string to Jinja2VariableType
   */
  private validateVariableType(type: string): Jinja2VariableType | null {
    const validTypes: Jinja2VariableType[] = [
      'string', 'number', 'integer', 'boolean', 'date', 'time',
      'datetime', 'json', 'uuid', 'email', 'url', 'null'
    ];
    return validTypes.includes(type as Jinja2VariableType)
      ? type as Jinja2VariableType
      : null;
  }

  private parseValueFromEdit(value: string, variableType?: string): Jinja2VariableValue {
    const type = variableType || this.getVariableType(this.activeVariable!);


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
      case 'time':
        return html`
          <input
            class="variable-value-input"
            type="time"
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
      case 'json':
        return html`
          <textarea
            class="variable-value-input"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
            placeholder="输入JSON数据..."
            rows="3"
            style="font-family: monospace; resize: vertical;"
          ></textarea>
        `;
      case 'uuid':
        return html`
          <input
            class="variable-value-input"
            type="text"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
            placeholder="输入UUID (如: 00000000-0000-0000-0000-000000000000)"
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          />
        `;
      case 'email':
        return html`
          <input
            class="variable-value-input"
            type="email"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
            placeholder="输入邮箱地址..."
          />
        `;
      case 'url':
        return html`
          <input
            class="variable-value-input"
            type="url"
            .value=${this.popupValue}
            @input=${this.handlePopupValueChange}
            placeholder="输入URL..."
          />
        `;
      default:

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

  private renderTypeSelector() {
    const typeOptions = [
      { value: 'string', label: '📝 String (文本)' },
      { value: 'number', label: '🔢 Number (数字)' },
      { value: 'integer', label: '🔢 Integer (整数)' },
      { value: 'boolean', label: '✅ Boolean (布尔值)' },
      { value: 'date', label: '📅 Date (日期)' },
      { value: 'time', label: '🕐 Time (时间)' },
      { value: 'datetime', label: '📆 DateTime (日期时间)' },
      { value: 'json', label: '📄 JSON (JSON数据)' },
      { value: 'uuid', label: '🔑 UUID (唯一标识符)' },
      { value: 'email', label: '📧 Email (邮箱)' },
      { value: 'url', label: '🔗 URL (链接)' },
      { value: 'null', label: '⭕ NULL (空值)' }
    ];

    return html`
      <select
        class="type-selector"
        .value=${this.activeVariableType}
        @change=${this.handleTypeChange}
      >
        ${typeOptions.map(option => html`
          <option value=${option.value} ?selected=${option.value === this.activeVariableType}>
            ${option.label}
          </option>
        `)}
      </select>
    `;
  }

  private handleVariableChange(variableName: string, value: Jinja2VariableValue) {
    this.values = {
      ...this.values,
      [variableName]: value
    };

    if (this.config?.autoPreview) {
      void this.renderTemplate();
    }
  }

  private handleVariableTypeChange(variableName: string, newType: string) {
    const variableIndex = this.variables.findIndex(v => v.name === variableName);
    if (variableIndex >= 0) {
      const updatedVariables = [...this.variables];

      const validType = this.validateVariableType(newType);
      if (validType) {
        updatedVariables[variableIndex] = {
          ...updatedVariables[variableIndex],
          type: validType
        };
        this.variables = updatedVariables;
      }
    }
  }

  private async renderTemplate() {
    if (!this.template) {
      return;
    }

    this.isProcessing = true;
    const startTime = performance.now();

    try {

      this.recordVariableChange('TEMPLATE_RENDER_START', null, this.variableValues, 'template_render', 'before_render',
        `Starting template render with ${Object.keys(this.variableValues).length} variables`);


      await new Promise(resolve => setTimeout(resolve, 100));

      this.processingTime = performance.now() - startTime;


      const result = this.renderWithNunjucks(this.template);


      this.renderedResult = result;


      this.recordVariableChange('TEMPLATE_RENDER_END', null, {
        ...this.variableValues,
        _rendered_result: result
      }, 'template_render', 'after_render',
        `Template render completed with result length: ${result.length}`);

    } catch (error) {
      console.error('Template rendering failed:', error);
      this.renderedResult = '';


      this.recordVariableChange('TEMPLATE_RENDER_ERROR', null, { error: String(error) }, 'template_render', 'after_render',
        `Template render failed: ${error}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 🚀 NEW: Pure nunjucks-based template rendering
   * 替换自定义模板渲染逻辑，使用经过验证的稳定nunjucks API
   * 这应该彻底解决placeholder问题（如42VAR002、数字追加等）
   */
  private renderWithNunjucks(template: string): string {
    try {



      this.validateAndCleanVariables();



      const result = this.nunjucksEnv.renderString(template, this.variableValues);


      const suspiciousPatterns = [
        { pattern: /VAR_\d+/, description: 'VAR_N pattern' },
        { pattern: /\d+VAR\d+/, description: 'NVAR_N pattern' },
        { pattern: /42VAR/, description: '42VAR pattern' },
        { pattern: /demo_use_where_clause\d/, description: 'String number appending' },
        { pattern: /\d{3}/, description: 'Triple digit patterns (like 422, 412)' }
      ];

      const detectedIssues: string[] = [];
      suspiciousPatterns.forEach(({ pattern, description }) => {
        if (pattern.test(result)) {
          detectedIssues.push(description);
        }
      });

      if (detectedIssues.length > 0) {
        this.sendLogToOutputChannel('SUSPICIOUS', `Nunjucks produced suspicious patterns: ${detectedIssues.join(', ')}`);
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendLogToOutputChannel('NUNJUCKS_ERROR', `Nunjucks rendering failed: ${errorMessage}`);
      this.recordVariableChange('NUNJUCKS_ERROR', null, { error: errorMessage }, 'template_render', 'after_render',
        `Nunjucks render failed: ${errorMessage}`);


      console.warn('Nunjucks rendering failed, falling back to simulation method:', error);
      return this.simulateTemplateRendering(template);
    }
  }

  /**
   * 验证和清理变量值，检测placeholder模式
   */
  private validateAndCleanVariables(): void {
    Object.keys(this.variableValues).forEach(variableName => {
      const value = this.variableValues[variableName];


      if (typeof value === 'string') {
        const suspiciousPatterns = [
          /VAR_\d+/,
          /\d+VAR\d+/,
          /42VAR/,
          /^demo_.*\d+$/
        ];

        const detectedPattern = suspiciousPatterns.find(pattern => pattern.test(value));

        if (detectedPattern) {
          this.sendLogToOutputChannel('VARIABLE_VALIDATION', `Suspicious placeholder detected in ${variableName}: ${value} (pattern: ${detectedPattern.source})`);


          const cleanValue = this.generateCleanDefaultValue(variableName);
          this.variableValues[variableName] = cleanValue;

          this.sendLogToOutputChannel('VARIABLE_CLEANED', `Cleaned ${variableName}: ${value} -> ${cleanValue}`);
          this.recordVariableChange(variableName, value, cleanValue, 'template_render', 'before_render',
            `Cleaned suspicious placeholder: ${value} -> ${cleanValue}`);
        }
      }
    });
  }

  /**
   * 生成干净的默认值，避免placeholder模式
   */
  private generateCleanDefaultValue(variableName: string): Jinja2VariableValue {
    const variable = this.variables.find(v => v.name === variableName);
    const type = variable?.type || this.inferVariableType(variableName);

    switch (type) {
      case 'number':
      case 'integer':
        return 42;
      case 'boolean':
        return true;
      case 'date':
        return '2023-01-01';
      case 'datetime':
        return '2023-01-01T00:00:00';
      case 'null':
        return null;
      case 'email':
        return 'test@example.com';
      case 'url':
        return 'https://example.com';
      case 'uuid':
        return '00000000-0000-0000-0000-000000000000';
      default:

        return `clean_${variableName}`;
    }
  }

  /**
   * 推断变量类型（简化版）
   */
  private inferVariableType(variableName: string): string {
    const name = variableName.toLowerCase();

    if (name.includes('id') || name.includes('num') || name.includes('count')) {
      return 'number';
    }
    if (name.includes('is_') || name.includes('has_') || name.includes('enabled')) {
      return 'boolean';
    }
    if (name.includes('date') || name.includes('time')) {
      return 'date';
    }
    return 'string';
  }

  private simulateTemplateRendering(template: string): string {
    let result = template;


    result = this.processConditionalBlocks(result);


    const replacedVariables = new Set<string>();


    Object.entries(this.variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*}}`, 'g');
      const matches = result.match(regex);
      if (matches && matches.length > 0) {
        const formattedValue = this.formatValue(value);
        const beforeReplace = result;
        result = result.replace(regex, formattedValue);
        replacedVariables.add(key);


        if (beforeReplace === result) {
          this.sendLogToOutputChannel('REPLACE_FAILED', `Variable replace failed for ${key}`);
        }
      }
    });


    const unreplacedRegex = /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g;
    let match;
    const unreplacedVariables = [];

    while ((match = unreplacedRegex.exec(result)) !== null) {
      const varName = match[1];
      if (!replacedVariables.has(varName) && !this.variableValues.hasOwnProperty(varName)) {
        unreplacedVariables.push(varName);

      }
    }


    Object.entries(this.variableValues).forEach(([key, value]) => {
      if (typeof value === 'string') {

        if (/VAR_\d+/.test(value) || /\d+VAR\d+/.test(value) || /^VAR\d+/.test(value) || value.includes('42VAR')) {
          this.recordVariableChange('PLACEHOLDER_VALUE', value, value, 'template_render', 'after_render',
            `Variable ${key} has suspicious value: ${value}`);
        }
      }
    });


    result = result.replace(/{%[^%]*%}/g, '');
    result = result.replace(/{{[^}]*}}/g, '');

    return result;
  }

  private processConditionalBlocks(template: string): string {
    let result = template;


    const ifRegex = /{%\s*if\s+([^%]+)\s*%}([\s\S]*?)(?:{%\s*elif\s+([^%]+)\s*%}([\s\S]*?))*?{%\s*else\s*%}([\s\S]*?){%\s*endif\s*%}/g;

    result = result.replace(ifRegex, (match, ifCondition, ifContent, ...elifMatches) => {

      const elifBlocks = [];
      for (let i = 0; i < elifMatches.length; i += 2) {
        if (elifMatches[i]) {
          elifBlocks.push({
            condition: elifMatches[i],
            content: elifMatches[i + 1] || ''
          });
        }
      }


      const elseContent = elifMatches.length % 2 === 0 ?
        elifMatches[elifMatches.length - 1] :
        elifMatches[elifMatches.length - 2];


      if (this.evaluateCondition(ifCondition.trim())) {
        return ifContent;
      }


      for (const elifBlock of elifBlocks) {
        if (elifBlock.condition && this.evaluateCondition(elifBlock.condition.trim())) {
          return elifBlock.content;
        }
      }


      return elseContent || '';
    });


    const simpleIfRegex = /{%\s*if\s+([^%]+)\s*%}([\s\S]*?){%\s*endif\s*%}/g;
    result = result.replace(simpleIfRegex, (match, condition, content) => {
      return this.evaluateCondition(condition.trim()) ? content : '';
    });

    return result;
  }

  private evaluateCondition(condition: string): boolean {

    const variableRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const variables = condition.match(variableRegex) || [];


    const excludedWords = new Set([
      'and', 'or', 'not', 'in', 'like', 'between', 'is', 'null', 'true', 'false', 'exists',
      'eq', 'ne', 'lt', 'gt', 'le', 'ge', 'defined', 'undefined'
    ]);

    for (const varName of variables) {
      if (!excludedWords.has(varName.toLowerCase())) {
        if (this.variableValues.hasOwnProperty(varName)) {
          const value = this.variableValues[varName];


          let valueStr: string;
          if (typeof value === 'boolean') {
            valueStr = value ? 'true' : 'false';
          } else if (value == null) {
            valueStr = 'null';
          } else if (typeof value === 'string') {
            valueStr = `'${value.replace(/'/g, "\\'")}'`;
          } else {
            valueStr = String(value);
          }

          condition = condition.replace(new RegExp(`\\b${varName}\\b`, 'g'), valueStr);
        } else {

          condition = condition.replace(new RegExp(`\\b${varName}\\b`, 'g'), 'false');
        }
      }
    }


    condition = condition.replace(/\band\b/g, '&&');
    condition = condition.replace(/\bor\b/g, '||');
    condition = condition.replace(/\bnot\b/g, '!');


    condition = condition.replace(/===/g, '===');
    condition = condition.replace(/==/g, '===');
    condition = condition.replace(/!=/g, '!==');
    condition = condition.replace(/</g, '<');
    condition = condition.replace(/>/g, '>');


    condition = condition.replace(/\bis\s+null\b/g, '=== null');
    condition = condition.replace(/\bis\s+not\s+null\b/g, '!== null');

    try {

      const func = new Function(`return ${condition}`);
      return func();
    } catch (error) {
      console.warn('Failed to evaluate condition:', condition, error);
      return false;
    }
  }

  private processForLoops(template: string): string {
    let result = template;


    const forRegex = /{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}([\s\S]*?){%\s*endfor\s*%}/g;

    result = result.replace(forRegex, (match, itemVar, arrayVar, content) => {
      const arrayValue = this.variableValues[arrayVar];

      if (Array.isArray(arrayValue)) {
        return arrayValue.map(item => {
          let itemContent = content;

          const itemRegex = new RegExp(`{{\\s*${itemVar}\\s*}}`, 'g');
          if (typeof item === 'object' && item !== null) {

            Object.keys(item).forEach(key => {
              const propRegex = new RegExp(`{{\\s*${itemVar}\\.${key}\\s*}}`, 'g');
              const value = (item as Record<string, unknown>)[key];
              itemContent = itemContent.replace(propRegex, this.formatValue(value as Jinja2VariableValue));
            });
          } else {
            itemContent = itemContent.replace(itemRegex, this.formatValue(item as Jinja2VariableValue));
          }
          return itemContent;
        }).join('\n');
      }

      return '';
    });

    return result;
  }

  private renderedResult: string = '';

  private formatValue(value: Jinja2VariableValue): string {
    let result: string;

    if (value == null) {
      result = 'NULL';
    } else if (typeof value === 'string') {
      result = `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'boolean') {
      result = value ? 'TRUE' : 'FALSE';
    } else if (typeof value === 'number') {
      result = String(value);
    } else if (typeof value === 'object') {
      result = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    } else {
      result = String(value);
    }


    if (typeof value === 'string' && /\d+$/.test(value) && /\d+\d+$/.test(result)) {
      this.sendLogToOutputChannel('SUSPICIOUS_FORMATTING', `Suspicious formatting: ${JSON.stringify(value)} -> ${result}`);
    }

    return result;
  }

  private handleCopyTemplate() {
    void navigator.clipboard.writeText(this.template).then(() => {
      this.showNotification('模板已复制到剪贴板');
    });
  }

  /**
   * 导出变量变化追踪日志
   */
  private handleToggleSyncScroll() {
    this.syncScroll = !this.syncScroll;

    if (this.syncScroll) {

      this.setupTemplateToSQLScrollSync();
      this.showNotification('联动滚动已启用', 'success');
    } else {

      this.cleanupScrollSync();
      this.showNotification('联动滚动已禁用', 'info');
    }
  }

  private setupTemplateToSQLScrollSync() {

    setTimeout(() => {
      this.initializeScrollContainers();
    }, 100);
  }

  private cleanupScrollSync() {

    if (this.templateEditor) {
      this.templateEditor.removeEventListener('scroll', this.handleTemplateScroll);
      this.templateEditor = null;
    }
    if (this.sqlPreview) {
      this.sqlPreview.removeEventListener('scroll', this.handleSQLPreviewScroll);
      this.sqlPreview = null;
    }
  }

  private initializeScrollContainers() {

    const templateContainer = this.shadowRoot?.querySelector('.editor-panel .panel-content') as HTMLElement;
    const sqlContainer = this.shadowRoot?.querySelector('.preview-panel .panel-content') as HTMLElement;

    if (templateContainer && sqlContainer) {
      this.templateEditor = templateContainer;
      this.sqlPreview = sqlContainer;


      this.templateEditor.removeEventListener('scroll', this.handleTemplateScroll);
      this.sqlPreview.removeEventListener('scroll', this.handleSQLPreviewScroll);


      this.templateEditor.addEventListener('scroll', this.handleTemplateScroll.bind(this));
      this.sqlPreview.addEventListener('scroll', this.handleSQLPreviewScroll.bind(this));
    }
  }

  private handleTemplateScroll(event: Event) {
    if (!this.syncScroll || this.isScrollingSync) return;


    const now = Date.now();
    if (now - this.lastScrollTime < 16) return;

    this.lastScrollTime = now;
    const templateElement = event.target as HTMLElement;
    this.syncScrollPosition('template-to-sql', templateElement);
  }

  private handleSQLPreviewScroll(event: Event) {
    if (!this.syncScroll || this.isScrollingSync) return;


    const now = Date.now();
    if (now - this.lastScrollTime < 16) return;

    this.lastScrollTime = now;
    const sqlElement = event.target as HTMLElement;
    this.syncScrollPosition('sql-to-template', sqlElement);
  }

  private syncScrollPosition(direction: 'template-to-sql' | 'sql-to-template', sourceElement: HTMLElement) {
    if (!this.templateEditor || !this.sqlPreview) return;

    this.isScrollingSync = true;

    try {
      const sourceScrollTop = sourceElement.scrollTop;
      const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;

      if (sourceScrollHeight <= 0) return;


      const scrollRatio = sourceScrollTop / sourceScrollHeight;


      const targetElement = direction === 'template-to-sql'
        ? this.sqlPreview
        : this.templateEditor;

      const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;

      if (targetScrollHeight <= 0) return;


      const targetScrollTop = scrollRatio * targetScrollHeight;


      targetElement.scrollTop = targetScrollTop;

    } finally {

      this.isScrollingSync = false;
    }
  }

  private handleExportVariableLogs() {
    if (this.variableChangeLogs.length === 0) {
      return;
    }

    const logs = this.variableChangeLogs.map(log => {
      const timestamp = log.timestamp;
      const variableName = log.variableName;
      const oldValue = log.oldValue;
      const newValue = log.newValue;
      const contextStr = JSON.stringify(log.context, null, 2);
      const template = log.template;
      const renderedResult = log.renderedResult || '';
      const rightPanelHTML = log.rightPanelHTML || '';
      const step = log.step;
      const phase = log.phase;
      const details = log.details || '';

      let logEntry = `[${timestamp}] ${step} - ${phase}
Variable: ${variableName}
Old Value: ${JSON.stringify(oldValue)}
New Value: ${JSON.stringify(newValue)}
Context: ${contextStr}
Template: ${template}
Rendered Result: ${renderedResult}
Details: ${details}`;


      if (rightPanelHTML) {
        logEntry += `
Right Panel HTML (${rightPanelHTML.length} chars):
${rightPanelHTML}`;
      }

      return logEntry + '\n---';
    }).join('\n');

    const header = `Jinja2 V2 Editor Variable Change Logs
Generated: ${new Date().toISOString()}
Total Changes: ${this.variableChangeLogs.length}
Target: Find strange placeholder values (42VAR002) in auto-rendering
Includes: Right panel HTML tracking

`;

    const fullLog = header + logs;


    const blob = new Blob([fullLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jinja2-variable-changes-${new Date().toISOString().slice(0, 19)}.log`;
    a.click();
    URL.revokeObjectURL(url);


  }

  private generateDebugLogs() {
    return {
      timestamp: new Date().toISOString(),
      editorInfo: {
        title: this.title,
        templateLength: this.template.length,
        variablesCount: this.variables.length,
        templatePreview: this.template.substring(0, 500) + (this.template.length > 500 ? '...' : '')
      },
      variables: this.variables.map(v => ({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
        currentValue: this.variableValues[v.name],
        description: v.description,
        isRequired: v.isRequired
      })),
      variableValues: this.variableValues,
      highlightedTemplate: {
        length: this.highlightedTemplate.length,
        hasVariableHighlights: this.highlightedTemplate.includes('variable-highlight'),
        variableCount: (this.highlightedTemplate.match(/data-variable="/g) || []).length,
        preview: this.highlightedTemplate.substring(0, 1000) + (this.highlightedTemplate.length > 1000 ? '...' : '')
      },
      renderedResult: {
        length: this.renderedResult?.length || 0,
        preview: this.renderedResult?.substring(0, 1000) + (this.renderedResult && this.renderedResult.length > 1000 ? '...' : '')
      },
      config: this.config
    };
  }

  private handleCopyResult() {
    void navigator.clipboard.writeText(this.renderedResult).then(() => {
      this.showNotification('SQL已复制到剪贴板');
    });
  }

  private handleSubmit() {
    void this.renderTemplate();
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

  /**
   * 记录变量变化
   */
  private recordVariableChange(
    variableName: string,
    oldValue: Jinja2VariableValue,
    newValue: Jinja2VariableValue,
    step: 'variable_change' | 'template_render' | 'html_change',
    phase: 'before_render' | 'after_render' | 'html_update',
    details?: string
  ) {

    const rightPanelHTML = this.captureRightPanelHTML();

    const logEntry = {
      timestamp: new Date().toISOString(),
      variableName,
      oldValue,
      newValue,
      context: { ...this.variableValues },
      template: this.template,
      renderedResult: this.renderedResult || '',
      rightPanelHTML,
      step,
      phase,
      details: details || `Variable ${variableName} changed from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`
    };

    this.variableChangeLogs.push(logEntry);


    if (this.variableChangeLogs.length > 100) {
      this.variableChangeLogs = this.variableChangeLogs.slice(-50);
    }




    if (rightPanelHTML && (/VAR_\d+/.test(rightPanelHTML) || /\d+VAR\d+/.test(rightPanelHTML) || /42VAR/.test(rightPanelHTML))) {
      this.recordVariableChange('PLACEHOLDER_DETECTED', rightPanelHTML, rightPanelHTML, 'html_change', 'html_update',
        `Found placeholder pattern in right panel HTML`);
    }
  }

  /**
   * 捕获右边页面(SQL预览区域)的HTML内容
   */
  private captureRightPanelHTML(): string {
    try {

      const rightPanel = this.shadowRoot?.querySelector('.preview-panel .sql-preview');
      if (!rightPanel) {
        return '';
      }


      const htmlContent = rightPanel.innerHTML;


      const maxLength = 2000;
      if (htmlContent.length > maxLength) {
        return htmlContent.substring(0, maxLength) + '...[TRUNCATED]';
      }

      return htmlContent;
    } catch (error) {
      console.warn('Failed to capture right panel HTML:', error);
      return '';
    }
  }

  /**
   * 检查是否应该发送日志
   */
  private shouldLog(category: string): boolean {
    const logLevel = this.config?.logLevel || 'error';


    if (logLevel === 'none') {
      return false;
    }


    const errorCategories = [
      'ERROR',
      'TEMPLATE_RENDER_ERROR',
      'PLACEHOLDER_DETECTED',
      'PLACEHOLDER_IN_HTML'
    ];


    const warnCategories = [
      'WARN',
      'SUSPICIOUS',
      'DEFAULT_PLACEHOLDER',
      'VARIABLE_VALIDATION',
      'REPLACE_FAILED'
    ];


    const infoCategories = [
      'INFO',
      'SUCCESS',
      'CLEAN',
      'VARIABLE_CLEANED'
    ];


    switch (logLevel) {
      case 'error':
        return errorCategories.some(cat => category.includes(cat));
      case 'warn':
        return errorCategories.some(cat => category.includes(cat)) ||
               warnCategories.some(cat => category.includes(cat));
      case 'info':
        return errorCategories.some(cat => category.includes(cat)) ||
               warnCategories.some(cat => category.includes(cat)) ||
               infoCategories.some(cat => category.includes(cat));
      case 'debug':
        return true;
      default:
        return false;
    }
  }

  /**
   * 发送日志到VS Code OUTPUT频道
   */
  private sendLogToOutputChannel(category: string, message: string) {

    if (!this.shouldLog(category)) {
      return;
    }

    try {
      if (typeof window !== 'undefined' && window.vscode) {
        window.vscode.postMessage({
          command: 'log',
          data: {
            category: `V2_EDITOR_${category}`,
            message,
            timestamp: new Date().toISOString(),
            variableCount: this.variables.length,
            activeVariable: this.activeVariable,
            templateLength: this.template.length,
            renderedResultLength: this.renderedResult?.length || 0
          }
        });
      }
    } catch (error) {
      console.error('Failed to send log to VS Code OUTPUT:', error);
    }
  }

  private showNotification(message: string, _type: 'info' | 'success' | 'warning' | 'error' = 'info') {
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
          </div>
          <div class="header-actions">
            <button class="header-button" @click=${this.handleToggleSyncScroll} title="${this.syncScroll ? '禁用联动滚动' : '启用联动滚动'}">
              <span>🔗</span>
              <span>联动</span>
            </button>
            <button class="header-button" @click=${this.handleExportVariableLogs} title="导出变量变化日志">
              📋 变量日志
            </button>
            <button class="header-button primary" @click=${this.handleSubmit}>
              ✅ 提交
            </button>
          </div>
        </header>

        <!-- Main Layout -->
        <main class="layout-container">
          <!-- Template Panel (Full Width) -->
          <section class="editor-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>📝</span> 模板编辑器
                <span class="panel-subtitle">发现 ${this.variables.length} 个变量</span>
              </div>
              <div class="header-actions">
                <button class="header-button" @click=${this.handleCopyTemplate} title="复制模板">
                  📄 复制
                </button>
              </div>
            </div>
            <div class="panel-content">
              <!-- Template Display -->
              ${this.template ? html`
                <div class="template-display" .innerHTML=${this.highlightedTemplate} @click=${this.handleTemplateClick}></div>
              ` : html`
                <div class="empty-state">
                  <div class="empty-icon">📝</div>
                  <div class="empty-title">没有模板可编辑</div>
                  <div class="empty-description">
                    添加包含变量的 Jinja2 模板（例如：{{ variable_name }}）来开始编辑。
                  </div>
                </div>
              `}
            </div>
          </section>

          <!-- SQL Preview Panel -->
          <section class="preview-panel">
            <div class="panel-header">
              <div class="panel-title">
                <span>👁️</span> SQL 预览
                ${this.processingTime > 0 ? html`
                  <span class="panel-subtitle">${Math.round(this.processingTime)}ms</span>
                ` : ''}
              </div>
              <div class="header-actions">
                <button class="header-button" @click=${this.handleCopyResult} title="复制SQL结果">
                  📋 复制
                </button>
              </div>
            </div>
            <div class="panel-content">
              ${this.renderedResult ? html`
                <div class="sql-preview" .innerHTML=${this.highlightRenderedSQL(this.renderedResult)}></div>
              ` : html`
                <div class="empty-state">
                  <div class="empty-icon">🔍</div>
                  <div class="empty-title">没有SQL预览</div>
                  <div class="empty-description">
                    点击模板编辑器中的变量来配置它们，并在此处查看渲染后的SQL。
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
            </div>
            <div class="variable-popup-content">
              ${(() => {
                const currentValue = this.activeVariable ? this.variableValues[this.activeVariable] : undefined;

                return html`
                  <div class="variable-info-row">
                    <span class="variable-info-label">类型:</span>
                    <span class="variable-info-value">
                      ${this.activeVariableType}
                      <button class="type-change-button" @click=${this.handleTypeToggle}>
                        ${this.showTypeSelector ? '隐藏' : '更改'}
                      </button>
                    </span>
                  </div>
                  ${this.showTypeSelector ? this.renderTypeSelector() : ''}
                  <div class="variable-info-row">
                    <span class="variable-info-label">当前值:</span>
                    <span class="variable-info-value">${this.formatValueForEdit(currentValue)}</span>
                  </div>
                  <div class="variable-info-row">
                    <span class="variable-info-label">新值:</span>
                  </div>
                  ${this.renderVariableInput(this.activeVariableType, currentValue)}
                `;
              })()}
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

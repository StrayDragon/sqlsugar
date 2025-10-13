/**
 * Template Highlighter Component for V2 Editor
 *
 * Renders the Jinja2 template with highlighted variables that can be clicked
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type {
  EnhancedVariable,
  TemplateHighlight,
  EditorV2Config
} from '../types.js';
import { parseTemplate } from '../utils/template-parser.js';

@customElement('template-highlighter')
export class TemplateHighlighter extends LitElement {
  @property({ type: String }) accessor template: string = '';
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
  @property({ attribute: false }) accessor variables: EnhancedVariable[] = [];
  @property({ type: String }) accessor selectedVariable: string | null = null;
  @property({ type: String }) accessor theme: string = 'vscode-dark';

  @state() accessor highlightedHTML: string = '';
  @state() private highlightData: TemplateHighlight | null = null;
  @state() private hoveredVariable: string | null = null;

  // @ts-ignore - Lit static styles don't need override
  static override styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      border-radius: var(--border-radius-md, 6px);
      overflow: auto;
      position: relative;
      line-height: var(--line-height-normal, 1.5);
    }

    .template-container {
      padding: var(--spacing-lg, 16px);
      white-space: pre-wrap;
      word-break: break-word;
      position: relative;
      font-size: var(--font-size-md, 13px);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius-md, 6px);
      background: var(--vscode-editor-background);
    }

    .template-content {
      position: relative;
      line-height: 1.6;
    }

    /* Variable highlight styles */
    .variable-highlight {
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      position: relative;
      border-radius: 3px;
      padding: 1px 3px;
      margin: -1px -3px;
    }

    /* Background highlight style */
    .highlight-style-background .variable-highlight {
      background-color: rgba(66, 133, 244, 0.2);
      border: 1px solid transparent;
    }

    .highlight-style-background .variable-highlight:hover {
      background-color: rgba(66, 133, 244, 0.3);
      border-color: var(--vscode-focusBorder);
    }

    .highlight-style-background .variable-highlight.selected {
      background-color: rgba(66, 133, 244, 0.4);
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 8px rgba(66, 133, 244, 0.5);
    }

    /* Border highlight style */
    .highlight-style-border .variable-highlight {
      border: 1px solid var(--vscode-focusBorder);
      border-bottom: 2px solid var(--vscode-focusBorder);
      background: transparent;
    }

    .highlight-style-border .variable-highlight:hover {
      background-color: rgba(66, 133, 244, 0.1);
      border-color: var(--vscode-button-background);
    }

    .highlight-style-border .variable-highlight.selected {
      background-color: rgba(66, 133, 244, 0.2);
      border-color: var(--vscode-button-background);
      border-bottom: 2px solid var(--vscode-button-background);
    }

    /* Underline highlight style */
    .highlight-style-underline .variable-highlight {
      background: transparent;
      border: none;
      border-bottom: 2px dotted var(--vscode-focusBorder);
      text-decoration: none;
    }

    .highlight-style-underline .variable-highlight:hover {
      background-color: rgba(66, 133, 244, 0.1);
      border-bottom: 2px solid var(--vscode-button-background);
    }

    .highlight-style-underline .variable-highlight.selected {
      background-color: rgba(66, 133, 244, 0.2);
      border-bottom: 2px solid var(--vscode-button-background);
    }

    /* Variable type indicators */
    .variable-highlight::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 4px;
      border-radius: 50%;
      opacity: 0;
      transition: opacity var(--transition-fast, 0.15s ease);
    }

    .variable-highlight:hover::before,
    .variable-highlight.selected::before {
      opacity: 1;
    }

    .variable-highlight[data-type="string"]::before { background-color: var(--vscode-charts-orange); }
    .variable-highlight[data-type="number"]::before,
    .variable-highlight[data-type="integer"]::before { background-color: var(--vscode-charts-blue); }
    .variable-highlight[data-type="boolean"]::before { background-color: var(--vscode-charts-green); }
    .variable-highlight[data-type="date"]::before,
    .variable-highlight[data-type="datetime"]::before { background-color: var(--vscode-charts-purple); }
    .variable-highlight[data-type="email"]::before { background-color: var(--vscode-charts-red); }
    .variable-highlight[data-type="url"]::before { background-color: var(--vscode-charts-yellow); }
    .variable-highlight[data-type="json"]::before { background-color: var(--vscode-charts-cyan); }

    /* Required variable indicator */
    .variable-highlight.required::after {
      content: '*';
      position: absolute;
      right: -8px;
      top: -2px;
      color: var(--vscode-errorForeground);
      font-weight: bold;
      font-size: 12px;
      opacity: 0;
      transition: opacity var(--transition-fast, 0.15s ease);
    }

    .variable-highlight.required:hover::after,
    .variable-highlight.required.selected::after {
      opacity: 1;
    }

    /* Hover tooltip */
    .variable-tooltip {
      position: absolute;
      background: var(--vscode-editorHoverWidget-background);
      border: 1px solid var(--vscode-editorHoverWidget-border);
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 12px;
      color: var(--vscode-editorHoverWidget-foreground);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-5px);
      transition: all var(--transition-fast, 0.15s ease);
      max-width: 300px;
      word-wrap: break-word;
    }

    .variable-tooltip.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .tooltip-header {
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--vscode-textLink-foreground);
    }

    .tooltip-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .tooltip-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Loading state */
    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--vscode-progressBar-background);
      border-top: 2px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 12px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      border: 2px dashed var(--vscode-widget-border);
      border-radius: var(--border-radius-md, 6px);
      background: var(--vscode-textBlockQuote-background);
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--vscode-foreground);
    }

    .empty-description {
      font-size: 14px;
      line-height: 1.5;
      opacity: 0.8;
      max-width: 400px;
    }

    /* Line numbers */
    .line-numbers {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 40px;
      background: var(--vscode-editor-lineNumbers-background);
      border-right: 1px solid var(--vscode-editor-lineNumbers-border);
      color: var(--vscode-editorLineNumbers-foreground);
      font-size: 12px;
      text-align: right;
      padding-right: 8px;
      padding-top: var(--spacing-lg, 16px);
      user-select: none;
      overflow: hidden;
    }

    .line-number {
      height: 1.6em;
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .template-content.with-line-numbers {
      margin-left: 40px;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .template-container {
        padding: var(--spacing-md, 12px);
        font-size: 12px;
      }

      .variable-tooltip {
        max-width: 200px;
      }
    }
  `;

  override willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('template')) {
      this.parseAndHighlightTemplate();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.parseAndHighlightTemplate();
  }

  private parseAndHighlightTemplate() {
    if (!this.template) {
      this.highlightData = null;
      this.highlightedHTML = '';
      this.variables = [];
      return;
    }

    try {
      this.highlightData = parseTemplate(this.template);
      this.variables = this.highlightData.variables;
      this.highlightedHTML = this.addInteractiveElements(this.highlightData.highlightedHTML);
    } catch (error) {
      console.error('Template parsing failed:', error);
      this.highlightData = null;
      this.highlightedHTML = this.escapeHtml(this.template);
      this.variables = [];
    }
  }

  private addInteractiveElements(html: string): string {
    // Add data attributes and event handlers to variable elements
    return html.replace(
      /<span class="variable-highlight" data-variable="([^"]+)" data-index="([^"]+)">([^<]+)<\/span>/g,
      (match, varName, index, varText) => {
        const variable = this.variables[parseInt(index)];
        if (!variable) return match;

        const classes = ['variable-highlight'];
        if (variable.isRequired) classes.push('required');
        if (variable.name === this.selectedVariable) classes.push('selected');

        return `<span
          class="${classes.join(' ')}"
          data-variable="${varName}"
          data-index="${index}"
          data-type="${variable.type}"
          title="${this.getVariableTooltip(variable)}"
          role="button"
          tabindex="0"
          aria-label="Variable ${varName} of type ${variable.type}"
        >${varText}</span>`;
      }
    );
  }

  private getVariableTooltip(variable: EnhancedVariable): string {
    const parts = [
      `Variable: ${variable.name}`,
      `Type: ${variable.type}`,
      `Line: ${variable.position.line}`,
      `Required: ${variable.isRequired ? 'Yes' : 'No'}`
    ];

    if (variable.context?.semanticContext) {
      parts.push(`Context: ${variable.context.semanticContext}`);
    }

    return parts.join('\n');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private handleVariableClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const variableElement = target.closest('.variable-highlight') as HTMLElement;

    if (!variableElement) return;

    event.preventDefault();
    event.stopPropagation();

    const variableName = variableElement.dataset.variable || null;
    const variableIndex = parseInt(variableElement.dataset.index || '0');
    const variable = this.variables[variableIndex];

    if (variable) {
      this.selectedVariable = variableName;
      this.dispatchEvent(new CustomEvent('variable-click', {
        detail: { variable, event },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleVariableHover(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const variableElement = target.closest('.variable-highlight') as HTMLElement;

    if (!variableElement) {
      this.hoveredVariable = null;
      return;
    }

    const variableName = variableElement.dataset.variable || null;
    this.hoveredVariable = variableName;

    this.dispatchEvent(new CustomEvent('variable-hover', {
      detail: {
        variableName,
        element: variableElement,
        event
      },
      bubbles: true,
      composed: true
    }));
  }

  private handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;

    if (target.classList.contains('variable-highlight')) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.handleVariableClick(event as any);
      }
    }
  }

  override render() {
    const highlightClass = `highlight-style-${this.config.highlightStyle}`;

    if (!this.template) {
      return html`
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">No Template Content</div>
          <div class="empty-description">
            Add a Jinja2 template with variables like {{ variable_name }} to start editing.
          </div>
        </div>
      `;
    }

    return html`
      <div class="template-container">
        <div
          class="template-content ${highlightClass}"
          @click=${this.handleVariableClick}
          @mouseover=${this.handleVariableHover}
          @mouseout=${() => this.hoveredVariable = null}
          @keydown=${this.handleKeyDown}
        >
          ${this.highlightedHTML ? html`
            <div .innerHTML=${this.highlightedHTML}></div>
          ` : html`
            <div class="loading-container">
              <div class="loading-spinner"></div>
              <span>Parsing template...</span>
            </div>
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'template-highlighter': TemplateHighlighter;
  }
}

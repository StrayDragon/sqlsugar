/**
 * Variable Popover Component for V2 Editor
 *
 * Provides an inline editor for template variables with smart positioning
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import type {
  EnhancedVariable,
  PopoverState,
  PopoverPosition,
  VariableChangeEventV2,
  EditorV2Config,
  Jinja2VariableValue
} from '../types.js';
import { getDefaultValueForType, validateValue } from '../utils/variable-utils.js';
import {
  calculatePopoverPosition,
  getArrowPosition,
  animatePositionChange,
  shouldReposition,
  adjustPositionForScroll
} from '../utils/position-calculator.js';

// Import V2 UI components
import './ui/input.js';
import './ui/select.js';
import './ui/button.js';

// Default popover dimensions
const POPOVER_DIMENSIONS = {
  width: 320,
  height: 280,
  arrowSize: 8
};

@customElement('variable-popover')
export class VariablePopover extends LitElement {
  @property({ attribute: false }) accessor variable: EnhancedVariable | null = null;
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
  @property({ attribute: false }) accessor currentValue: Jinja2VariableValue = undefined;
  @property({ attribute: false }) accessor targetElement: HTMLElement | null = null;
  @property({ attribute: false }) accessor containerElement: HTMLElement | null = null;

  @state() accessor isVisible: boolean = false;
  @state() accessor position: PopoverPosition | null = null;
  @state() accessor localValue: Jinja2VariableValue = undefined;
  @state() accessor localType: string = 'string';
  @state() accessor showAdvancedOptions: boolean = false;
  @state() accessor isAnimating: boolean = false;

  // Quick value suggestions based on variable type and name
  private quickSuggestions = {
    string: {
      'id': ['1', '123', 'user_id', 'sample_id'],
      'name': ['John Doe', 'Sample Name', 'Test User'],
      'email': ['test@example.com', 'user@domain.com', 'admin@test.org'],
      'default': ['sample', 'test', 'demo', 'example']
    },
    number: {
      'id': [1, 123, 1000],
      'count': [10, 25, 100],
      'limit': [10, 50, 100],
      'default': [0, 1, 42, 100]
    },
    boolean: {
      'is_': [true, false],
      'has_': [true, false],
      'can_': [true, false],
      'default': [true, false]
    },
    date: {
      'created': ['2024-01-01', '2024-12-31', new Date().toISOString().split('T')[0]],
      'updated': ['2024-01-01', '2024-12-31', new Date().toISOString().split('T')[0]],
      'default': ['2024-01-01', new Date().toISOString().split('T')[0]]
    }
  };

  // @ts-ignore - Lit static styles don't need override
  static override styles = css`
    :host {
      position: absolute;
      z-index: 1000;
      display: none;
      font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
      font-size: var(--font-size-sm, 12px);
    }

    :host([visible]) {
      display: block;
    }

    .popover-container {
      background: var(--vscode-editorHoverWidget-background);
      border: 1px solid var(--vscode-editorHoverWidget-border);
      border-radius: var(--border-radius-md, 6px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      min-width: 280px;
      max-width: 400px;
      position: relative;
      opacity: 0;
      transform: translateY(-5px) scale(0.95);
      transition: all var(--transition-normal, 0.2s ease);
      pointer-events: none;
    }

    .popover-container.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .popover-container.animating {
      transition: all var(--transition-slow, 0.3s ease);
    }

    /* Arrow */
    .popover-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: ${POPOVER_DIMENSIONS.arrowSize}px;
      border-color: transparent;
    }

    .popover-arrow::before {
      content: '';
      position: absolute;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: ${POPOVER_DIMENSIONS.arrowSize}px;
      border-color: transparent;
    }

    .popover-arrow.top {
      bottom: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-top-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.top::before {
      top: -${POPOVER_DIMENSIONS.arrowSize + 1}px;
      border-top-color: var(--vscode-editorHoverWidget-background);
    }

    .popover-arrow.bottom {
      top: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-bottom-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.bottom::before {
      top: 1px;
      border-bottom-color: var(--vscode-editorHoverWidget-background);
    }

    .popover-arrow.left {
      right: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-left-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.left::before {
      left: -${POPOVER_DIMENSIONS.arrowSize + 1}px;
      border-left-color: var(--vscode-editorHoverWidget-background);
    }

    .popover-arrow.right {
      left: -${POPOVER_DIMENSIONS.arrowSize * 2}px;
      border-right-color: var(--vscode-editorHoverWidget-border);
    }

    .popover-arrow.right::before {
      left: 1px;
      border-right-color: var(--vscode-editorHoverWidget-background);
    }

    /* Header */
    .popover-header {
      padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
      border-bottom: 1px solid var(--vscode-editorHoverWidget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-md, 6px) var(--border-radius-md, 6px) 0 0;
    }

    .variable-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .variable-name {
      font-weight: var(--font-weight-semibold, 600);
      color: var(--vscode-foreground);
      font-size: var(--font-size-md, 13px);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .variable-type {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .required-badge {
      background: var(--vscode-errorForeground);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .close-button {
      background: none;
      border: none;
      color: var(--vscode-icon-foreground);
      cursor: pointer;
      padding: 4px;
      border-radius: 3px;
      transition: all var(--transition-fast, 0.15s ease);
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
    }

    .close-button:hover {
      background: var(--vscode-toolbar-hoverBackground);
      color: var(--vscode-foreground);
    }

    /* Content */
    .popover-content {
      padding: var(--spacing-lg, 16px);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 12px);
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 4px);
    }

    .form-label {
      font-weight: var(--font-weight-medium, 500);
      color: var(--vscode-foreground);
      font-size: var(--font-size-xs, 11px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .form-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--spacing-sm, 8px);
      align-items: center;
    }

    /* Quick suggestions */
    .quick-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: var(--spacing-xs, 4px);
    }

    .suggestion-chip {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: 1px solid var(--vscode-widget-border);
      padding: 4px 8px;
      border-radius: 12px;
      font-size: var(--font-size-xs, 11px);
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      white-space: nowrap;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .suggestion-chip:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-1px);
    }

    .suggestion-chip.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-focusBorder);
    }

    /* Advanced options */
    .advanced-options {
      border-top: 1px solid var(--vscode-widget-border);
      padding-top: var(--spacing-md, 12px);
      margin-top: var(--spacing-md, 12px);
    }

    .advanced-toggle {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      font-size: var(--font-size-xs, 11px);
      padding: 4px 0;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all var(--transition-fast, 0.15s ease);
    }

    .advanced-toggle:hover {
      color: var(--vscode-textLink-activeForeground);
    }

    .advanced-content {
      display: none;
      margin-top: var(--spacing-sm, 8px);
      padding: var(--spacing-sm, 8px);
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
    }

    .advanced-content.visible {
      display: block;
    }

    /* Context information */
    .context-info {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-descriptionForeground);
      padding: var(--spacing-sm, 8px);
      background: var(--vscode-textBlockQuote-background);
      border-radius: var(--border-radius-sm, 4px);
      border-left: 3px solid var(--vscode-textLink-foreground);
    }

    .context-label {
      font-weight: var(--font-weight-medium, 500);
      margin-bottom: 2px;
    }

    .context-value {
      word-break: break-word;
    }

    /* Actions */
    .popover-actions {
      padding: var(--spacing-md, 12px) var(--spacing-lg, 16px);
      border-top: 1px solid var(--vscode-editorHoverWidget-border);
      display: flex;
      gap: var(--spacing-sm, 8px);
      justify-content: flex-end;
      background: var(--vscode-textBlockQuote-background);
      border-radius: 0 0 var(--border-radius-md, 6px) var(--border-radius-md, 6px);
    }

    .action-button {
      padding: 6px 12px;
      border-radius: var(--border-radius-sm, 4px);
      font-size: var(--font-size-xs, 11px);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s ease);
      border: 1px solid;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .action-button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-border);
    }

    .action-button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .action-button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-color: var(--vscode-button-secondaryBorder);
    }

    .action-button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    /* Validation */
    .validation-message {
      font-size: var(--font-size-xs, 11px);
      color: var(--vscode-errorForeground);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: var(--spacing-xs, 4px);
    }

    .validation-message.valid {
      color: var(--vscode-charts-green);
    }

    /* Animations */
    @keyframes popover-appear {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes popover-disappear {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(-10px) scale(0.9);
      }
    }

    .popover-container.appearing {
      animation: popover-appear var(--transition-normal, 0.2s ease) forwards;
    }

    .popover-container.disappearing {
      animation: popover-disappear var(--transition-normal, 0.2s ease) forwards;
    }

    /* Dark theme adjustments */
    :host([theme="dark"]) {
      --vscode-editorHoverWidget-background: #2d2d30;
      --vscode-editorHoverWidget-border: #3e3e42;
      --vscode-textBlockQuote-background: #1e1e1e;
    }

    /* Light theme adjustments */
    :host([theme="light"]) {
      --vscode-editorHoverWidget-background: #f3f3f3;
      --vscode-editorHoverWidget-border: #c8c8c8;
      --vscode-textBlockQuote-background: #ffffff;
    }
  `;

  override willUpdate(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has('variable') || changedProperties.has('currentValue')) {
      this.updateLocalValues();
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setupGlobalListeners();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeGlobalListeners();
  }

  private setupGlobalListeners() {
    document.addEventListener('keydown', this.handleGlobalKeyDown);
    document.addEventListener('click', this.handleGlobalClick);
    window.addEventListener('scroll', this.handleScroll, true);
    window.addEventListener('resize', this.handleResize);
  }

  private removeGlobalListeners() {
    document.removeEventListener('keydown', this.handleGlobalKeyDown);
    document.removeEventListener('click', this.handleGlobalClick);
    window.removeEventListener('scroll', this.handleScroll, true);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleGlobalKeyDown = (event: KeyboardEvent) => {
    if (!this.isVisible) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.applyChanges();
    }
  };

  private handleGlobalClick = (event: MouseEvent) => {
    if (!this.isVisible) return;

    const target = event.target as Element;
    if (!this.contains(target)) {
      // Check if click is on the target element
      if (this.targetElement && !this.targetElement.contains(target)) {
        this.hide();
      }
    }
  };

  private handleScroll = () => {
    if (!this.isVisible || !this.targetElement || !this.containerElement) return;

    if (shouldReposition(this.position!, this.targetElement, this.containerElement)) {
      this.reposition();
    }
  };

  private handleResize = () => {
    if (!this.isVisible || !this.targetElement || !this.containerElement) return;
    this.reposition();
  };

  private updateLocalValues() {
    if (!this.variable) return;

    this.localValue = this.currentValue ?? this.variable.defaultValue ?? getDefaultValueForType(this.variable.type);
    this.localType = this.variable.type;
  }

  show(variable: EnhancedVariable, currentValue: Jinja2VariableValue) {
    this.variable = variable;
    this.currentValue = currentValue;
    this.updateLocalValues();
    this.isVisible = true;

    // Calculate position after DOM update
    this.updateComplete.then(() => {
      this.calculatePosition();
    });

    this.requestUpdate();
  }

  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.dispatchEvent(new CustomEvent('popover-hide', {
      detail: { variable: this.variable },
      bubbles: true,
      composed: true
    }));
  }

  private calculatePosition() {
    if (!this.variable || !this.targetElement || !this.containerElement) return;

    this.position = calculatePopoverPosition(
      this.variable,
      this.targetElement,
      this.containerElement,
      this.config
    );

    this.updateStyles();
  }

  private reposition() {
    if (!this.variable || !this.targetElement || !this.containerElement) return;

    const newPosition = adjustPositionForScroll(
      this.position!,
      this.targetElement,
      this.containerElement,
      this.config
    );

    if (this.config.animationsEnabled && this.position) {
      this.isAnimating = true;
      animatePositionChange(
        this,
        this.position,
        newPosition,
        200
      ).then(() => {
        this.isAnimating = false;
        this.position = newPosition;
        this.updateStyles();
      });
    } else {
      this.position = newPosition;
      this.updateStyles();
    }
  }

  private updateStyles() {
    if (!this.position) return;

    const container = this.shadowRoot?.querySelector('.popover-container') as HTMLElement;
    if (!container) return;

    container.style.left = `${this.position.x}px`;
    container.style.top = `${this.position.y}px`;

    // Update arrow position
    this.updateArrowPosition();
  }

  private updateArrowPosition() {
    if (!this.position) return;

    const arrow = this.shadowRoot?.querySelector('.popover-arrow') as HTMLElement;
    if (!arrow) return;

    const arrowPos = getArrowPosition(
      this.position.placement,
      this.targetElement!,
      this.containerElement!,
      320 // Default width
    );

    arrow.className = `popover-arrow ${this.position.placement}`;
    arrow.style.left = `${arrowPos.left}px`;
    arrow.style.top = `${arrowPos.top}px`;
    arrow.style.transform = `rotate(${arrowPos.rotation})`;
  }

  private handleValueChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localValue = value;
  }

  private handleTypeChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localType = value;
    this.localValue = getDefaultValueForType(value as any);
  }

  private handleSuggestionClick(suggestion: Jinja2VariableValue) {
    this.localValue = suggestion;
  }

  private applyChanges() {
    if (!this.variable) return;

    const validationError = validateValue(this.localValue, this.localType as any);
    if (validationError) {
      this.showValidationMessage(validationError);
      return;
    }

    const changeEvent: VariableChangeEventV2 = {
      variable: this.variable,
      oldValue: this.currentValue,
      newValue: this.localValue,
      oldType: this.variable.type,
      newType: this.localType
    };

    this.dispatchEvent(new CustomEvent('variable-change', {
      detail: changeEvent,
      bubbles: true,
      composed: true
    }));

    this.hide();
  }

  private showValidationMessage(message: string) {
    // Show validation message in the popover
    const validationElement = this.shadowRoot?.querySelector('.validation-message') as HTMLElement;
    if (validationElement) {
      validationElement.textContent = message;
      validationElement.style.display = 'flex';

      setTimeout(() => {
        validationElement.style.display = 'none';
      }, 3000);
    }
  }

  private toggleAdvancedOptions() {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  private getQuickSuggestions() {
    if (!this.variable) return [];

    const varName = this.variable.name.toLowerCase();
    const suggestions = this.quickSuggestions[this.localType as keyof typeof this.quickSuggestions];

    if (!suggestions) return [];

    // Find matching suggestions based on variable name
    for (const [pattern, values] of Object.entries(suggestions)) {
      if (varName.includes(pattern)) {
        return values;
      }
    }

    return suggestions.default || [];
  }

  override render() {
    if (!this.variable || !this.isVisible) return null;

    const quickSuggestions = this.config.showSuggestions ? this.getQuickSuggestions() : [];
    const validationError = validateValue(this.localValue, this.localType as any);

    return html`
      <div class="popover-container ${classMap({
        visible: this.isVisible,
        animating: this.isAnimating
      })}" style=${styleMap(this.position ? {
        left: `${this.position.x}px`,
        top: `${this.position.y}px`
      } : {})}>
        <div class="popover-arrow"></div>

        <!-- Header -->
        <div class="popover-header">
          <div class="variable-info">
            <div class="variable-name">
              ${this.variable.name}
              ${this.variable.isRequired ? html`<span class="required-badge">Required</span>` : ''}
            </div>
            <div class="variable-type">${this.localType}</div>
          </div>
          <button class="close-button" @click=${this.hide} title="Close">
            ×
          </button>
        </div>

        <!-- Content -->
        <div class="popover-content">
          <!-- Type and Value -->
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Type</label>
              <v2-select
                .value=${this.localType}
                .options=${[
                  { value: 'string', label: 'Text' },
                  { value: 'number', label: 'Number' },
                  { value: 'integer', label: 'Integer' },
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'date', label: 'Date' },
                  { value: 'datetime', label: 'DateTime' },
                  { value: 'json', label: 'JSON' },
                  { value: 'uuid', label: 'UUID' },
                  { value: 'email', label: 'Email' },
                  { value: 'url', label: 'URL' },
                  { value: 'null', label: 'Null' }
                ]}
                @change=${this.handleTypeChange}
              ></v2-select>
            </div>

            <div class="form-group">
              <label class="form-label">Value</label>
              <v2-input
                type=${this.getInputType(this.localType)}
                .value=${this.formatValue(this.localValue)}
                .placeholder=${`Enter ${this.variable.name}`}
                @change=${this.handleValueChange}
              ></v2-input>
            </div>
          </div>

          <!-- Quick Suggestions -->
          ${quickSuggestions.length > 0 ? html`
            <div class="form-group">
              <label class="form-label">Quick Suggestions</label>
              <div class="quick-suggestions">
                ${quickSuggestions.map((suggestion: Jinja2VariableValue) => html`
                  <button
                    class="suggestion-chip ${classMap({
                      active: this.isValueActive(suggestion)
                    })}"
                    @click=${() => this.handleSuggestionClick(suggestion)}
                    title=${this.formatSuggestion(suggestion)}
                  >
                    ${this.formatSuggestion(suggestion)}
                  </button>
                `)}
              </div>
            </div>
          ` : ''}

          <!-- Context Information -->
          ${this.variable.context?.semanticContext ? html`
            <div class="context-info">
              <div class="context-label">Context:</div>
              <div class="context-value">${this.variable.context.semanticContext}</div>
            </div>
          ` : ''}

          <!-- Validation Message -->
          ${validationError ? html`
            <div class="validation-message">
              <span>⚠</span>
              <span>${validationError}</span>
            </div>
          ` : ''}

          <!-- Advanced Options -->
          <div class="advanced-options">
            <button class="advanced-toggle" @click=${this.toggleAdvancedOptions}>
              <span>${this.showAdvancedOptions ? '▼' : '▶'}</span>
              <span>Advanced Options</span>
            </button>
            <div class="advanced-content ${classMap({ visible: this.showAdvancedOptions })}">
              <div class="form-group">
                <label class="form-label">Description</label>
                <div>${this.variable.description || 'No description available'}</div>
              </div>
              <div class="form-group">
                <label class="form-label">Position</label>
                <div>Line ${this.variable.position.line}, Column ${this.variable.position.column}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="popover-actions">
          <button class="action-button secondary" @click=${this.hide}>
            Cancel
          </button>
          <button class="action-button primary" @click=${this.applyChanges}>
            ✓ Apply
          </button>
        </div>
      </div>
    `;
  }

  private getInputType(type: string): string {
    const typeMap: Record<string, string> = {
      email: 'email',
      url: 'url',
      number: 'number',
      integer: 'number',
      date: 'date',
      datetime: 'datetime-local'
    };
    return typeMap[type] || 'text';
  }

  private formatValue(value: Jinja2VariableValue): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private formatSuggestion(suggestion: Jinja2VariableValue): string {
    const formatted = this.formatValue(suggestion);
    return formatted.length > 15 ? formatted.substring(0, 12) + '...' : formatted;
  }

  private isValueActive(suggestion: Jinja2VariableValue): boolean {
    if (typeof this.localValue === 'number' && typeof suggestion === 'number') {
      return this.localValue === suggestion;
    }
    return String(this.localValue) === String(suggestion);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-popover': VariablePopover;
  }
}

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('jinja-input')
export class JinjaInput extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family);
    }

    .input-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .input-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 2px;
    }

    .input-label .required {
      color: var(--vscode-errorForeground);
      font-weight: 700;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-field {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s ease;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .input-field:hover:not(:disabled) {
      border-color: var(--vscode-inputOption-hoverBorder);
      background-color: var(--vscode-input-hoverBackground);
    }

    .input-field:focus:not(:disabled) {
      border-color: var(--vscode-focusBorder);
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: -2px;
      background-color: var(--vscode-input-background);
      box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder-rgb), 0.2);
    }

    .input-field:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: var(--vscode-disabledBackground);
      border-color: var(--vscode-disabledForeground);
    }

    .input-field::placeholder {
      color: var(--vscode-input-placeholderForeground);
      font-style: italic;
    }

    .input-field.error {
      border-color: var(--vscode-errorForeground);
      background-color: rgba(var(--vscode-errorForeground-rgb), 0.1);
    }

    .input-field.error:focus {
      outline-color: var(--vscode-errorForeground);
      box-shadow: 0 0 0 3px rgba(var(--vscode-errorForeground-rgb), 0.2);
    }

    .input-icon {
      position: absolute;
      right: 12px;
      color: var(--vscode-errorForeground);
      font-size: 16px;
      pointer-events: none;
      animation: shake 0.5s ease-in-out infinite alternate;
    }

    @keyframes shake {
      0% { transform: translateX(0); }
      100% { transform: translateX(1px); }
    }

    .input-helper {
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
      padding: 2px 0;
      line-height: 1.4;
    }

    .input-error {
      font-size: var(--font-size-xs);
      color: var(--vscode-errorForeground);
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background-color: rgba(var(--vscode-errorForeground-rgb), 0.1);
      border-radius: 3px;
      border-left: 3px solid var(--vscode-errorForeground);
    }

    /* Clear button */
    .clear-button {
      position: absolute;
      right: 12px;
      background: var(--vscode-button-secondaryBackground);
      border: 1px solid var(--vscode-widget-border);
      color: var(--vscode-icon-foreground);
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 3px;
      opacity: 0.8;
      transition: all 0.2s ease;
      font-size: var(--font-size-xs);
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
    }

    .clear-button:hover {
      opacity: 1;
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      transform: scale(1.1);
    }

    .clear-button:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: -2px;
    }

    .clear-button:active {
      transform: scale(0.95);
    }

    .has-value .clear-button {
      display: flex;
    }

    .has-value .input-field {
      padding-right: 40px;
    }

    /* Input types styling */
    .input-field[type="number"] {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }

    .input-field[type="password"] {
      letter-spacing: 0.5px;
    }

    /* Validation states */
    .input-field.success {
      border-color: var(--vscode-charts-green);
      background-color: rgba(var(--vscode-charts-green-rgb), 0.05);
    }

    .input-field.success:focus {
      outline-color: var(--vscode-charts-green);
      box-shadow: 0 0 0 3px rgba(var(--vscode-charts-green-rgb), 0.2);
    }

    /* Loading state */
    .input-wrapper.loading .input-field {
      background-image: linear-gradient(90deg,
        var(--vscode-input-background) 0%,
        var(--vscode-textBlockQuote-background) 50%,
        var(--vscode-input-background) 100%);
      background-size: 200% 100%;
      animation: loading 1.5s ease-in-out infinite;
    }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;

  @property({ type: String }) accessor type: 'text' | 'number' | 'email' | 'url' | 'password' | 'date' | 'time' | 'datetime-local' = 'text';
  @property({ type: String }) accessor placeholder: string = '';
  @property({ type: String }) accessor label: string = '';
  @property({ type: String }) accessor value: string = '';
  @property({ type: Boolean }) accessor disabled: boolean = false;
  @property({ type: Boolean }) accessor readonly: boolean = false;
  @property({ type: Boolean }) accessor required: boolean = false;
  @property({ type: String }) accessor error: string = '';
  @property({ type: String }) accessor helper: string = '';

  render() {
    const wrapperClasses = [
      'input-wrapper',
      this.error ? 'error' : '',
      this.value ? 'has-value' : ''
    ].filter(Boolean).join(' ');

    return html`
      <div class="input-container">
        ${this.label ? html`
          <label class="input-label">
            ${this.label}
            ${this.required ? html`<span class="required">*</span>` : ''}
          </label>
        ` : ''}

        <div class=${wrapperClasses}>
          <input
            class="input-field"
            type=${this.type}
            placeholder=${this.placeholder}
            .value=${this.value}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            ?required=${this.required}
            @input=${this.handleInput}
            @change=${this.handleChange}
            @blur=${this.handleBlur}
            @focus=${this.handleFocus}
          />

          ${this.value && !this.disabled && !this.readonly ? html`
            <button
              class="clear-button"
              @click=${this.handleClear}
              title="Clear"
            >
              ×
            </button>
          ` : ''}

          ${this.error ? html`
            <span class="input-icon">⚠</span>
          ` : ''}
        </div>

        ${this.error ? html`
          <div class="input-error">
            <span>⚠</span>
            <span>${this.error}</span>
          </div>
        ` : ''}

        ${this.helper && !this.error ? html`
          <div class="input-helper">${this.helper}</div>
        ` : ''}
      </div>
    `;
  }

  private handleInput(event: InputEvent) {
    const input = event.target as HTMLInputElement;
    const oldValue = this.value;
    this.value = input.value;

    // Only fire event if value actually changed
    if (oldValue !== this.value) {
      this.dispatchEvent(new CustomEvent('input', {
        detail: { value: this.value },
        bubbles: true,
        composed: true
      }));
    }
  }

  private handleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;

    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  private handleBlur(event: FocusEvent) {
    this.dispatchEvent(new CustomEvent('blur', {
      detail: event,
      bubbles: true,
      composed: true
    }));
  }

  private handleFocus(event: FocusEvent) {
    this.dispatchEvent(new CustomEvent('focus', {
      detail: event,
      bubbles: true,
      composed: true
    }));
  }

  private handleClear(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    this.value = '';

    this.dispatchEvent(new CustomEvent('input', {
      detail: { value: '' },
      bubbles: true,
      composed: true
    }));

    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: '' },
      bubbles: true,
      composed: true
    }));
  }

  focus() {
    const input = this.shadowRoot?.querySelector('.input-field') as HTMLInputElement;
    input?.focus();
  }

  select() {
    const input = this.shadowRoot?.querySelector('.input-field') as HTMLInputElement;
    input?.select();
  }

  setSelectionRange(start: number, end: number) {
    const input = this.shadowRoot?.querySelector('.input-field') as HTMLInputElement;
    input?.setSelectionRange(start, end);
  }
}


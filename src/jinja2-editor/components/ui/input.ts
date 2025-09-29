import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('jinja-input')
export class JinjaInput extends LitElement {
  @property({ type: String }) type: 'text' | 'number' | 'email' | 'url' | 'password' = 'text';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) required = false;
  @property({ type: String }) error = '';
  @property({ type: String }) helper = '';

  static styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family);
    }

    .input-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .input-label .required {
      color: var(--vscode-errorForeground);
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-field {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: 13px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }

    .input-field:hover:not(:disabled) {
      border-color: var(--vscode-input-border);
    }

    .input-field:focus:not(:disabled) {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .input-field:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      background-color: var(--vscode-disabledBackground);
    }

    .input-field::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .input-field.error {
      border-color: var(--vscode-errorForeground);
    }

    .input-icon {
      position: absolute;
      right: 8px;
      color: var(--vscode-errorForeground);
      font-size: 16px;
      pointer-events: none;
    }

    .input-helper {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }

    .input-error {
      font-size: 11px;
      color: var(--vscode-errorForeground);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Clear button */
    .clear-button {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      color: var(--vscode-icon-foreground);
      cursor: pointer;
      padding: 2px;
      border-radius: 2px;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .clear-button:hover {
      opacity: 1;
    }

    .clear-button:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .has-value .clear-button {
      display: block;
    }

    .has-value .input-field {
      padding-right: 28px;
    }
  `;

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
    this.value = input.value;

    this.dispatchEvent(new CustomEvent('input', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
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

  // Public methods for programmatic access
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

declare global {
  interface HTMLElementTagNameMap {
    'jinja-input': JinjaInput;
  }
}

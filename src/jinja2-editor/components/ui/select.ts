import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

@customElement('jinja-select')
export class JinjaSelect extends LitElement {
  static override styles = css`
    :host {
      display: block;
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

    .select-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .select-label {
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      margin-bottom: 2px;
    }

    .select-label .required {
      color: var(--vscode-errorForeground);
      font-weight: 700;
    }

    .select-wrapper {
      position: relative;
    }

    .select-field {
      width: 100%;
      padding: var(--spacing-md) calc(var(--spacing-lg) * 2.5) var(--spacing-md) var(--spacing-md);
      border: var(--border-width) solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm);
      background-color: var(--vscode-dropdown-background, var(--vscode-input-background));
      color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground));
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      outline: none;
      cursor: pointer;
      appearance: none;
      box-sizing: border-box;
      transition: all var(--transition-fast);
      min-height: 36px;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .select-field:hover:not(:disabled) {
      border-color: var(--vscode-inputOption-hoverBorder);
      background-color: var(--vscode-dropdown-hoverBackground, var(--vscode-input-hoverBackground));
    }

    .select-field:focus:not(:disabled) {
      border-color: var(--vscode-focusBorder);
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: -2px;
      background-color: var(--vscode-dropdown-background, var(--vscode-input-background));
      box-shadow: 0 0 0 3px rgba(var(--vscode-focusBorder-rgb), 0.2);
    }

    .select-field:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: var(--vscode-disabledBackground);
      border-color: var(--vscode-disabledForeground);
    }

    .select-field.error {
      border-color: var(--vscode-errorForeground);
      background-color: rgba(var(--vscode-errorForeground-rgb), 0.1);
    }

    .select-field.error:focus {
      outline-color: var(--vscode-errorForeground);
      box-shadow: 0 0 0 3px rgba(var(--vscode-errorForeground-rgb), 0.2);
    }

    /* Custom dropdown arrow */
    .select-arrow {
      position: absolute;
      right: var(--spacing-md);
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--vscode-icon-foreground);
      font-size: var(--font-size-sm);
      transition: all var(--transition-fast);
      background: var(--vscode-button-secondaryBackground);
      border: var(--border-width) solid var(--vscode-widget-border);
      border-radius: var(--border-radius-sm);
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .select-wrapper:hover .select-arrow:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
    }

    .select-wrapper:focus-within .select-arrow {
      background: var(--vscode-button-background);
      border-color: var(--vscode-focusBorder);
      transform: translateY(-50%) rotate(180deg);
    }

    /* Option groups */
    .optgroup {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-foreground);
      font-size: var(--font-size-sm);
      background: var(--vscode-textBlockQuote-background);
      padding: var(--spacing-xs) var(--spacing-sm);
      margin: var(--spacing-xs) 0;
      border-radius: var(--border-radius-sm);
    }

    .optgroup-option {
      padding-left: 20px;
    }

    .select-helper {
      font-size: var(--font-size-xs);
      color: var(--vscode-descriptionForeground);
      margin-top: var(--spacing-xs);
      padding: var(--spacing-xs) 0;
      line-height: var(--line-height-normal);
    }

    .select-error {
      font-size: var(--font-size-xs);
      color: var(--vscode-errorForeground);
      margin-top: var(--spacing-xs);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
      padding: var(--spacing-xs) var(--spacing-sm);
      background-color: rgba(var(--vscode-errorForeground-rgb), 0.1);
      border-radius: var(--border-radius-sm);
      border-left: 3px solid var(--vscode-errorForeground);
    }

    /* Placeholder styling */
    .select-field option:disabled {
      color: var(--vscode-input-placeholderForeground);
      font-style: italic;
    }

    .select-field option {
      padding: 8px 12px;
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
    }

    .select-field option:hover {
      background: var(--vscode-dropdown-hoverBackground);
      color: var(--vscode-dropdown-foreground);
    }

    .select-field option:selected {
      background: var(--vscode-list-focusBackground);
      color: var(--vscode-list-focusForeground);
    }

    .select-field option:disabled:hover {
      background: var(--vscode-dropdown-background);
      cursor: not-allowed;
    }

    /* Loading state */
    .select-wrapper.loading .select-field {
      background-image: linear-gradient(90deg,
        var(--vscode-dropdown-background) 0%,
        var(--vscode-textBlockQuote-background) 50%,
        var(--vscode-dropdown-background) 100%);
      background-size: 200% 100%;
      animation: loading 1.5s ease-in-out infinite;
    }

    .select-wrapper.loading .select-arrow {
      animation: spin 1s linear infinite;
    }

    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes spin {
      0% { transform: translateY(-50%) rotate(0deg); }
      100% { transform: translateY(-50%) rotate(360deg); }
    }

    /* Multi-select indicator */
    .select-field[multiple] {
      padding-right: 12px;
      min-height: 60px;
    }

    .select-field[multiple] .select-arrow {
      display: none;
    }

    /* Size variants */
    .select-field.size-small {
      padding: var(--spacing-sm) calc(var(--spacing-lg) * 2) var(--spacing-sm) var(--spacing-sm);
      min-height: 28px;
      font-size: var(--font-size-sm);
    }

    .select-field.size-large {
      padding: calc(var(--spacing-md) + var(--spacing-xs)) calc(var(--spacing-lg) * 3) calc(var(--spacing-md) + var(--spacing-xs)) calc(var(--spacing-md) + var(--spacing-xs));
      min-height: 44px;
      font-size: var(--font-size-lg);
    }

    .select-field.size-small .select-arrow {
      width: 18px;
      height: 18px;
      font-size: var(--font-size-xs);
    }

    .select-field.size-large .select-arrow {
      width: 24px;
      height: 24px;
      font-size: var(--font-size-md);
    }
  `;

  @property({ type: String }) accessor label: string = '';
  @property({ type: String }) accessor placeholder: string = 'Select an option';
  @property({ type: String }) accessor value: string = '';
  @property({ type: Boolean }) accessor disabled: boolean = false;
  @property({ type: Boolean }) accessor required: boolean = false;
  @property({ type: String }) accessor error: string = '';
  @property({ type: String }) accessor helper: string = '';
  @property({ attribute: false }) accessor options: SelectOption[] = [];

  private groupedOptions: Map<string, SelectOption[]> = new Map();

  override willUpdate() {
    this.groupOptions();
  }

  private groupOptions() {
    this.groupedOptions.clear();

    const ungrouped: SelectOption[] = [];

    this.options.forEach(option => {
      if (option.group) {
        if (!this.groupedOptions.has(option.group)) {
          this.groupedOptions.set(option.group, []);
        }
        this.groupedOptions.get(option.group)!.push(option);
      } else {
        ungrouped.push(option);
      }
    });

    if (ungrouped.length > 0) {
      this.groupedOptions.set('', ungrouped);
    }
  }

  override render() {
    const classes = [
      'select-field',
      this.error ? 'error' : ''
    ].filter(Boolean).join(' ');

    return html`
      <div class="select-container">
        ${this.label ? html`
          <label class="select-label">
            ${this.label}
            ${this.required ? html`<span class="required">*</span>` : ''}
          </label>
        ` : ''}

        <div class="select-wrapper">
          <select
            class=${classes}
            ?disabled=${this.disabled}
            ?required=${this.required}
            @change=${this.handleChange}
            @blur=${this.handleBlur}
            @focus=${this.handleFocus}
          >
            ${this.placeholder ? html`
              <option value="" disabled selected ?hidden=${!!this.value}>
                ${this.placeholder}
              </option>
            ` : ''}

            ${this.renderOptionNodes()}
          </select>

          <span class="select-arrow">▼</span>
        </div>

        ${this.error ? html`
          <div class="select-error">
            <span>⚠</span>
            <span>${this.error}</span>
          </div>
        ` : ''}

        ${this.helper && !this.error ? html`
          <div class="select-helper">${this.helper}</div>
        ` : ''}
      </div>
    `;
  }

  private renderOptionNodes() {
    const options: unknown[] = [];

    this.groupedOptions.forEach((groupOptions, group) => {
      if (group) {
        options.push(html`
          <optgroup class="optgroup" label=${group}>
            ${groupOptions.map(option => this.renderOption(option, true))}
          </optgroup>
        `);
      } else {
        groupOptions.forEach(option => {
          options.push(this.renderOption(option, false));
        });
      }
    });

    return options;
  }

  private renderOption(option: SelectOption, isGrouped: boolean) {
    const optionClasses = isGrouped ? 'optgroup-option' : '';

    return html`
      <option
        class=${optionClasses}
        value=${option.value}
        ?selected=${option.value === this.value}
        ?disabled=${option.disabled}
      >
        ${option.label}
      </option>
    `;
  }

  private handleChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.value = select.value;

    const selectedOption = this.options.find(opt => opt.value === this.value);

    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        value: this.value,
        option: selectedOption
      },
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

  override focus() {
    const select = this.shadowRoot?.querySelector('.select-field') as HTMLSelectElement;
    select?.focus();
  }

  getSelectedOption(): SelectOption | undefined {
    return this.options.find(opt => opt.value === this.value);
  }

  setOptions(newOptions: SelectOption[]) {
    this.options = [...newOptions];
  }

  addOption(option: SelectOption) {
    this.options = [...this.options, option];
  }

  removeOption(value: string) {
    this.options = this.options.filter(opt => opt.value !== value);
  }
}

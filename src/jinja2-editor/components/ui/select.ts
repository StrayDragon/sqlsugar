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
  static styles = css`
    :host {
      display: block;
      font-family: var(--vscode-font-family);
    }

    .select-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .select-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-foreground);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .select-label .required {
      color: var(--vscode-errorForeground);
    }

    .select-wrapper {
      position: relative;
    }

    .select-field {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px;
      background-color: var(--vscode-dropdown-background, var(--vscode-input-background));
      color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground));
      font-family: var(--vscode-font-family);
      font-size: 13px;
      outline: none;
      cursor: pointer;
      appearance: none;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      min-height: 32px;
    }

    .select-field:hover:not(:disabled) {
      border-color: var(--vscode-input-border);
    }

    .select-field:focus:not(:disabled) {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    .select-field:disabled {
      opacity: 0.7;
      cursor: not-allowed;
      background-color: var(--vscode-disabledBackground);
    }

    .select-field.error {
      border-color: var(--vscode-errorForeground);
    }

    /* Custom dropdown arrow */
    .select-arrow {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--vscode-icon-foreground);
      font-size: 12px;
      transition: transform 0.2s ease;
    }

    .select-wrapper:focus-within .select-arrow {
      transform: translateY(-50%) rotate(180deg);
    }

    /* Option groups */
    .optgroup {
      font-weight: bold;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .optgroup-option {
      padding-left: 16px;
    }

    .select-helper {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }

    .select-error {
      font-size: 11px;
      color: var(--vscode-errorForeground);
      margin-top: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Placeholder styling */
    .select-field option:disabled {
      color: var(--vscode-input-placeholderForeground);
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

  willUpdate() {
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

  render() {
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

  focus() {
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

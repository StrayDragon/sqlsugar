import { LitElement, html, css } from 'lit';
import { classMap } from 'lit/directives/class-map.js';
import { customElement, property, state } from 'lit/decorators.js';
import { Jinja2Variable, Jinja2VariableType, Jinja2VariableValue, HTMLInputType } from '../types.js';

@customElement('jinja-variable-input')
export class JinjaVariableInput extends LitElement {
  @property({ attribute: false }) accessor variable!: Jinja2Variable;
  @property({ attribute: false }) accessor value: Jinja2VariableValue = undefined;

  @state() accessor localValue: Jinja2VariableValue = undefined;
  @state() accessor localType: Jinja2VariableType = 'string';
  @state() accessor showQuickOptions = false;


  private quickOptions = {
    string: ['demo_string', 'sample_text', 'example_value', '', 'null'],
    number: [42, 100, 0, -1, 3.14],
    boolean: [true, false],
    date: ['2024-01-01', '2024-12-31', new Date().toISOString().split('T')[0]],
    datetime: [new Date().toISOString(), '2024-01-01T00:00:00Z'],
    json: ['{}', '[]', '{"key": "value"}', '[1, 2, 3]'],
    email: ['test@example.com', 'user@domain.com', 'admin@test.org'],
    url: ['https://example.com', 'http://localhost:8080', 'ftp://files.server.com'],
    uuid: ['00000000-0000-0000-0000-000000000000', '550e8400-e29b-41d4-a716-446655440000']
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-md);
    }

    .variable-item {
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius-md);
      padding: var(--spacing-md);
      background-color: var(--vscode-editor-background);
      transition: border-color var(--transition-normal);
    }

    .variable-item:hover {
      border-color: var(--vscode-focusBorder);
    }

    .variable-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-sm);
    }

    .variable-name {
      font-weight: var(--font-weight-semibold);
      color: var(--vscode-textLink-foreground);
      font-size: var(--font-size-md);
      font-family: var(--vscode-font-family);
    }

    .type-badge {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-medium);
      text-transform: uppercase;
    }

    .variable-description {
      color: var(--vscode-descriptionForeground);
      font-size: var(--font-size-sm);
      margin-bottom: var(--spacing-sm);
      line-height: var(--line-height-normal);
    }

    .controls {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: var(--spacing-sm);
      align-items: center;
    }

    .quick-options {
      display: flex;
      flex-wrap: wrap;
      gap: var(--spacing-xs);
      margin-top: var(--spacing-sm);
    }

    .quick-option-btn {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      padding: 4px 8px;
      border-radius: var(--border-radius-sm);
      font-size: var(--font-size-xs);
      cursor: pointer;
      transition: all var(--transition-fast);
      font-family: var(--vscode-font-family);
    }

    .quick-option-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      transform: translateY(-1px);
    }

    .quick-option-btn.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .required-indicator {
      color: var(--vscode-errorForeground);
      margin-left: 2px;
    }

    .validation-message {
      color: var(--vscode-errorForeground);
      font-size: var(--font-size-xs);
      margin-top: var(--spacing-xs);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      .controls {
        grid-template-columns: 1fr;
        gap: var(--spacing-xs);
      }

      .quick-options {
        gap: 2px;
      }

      .quick-option-btn {
        padding: 2px 6px;
        font-size: 11px;
      }
    }
  `;

  willUpdate() {
    if (this.value !== this.localValue) {
      this.localValue = this.value;
    }
    if (this.variable.type !== this.localType) {
      this.localType = this.variable.type;
    }
  }

  render() {
    const validationError = this.validateValue(this.localValue, this.localType);
    const hasError = !!validationError;

    return html`
      <div class="variable-item ${classMap({ 'has-error': hasError })}">
        <div class="variable-header">
          <span class="variable-name">
            ${this.variable.name}
            ${this.variable.isRequired ? html`<span class="required-indicator">*</span>` : ''}
          </span>
          <span class="type-badge">${this.getDisplayType(this.localType)}</span>
        </div>

        ${this.variable.description ? html`
          <div class="variable-description">${this.variable.description}</div>
        ` : ''}

        <div class="controls">
          ${this.renderTypeSelector()}
          ${this.renderValueInput()}
          ${this.renderEmptyCheckbox()}
        </div>

        ${this.renderQuickOptions()}

        ${validationError ? html`
          <div class="validation-message">
            <span>⚠</span>
            <span>${validationError}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  private renderTypeSelector() {
    const types: Array<{ value: Jinja2VariableType; label: string }> = [
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
    ];

    return html`
      <jinja-select
        .value=${this.localType}
        .options=${types.map(t => ({ value: t.value, label: t.label }))}
        @change=${this.handleTypeChange}
      ></jinja-select>
    `;
  }

  private renderValueInput() {
    if (this.localType === 'boolean') {
      return html`
        <jinja-select
          .value=${String(this.localValue)}
          .options=${[
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' }
          ]}
          @change=${this.handleBooleanChange}
        ></jinja-select>
      `;
    }

    if (this.localType === 'null') {
      return html`
        <jinja-input
          type="text"
          .value=${'null'}
          .disabled=${true}
          placeholder="Null value"
        ></jinja-input>
      `;
    }

    return html`
      <jinja-input
        type=${this.getInputType(this.localType)}
        .value=${this.formatValue(this.localValue)}
        .placeholder=${this.getPlaceholder(this.variable.name, this.localType)}
        @input=${this.handleValueChange}
      ></jinja-input>
    `;
  }

  private renderEmptyCheckbox() {
    if (this.localType === 'string') {
      return html`
        <label style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
          <input
            type="checkbox"
            ?checked=${this.localValue === ''}
            @change=${this.handleEmptyChange}
          />
          Empty
        </label>
      `;
    }
    return html`<div></div>`;
  }

  private renderQuickOptions() {
    const options = this.quickOptions[this.localType] || [];
    if (options.length === 0) return '';

    return html`
      <div class="quick-options">
        ${options.map(option => {
          const isActive = this.isValueActive(option, this.localValue, this.localType);
          return html`
            <button
              class="quick-option-btn ${classMap({ active: isActive })}"
              @click=${() => this.handleQuickOption(option)}
              title=${this.getOptionTitle(option, this.localType)}
            >
              ${this.formatOption(option, this.localType)}
            </button>
          `;
        })}
      </div>
    `;
  }

  private handleTypeChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localType = value as Jinja2VariableType;
    this.localValue = this.getDefaultValue(this.localType);
    this.emitChangeEvent();
  }

  private handleValueChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localValue = this.parseValue(value, this.localType);
    this.emitChangeEvent();
  }

  private handleBooleanChange(event: CustomEvent) {
    const { value } = event.detail;
    this.localValue = value === 'true';
    this.emitChangeEvent();
  }

  private handleEmptyChange(event: Event) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.localValue = '';
    } else {
      this.localValue = this.getDefaultValue('string');
    }
    this.emitChangeEvent();
  }

  private handleQuickOption(option: Jinja2VariableValue) {
    this.localValue = option;
    this.emitChangeEvent();
  }

  private emitChangeEvent() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        name: this.variable.name,
        value: this.localValue,
        type: this.localType
      },
      bubbles: true,
      composed: true
    }));
  }


  private getDisplayType(type: Jinja2VariableType): string {
    const typeMap: Record<Jinja2VariableType, string> = {
      string: 'text',
      number: 'number',
      integer: 'int',
      boolean: 'bool',
      date: 'date',
      time: 'time',
      datetime: 'datetime',
      json: 'json',
      uuid: 'uuid',
      email: 'email',
      url: 'url',
      null: 'null'
    };
    return typeMap[type] || type;
  }

  private getInputType(type: Jinja2VariableType): HTMLInputType {
    const inputTypeMap: Partial<Record<Jinja2VariableType, HTMLInputType>> = {
      email: 'email',
      url: 'url',
      number: 'number',
      integer: 'number'
    };
    return inputTypeMap[type] || 'text';
  }

  private getPlaceholder(name: string, type: Jinja2VariableType): string {
    return `Enter ${name} (${this.getDisplayType(type)})`;
  }

  private formatValue(value: Jinja2VariableValue): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private parseValue(value: string, type: Jinja2VariableType): Jinja2VariableValue {
    if (type === 'boolean') {
      return value === 'true';
    }
    if (type === 'number' || type === 'integer') {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    }
    if (type === 'json') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    if (value === 'null') return null;
    return value;
  }

  private getDefaultValue(type: Jinja2VariableType): Jinja2VariableValue {
    const defaults: Record<Jinja2VariableType, Jinja2VariableValue> = {
      string: 'demo_value',
      number: 42,
      integer: 42,
      boolean: true,
      date: new Date().toISOString().split('T')[0],
      time: '00:00:00',
      datetime: new Date().toISOString(),
      json: {},
      uuid: '00000000-0000-0000-0000-000000000000',
      email: 'test@example.com',
      url: 'https://example.com',
      null: null
    };
    return defaults[type] || '';
  }

  private validateValue(value: Jinja2VariableValue, type: Jinja2VariableType): string | null {
    if (this.variable.isRequired && (value == null || value === '')) {
      return `${this.variable.name} is required`;
    }

    const asString = typeof value === 'string' ? value : String(value ?? '');

    if (type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(asString)) {
      return 'Invalid email format';
    }

    if (type === 'url' && value && !/^https?:\/\/.+/.test(asString)) {
      return 'Invalid URL format';
    }

    if (type === 'uuid' && value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(asString)) {
      return 'Invalid UUID format';
    }

    return null;
  }

  private isValueActive(option: Jinja2VariableValue, value: Jinja2VariableValue, type: Jinja2VariableType): boolean {
    if (type === 'boolean') return option === value;
    if (type === 'number' || type === 'integer') return Number(option) === Number(value);
    return String(option) === String(value);
  }

  private getOptionTitle(option: Jinja2VariableValue, type: Jinja2VariableType): string {
    if (type === 'json') {
      try {
        const text = typeof option === 'string' ? option : JSON.stringify(option);
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        return String(option);
      }
    }
    return String(option);
  }

  private formatOption(option: Jinja2VariableValue, type: Jinja2VariableType): string {
    if (type === 'json') {
      const str = typeof option === 'string' ? option : JSON.stringify(option);
      return str.length > 20 ? str.substring(0, 17) + '...' : str;
    }
    if (type === 'date' || type === 'datetime') {
      return String(option).split('T')[0];
    }
    return String(option).length > 15 ? String(option).substring(0, 12) + '...' : String(option);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'jinja-variable-input': JinjaVariableInput;
  }
}


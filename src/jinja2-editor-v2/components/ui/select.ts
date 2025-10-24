/**
 * Select Component for V2 Editor
 *
 * Simple reusable select component
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('v2-select')
export class V2Select extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm, 4px);
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-sm, 12px);
      outline: none;
      box-sizing: border-box;
    }

    select:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    select:hover {
      border-color: var(--vscode-inputOption-hoverBorder);
    }

    select:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    option {
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
    }
  `;

  @property({ type: Array }) accessor options: Array<{ value: string; label: string }> = [];
  @property({ type: String }) accessor value: string = '';
  @property({ type: Boolean }) accessor disabled: boolean = false;
  @property({ type: Boolean }) accessor required: boolean = false;

  override render() {
    return html`
      <select
        .value=${this.value}
        ?disabled=${this.disabled}
        ?required=${this.required}
        @change=${this.handleChange}
      >
        ${this.options.map(option => html`
          <option value=${option.value} ?selected=${option.value === this.value}>
            ${option.label}
          </option>
        `)}
      </select>
    `;
  }

  private handleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }
}

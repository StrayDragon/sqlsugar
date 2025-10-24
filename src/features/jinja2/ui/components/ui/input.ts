/**
 * Input Component for V2 Editor
 *
 * Simple reusable input component
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('v2-input')
export class V2Input extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--border-radius-sm, 4px);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-sm, 12px);
      outline: none;
      box-sizing: border-box;
    }

    input:focus {
      border-color: var(--vscode-focusBorder);
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: -1px;
    }

    input:hover {
      border-color: var(--vscode-inputOption-hoverBorder);
    }

    input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;

  @property({ type: String }) accessor type: 'text' | 'number' | 'email' | 'url' | 'date' = 'text';
  @property({ type: String }) accessor placeholder: string = '';
  @property({ type: String }) accessor value: string = '';
  @property({ type: Boolean }) accessor disabled: boolean = false;
  @property({ type: Boolean }) accessor required: boolean = false;

  override render() {
    return html`
      <input
        type=${this.type}
        placeholder=${this.placeholder}
        .value=${this.value}
        ?disabled=${this.disabled}
        ?required=${this.required}
        @input=${this.handleInput}
        @change=${this.handleChange}
      />
    `;
  }

  private handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('input', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }

  private handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new CustomEvent('change', {
      detail: { value: this.value },
      bubbles: true,
      composed: true
    }));
  }
}

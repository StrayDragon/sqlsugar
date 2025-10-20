/**
 * Button Component for V2 Editor
 *
 * Simple button component extracted from V1 to make V2 independent
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('v2-button')
export class V2Button extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm, 8px);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius-md, 6px);
      padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-sm, 12px);
      font-weight: var(--font-weight-medium, 500);
      cursor: pointer;
      transition: all 0.15s ease;
      outline: none;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    button:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
    }

    button:focus-visible:not(:disabled) {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-border);
    }

    button.primary:hover:not(:disabled) {
      background: var(--vscode-button-hoverBackground);
    }
  `;

  @property({ type: Boolean }) accessor disabled: boolean = false;
  @property({ type: Boolean }) accessor primary: boolean = false;
  @property({ type: String }) accessor type: 'button' | 'submit' = 'button';

  override render() {
    return html`
      <button
        class=${this.primary ? 'primary' : ''}
        ?disabled=${this.disabled}
        type=${this.type}
        @click=${this.handleClick}
      >
        <slot></slot>
      </button>
    `;
  }

  private handleClick(event: MouseEvent) {
    if (!this.disabled) {
      this.dispatchEvent(new CustomEvent('click', {
        detail: event,
        bubbles: true,
        composed: true
      }));
    }
  }
}

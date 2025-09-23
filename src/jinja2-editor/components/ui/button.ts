import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('jinja-button')
export class JinjaButton extends LitElement {
  @property({ type: String }) variant: 'primary' | 'secondary' | 'danger' = 'secondary';
  @property({ type: String }) size: 'small' | 'medium' | 'large' = 'medium';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) type: 'button' | 'submit' | 'reset' = 'button';

  static styles = css`
    :host {
      display: inline-block;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: none;
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
    }

    button:hover:not(:disabled) {
      opacity: 0.8;
      transform: translateY(-1px);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Size variants */
    .size-small {
      padding: 4px 8px;
      font-size: 12px;
      min-height: 24px;
    }

    .size-medium {
      padding: 6px 12px;
      font-size: 13px;
      min-height: 32px;
    }

    .size-large {
      padding: 8px 16px;
      font-size: 14px;
      min-height: 40px;
    }

    /* Variant styles */
    .variant-primary {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }

    .variant-primary:hover:not(:disabled) {
      background-color: var(--vscode-button-hoverBackground);
    }

    .variant-secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .variant-secondary:hover:not(:disabled) {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }

    .variant-danger {
      background-color: var(--vscode-errorForeground);
      color: var(--vscode-errorBackground);
    }

    .variant-danger:hover:not(:disabled) {
      background-color: var(--vscode-errorForeground);
      opacity: 0.8;
    }

    /* Loading spinner */
    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Loading state */
    .loading {
      pointer-events: none;
    }

    .loading .button-content {
      opacity: 0.7;
    }
  `;

  render() {
    const classes = [
      `variant-${this.variant}`,
      `size-${this.size}`,
      this.disabled ? 'disabled' : '',
      this.loading ? 'loading' : ''
    ].filter(Boolean).join(' ');

    return html`
      <button
        class=${classes}
        ?disabled=${this.disabled || this.loading}
        type=${this.type}
        @click=${this.handleClick}
      >
        ${this.loading ? html`<div class="spinner"></div>` : ''}
        <span class="button-content">
          <slot></slot>
        </span>
      </button>
    `;
  }

  private handleClick(event: MouseEvent) {
    if (!this.disabled && !this.loading) {
      this.dispatchEvent(new CustomEvent('click', {
        detail: event,
        bubbles: true,
        composed: true
      }));
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'jinja-button': JinjaButton;
  }
}
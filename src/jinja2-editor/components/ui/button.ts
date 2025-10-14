import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('jinja-button')
export class JinjaButton extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
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
      --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.2);
      --transition-fast: 0.15s ease;
      --font-size-xs: 11px;
      --font-size-sm: 12px;
      --font-size-md: 13px;
      --font-size-lg: 14px;
      --font-weight-normal: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm);
      border: var(--border-width) solid transparent;
      border-radius: var(--border-radius-md);
      font-family: var(--vscode-font-family);
      font-size: var(--font-size-md);
      font-weight: var(--font-weight-medium);
      cursor: pointer;
      transition: all var(--transition-fast);
      outline: none;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      text-decoration: none;
      white-space: nowrap;
      user-select: none;
      box-shadow: var(--shadow-sm);
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    button:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: var(--shadow-sm);
    }

    button:focus-visible:not(:disabled) {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Ripple effect */
    button::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    button:hover::before {
      width: 100px;
      height: 100px;
    }

    /* Size variants */
    .size-small {
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      min-height: 28px;
      border-radius: var(--border-radius-sm);
      font-weight: var(--font-weight-medium);
    }

    .size-medium {
      padding: var(--spacing-md) var(--spacing-lg);
      font-size: var(--font-size-md);
      min-height: 36px;
      border-radius: var(--border-radius-md);
      font-weight: var(--font-weight-medium);
    }

    .size-large {
      padding: var(--spacing-lg) calc(var(--spacing-lg) * 1.5);
      font-size: var(--font-size-lg);
      min-height: 44px;
      border-radius: var(--border-radius-lg);
      font-weight: var(--font-weight-semibold);
    }

    /* Variant styles */
    .variant-primary {
      background: linear-gradient(135deg, var(--vscode-button-background) 0%, var(--vscode-badge-background) 100%);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-border);
    }

    .variant-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--vscode-button-hoverBackground) 0%, var(--vscode-badge-background) 100%);
      border-color: var(--vscode-focusBorder);
    }

    .variant-secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-color: var(--vscode-widget-border);
    }

    .variant-secondary:hover:not(:disabled) {
      background-color: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
    }

    .variant-danger {
      background: linear-gradient(135deg, var(--vscode-errorForeground) 0%, #d32f2f 100%);
      color: var(--vscode-errorBackground);
      border-color: var(--vscode-errorForeground);
    }

    .variant-danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);
      border-color: var(--vscode-errorForeground);
      box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
    }

    .variant-success {
      background: linear-gradient(135deg, var(--vscode-charts-green) 0%, #4caf50 100%);
      color: white;
      border-color: var(--vscode-charts-green);
    }

    .variant-success:hover:not(:disabled) {
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      border-color: var(--vscode-charts-green);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
    }

    /* Ghost variant */
    .variant-ghost {
      background-color: transparent;
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-widget-border);
    }

    .variant-ghost:hover:not(:disabled) {
      background-color: var(--vscode-button-secondaryBackground);
      border-color: var(--vscode-focusBorder);
    }

    /* Loading spinner */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Loading state */
    .loading {
      pointer-events: none;
      position: relative;
    }

    .loading .button-content {
      opacity: 0.8;
    }

    /* Icon button styles */
    .icon-only {
      padding: 8px;
      min-width: 36px;
      min-height: 36px;
      border-radius: 50%;
    }

    .icon-only .button-content {
      margin: 0;
    }

    /* Group styles (when multiple buttons are together) */
    :host(.button-group-first) button {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      margin-right: -1px;
    }

    :host(.button-group-middle) button {
      border-radius: 0;
      margin-right: -1px;
      margin-left: -1px;
    }

    :host(.button-group-last) button {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      margin-left: -1px;
    }

    /* Block button */
    :host(.block) {
      display: block;
      width: 100%;
    }

    :host(.block) button {
      width: 100%;
      justify-content: center;
    }
  `;

  @property({ type: String }) accessor variant: 'primary' | 'secondary' | 'danger' = 'secondary';
  @property({ type: String }) accessor size: 'small' | 'medium' | 'large' = 'medium';
  @property({ type: Boolean }) accessor disabled: boolean = false;
  @property({ type: Boolean }) accessor loading: boolean = false;
  @property({ type: String }) accessor type: 'button' | 'submit' | 'reset' = 'button';

  override render() {
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


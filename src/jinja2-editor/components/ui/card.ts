import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('jinja-card')
export class JinjaCard extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) subtitle = '';
  @property({ type: Boolean }) bordered = true;
  @property({ type: Boolean }) elevation = false;
  @property({ type: String }) size: 'small' | 'medium' | 'large' = 'medium';

  static styles = css`
    :host {
      display: block;
    }

    .card {
      background-color: var(--vscode-editor-background);
      border-radius: 8px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .card.bordered {
      border: 1px solid var(--vscode-widget-border);
    }

    .card.elevation {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .card.elevation:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    /* Size variants */
    .size-small {
      padding: 12px;
    }

    .size-medium {
      padding: 16px;
    }

    .size-large {
      padding: 24px;
    }

    .card-header {
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin: 0 0 4px 0;
      line-height: 1.4;
    }

    .card-subtitle {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      margin: 0;
      line-height: 1.4;
    }

    .card-content {
      color: var(--vscode-foreground);
      line-height: 1.5;
    }

    .card-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-widget-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    /* Actions alignment */
    .card-actions-start {
      justify-content: flex-start;
    }

    .card-actions-center {
      justify-content: center;
    }

    .card-actions-end {
      justify-content: flex-end;
    }

    .card-actions-stretch {
      justify-content: stretch;
    }

    .card-actions-stretch ::slotted(*) {
      flex: 1;
    }

    /* Loading state */
    .card.loading {
      position: relative;
      pointer-events: none;
    }

    .card.loading::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--vscode-disabledBackground);
      opacity: 0.5;
      z-index: 1;
    }

    .card.loading::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 24px;
      height: 24px;
      border: 3px solid var(--vscode-progressBar-background);
      border-top: 3px solid var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      z-index: 2;
    }

    @keyframes spin {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .size-large {
        padding: 16px;
      }

      .size-medium {
        padding: 12px;
      }

      .card-title {
        font-size: 14px;
      }

      .card-subtitle {
        font-size: 12px;
      }
    }
  `;

  render() {
    const cardClasses = [
      'card',
      this.bordered ? 'bordered' : '',
      this.elevation ? 'elevation' : '',
      `size-${this.size}`
    ].filter(Boolean).join(' ');

    return html`
      <div class=${cardClasses}>
        ${(this.title || this.subtitle) ? html`
          <div class="card-header">
            ${this.title ? html`<h3 class="card-title">${this.title}</h3>` : ''}
            ${this.subtitle ? html`<p class="card-subtitle">${this.subtitle}</p>` : ''}
          </div>
        ` : ''}

        <div class="card-content">
          <slot></slot>
        </div>

        <slot name="footer"></slot>
      </div>
    `;
  }
}

@customElement('jinja-card-actions')
export class JinjaCardActions extends LitElement {
  @property({ type: String }) alignment: 'start' | 'center' | 'end' | 'stretch' = 'end';

  static styles = css`
    :host {
      display: block;
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .actions-start {
      justify-content: flex-start;
    }

    .actions-center {
      justify-content: center;
    }

    .actions-end {
      justify-content: flex-end;
    }

    .actions-stretch {
      justify-content: stretch;
    }

    .actions-stretch ::slotted(*) {
      flex: 1;
    }
  `;

  render() {
    const classes = [
      'actions',
      `actions-${this.alignment}`
    ].join(' ');

    return html`
      <div class=${classes}>
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'jinja-card': JinjaCard;
    'jinja-card-actions': JinjaCardActions;
  }
}
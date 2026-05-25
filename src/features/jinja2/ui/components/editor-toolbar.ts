import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface ToolbarEvents {
  'action-copy': void;
  'action-submit': void;
  'action-cancel': void;
  'action-settings': void;
}

@customElement('editor-toolbar')
export class EditorToolbar extends LitElement {
  static override styles = css`
    :host { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 4px 12px; cursor: pointer; border-radius: 2px; }
    button:hover { background: var(--vscode-button-hoverBackground); }
  `;

  @property({ type: Boolean }) processing = false;
  @property({ type: String }) dialect = '';

  private emit(event: string) {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <button @click=${() => this.emit('action-copy')}>Copy SQL</button>
      <button @click=${() => this.emit('action-submit')}>Submit</button>
      <button @click=${() => this.emit('action-cancel')}>Cancel</button>
      ${this.dialect ? html`<span class="dialect-badge">${this.dialect}</span>` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-toolbar': EditorToolbar;
  }
}

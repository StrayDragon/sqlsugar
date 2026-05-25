import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export interface TemplatePanelEvents {
  'variable-click': { name: string; position: number };
  'template-change': { value: string };
}

@customElement('template-panel')
export class TemplatePanel extends LitElement {
  static override styles = css`
    :host { display: block; height: 100%; overflow: auto; }
    .template-content { white-space: pre-wrap; font-family: var(--vscode-editor-font-family, monospace); font-size: var(--vscode-editor-font-size, 13px); padding: 8px; }
  `;

  @property({ type: String }) template = '';
  @property({ type: Boolean }) readonly = true;
  @property({ type: Boolean }) highlightVariables = true;

  override render() {
    return html`<div class="template-content">${this.template}</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'template-panel': TemplatePanel;
  }
}

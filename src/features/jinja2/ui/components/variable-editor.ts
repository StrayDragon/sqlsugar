import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Jinja2Variable, Jinja2VariableValue } from '../types.js';

export interface VariableEditorEvents {
  'variable-change': { name: string; value: Jinja2VariableValue; type: string };
}

@customElement('variable-editor')
export class VariableEditor extends LitElement {
  static override styles = css`
    :host { display: block; overflow-y: auto; }
    .variable-list { padding: 8px; }
  `;

  @property({ type: Array }) variables: Jinja2Variable[] = [];
  @property({ type: Object }) values: Record<string, Jinja2VariableValue> = {};

  override render() {
    return html`
      <div class="variable-list">
        ${this.variables.map(v => html`
          <div class="variable-item">${v.name}: ${v.type}</div>
        `)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-editor': VariableEditor;
  }
}

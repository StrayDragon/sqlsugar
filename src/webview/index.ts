import { html, LitElement, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

declare global {
  interface Window {
    vscode?: { postMessage: (message: unknown) => void };
  }
}

@customElement('sqlsugar-webview-app')
export class SqlsugarWebviewApp extends LitElement {
  static override styles = css`
    :host { display: block; }
    .container { display: flex; flex-direction: column; height: 100%; }
  `;

  @state() private templateText: string = '';
  @state() private variables: Array<{ name: string; type: string; defaultValue?: unknown; description?: string; filters?: string[] }>= [];

  override connectedCallback(): void {
    super.connectedCallback();

    const g = globalThis as unknown as { sqlsugarTemplate?: unknown; sqlsugarVariables?: unknown; vscode?: { postMessage: (msg: unknown) => void } };
    const t = g.sqlsugarTemplate;
    const v = g.sqlsugarVariables;
    if (typeof t === 'string') this.templateText = t;
    if (Array.isArray(v)) this.variables = v;
    globalThis.addEventListener('message', (event: MessageEvent) => {
      const data = event.data || {};
      if (data.command === 'init') {
        this.templateText = data.template || '';
        this.variables = Array.isArray(data.variables) ? data.variables : [];
      }
    });
  }

  private handleSubmit(ev: CustomEvent<{ values: Record<string, unknown> }>) {
    const g = globalThis as unknown as { vscode?: { postMessage: (msg: unknown) => void } };
    g.vscode?.postMessage({ command: 'submit', values: ev.detail.values });
  }

  override render() {
    return html`
      <div class="container">
        <jinja2-editor
          .template=${this.templateText}
          .variables=${this.variables}
          @template-render=${(e: CustomEvent) => this.handleSubmit(e)}
        ></jinja2-editor>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sqlsugar-webview-app': SqlsugarWebviewApp;
  }
}



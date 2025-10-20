import { html, LitElement, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

export type Jinja2Variable = {
  name: string;
  type: 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'uuid' | 'email' | 'url' | 'null';
  description?: string;
  defaultValue?: unknown;
  filters?: string[];
  isRequired?: boolean;
};

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
    .deprecated-message {
      padding: 20px;
      text-align: center;
      color: var(--vscode-editor-warningForeground);
      background: var(--vscode-editor-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: 4px;
      margin: 20px;
    }
  `;

  @state() private templateText: string = '';
  @state() private variables: Jinja2Variable[] = [];

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

        // Transform variables to match the expected interface
        this.variables = Array.isArray(data.variables)
          ? data.variables.map((v: Record<string, unknown>) => ({
              ...v,
              isRequired: v.required || v.isRequired, // Map `required` to `isRequired`
              required: undefined, // Remove the processor-specific field
            }))
          : [];

        // Force re-rendering
        this.requestUpdate();
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
        <div class="deprecated-message">
          <h3>⚠️ V1 WebView App 已弃用</h3>
          <p>此 WebView App 已被 Jinja2 Editor V2 替代。</p>
          <p>请使用 V2 Editor 以获得更好的体验。</p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sqlsugar-webview-app': SqlsugarWebviewApp;
  }
}



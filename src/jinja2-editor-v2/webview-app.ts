import { html, LitElement, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Jinja2Variable } from './types.js';

declare global {
  interface Window {
    vscode?: { postMessage: (message: unknown) => void };
  }
}

@customElement('sqlsugar-webview-v2-app')
export class SqlsugarWebviewV2App extends LitElement {
  static override styles = css`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--vscode-editor-background);
    }
    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  `;

  @state() accessor templateText: string = '';
  @state() accessor variables: Jinja2Variable[] = [];
  @state() accessor config: any = null;

  override connectedCallback(): void {
    super.connectedCallback();

    // Listen for messages from VS Code
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

        // Store V2 editor configuration if provided
        if (data.config) {
          this.config = data.config;

          // 发送日志等级信息到编辑器组件
          if (this.config.logLevel) {
            console.log(`[WebView App] Log level set to: ${this.config.logLevel}`);
          }
        }

        // Force re-rendering
        this.requestUpdate();
      }
    });
  }

  private handleSubmit(ev: CustomEvent) {
    const g = globalThis as unknown as { vscode?: { postMessage: (msg: unknown) => void } };
    g.vscode?.postMessage({
      command: 'submit',
      values: ev.detail.values,
      template: ev.detail.template,
      result: ev.detail.result
    });
  }

  private handleFallbackToV1() {
    const g = globalThis as unknown as { vscode?: { postMessage: (msg: unknown) => void } };
    g.vscode?.postMessage({
      command: 'fallbackToV1',
      template: this.templateText,
      variables: this.variables
    });
  }

  override render() {
    return html`
      <div class="container">
        <jinja2-editor-v2
          .template=${this.templateText}
          .variables=${this.variables}
          .config=${this.config}
          .title="Jinja2 V2 Template Editor"
          @template-submit=${this.handleSubmit}
          @template-error=${() => this.handleFallbackToV1()}
        ></jinja2-editor-v2>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sqlsugar-webview-v2-app': SqlsugarWebviewV2App;
  }
}

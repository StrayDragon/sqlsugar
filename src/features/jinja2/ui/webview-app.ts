import { html, LitElement, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Jinja2Variable } from './types.js';
import type { CompleteTemplatedSqlEditorConfig } from './types/config.js';
import type { VscodeWebviewMessage } from './types/external-libraries.js';

declare global {
  interface Window {
    vscode?: {
      postMessage: (message: VscodeWebviewMessage) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

@customElement('sqlsugar-templated-sql-app')
export class TemplatedSqlWebviewApp extends LitElement {
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
  @state() accessor config: CompleteTemplatedSqlEditorConfig | null = null;

  override connectedCallback(): void {
    super.connectedCallback();


    globalThis.addEventListener('message', (event: MessageEvent) => {
      const data = event.data || {};

      if (data.command === 'init') {
        this.templateText = data.template || '';


        this.variables = Array.isArray(data.variables)
          ? data.variables.map((v: Record<string, unknown>) => ({
              ...v,
              isRequired: v.required || v.isRequired,
              required: undefined,
            }))
          : [];


        if (data.config) {
          this.config = data.config;

          }


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

  private handleError(ev: CustomEvent) {
    const g = globalThis as unknown as { vscode?: { postMessage: (msg: unknown) => void } };
    g.vscode?.postMessage({
      command: 'error',
      error: ev.detail.error,
      template: this.templateText,
      variables: this.variables
    });
  }

  override render() {
    return html`
      <div class="container">
        <templated-sql-editor
          .template=${this.templateText}
          .variables=${this.variables}
          .config=${this.config}
          .title="Templated SQL Editor"
          @template-submit=${this.handleSubmit}
          @template-error=${this.handleError}
        ></templated-sql-editor>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sqlsugar-templated-sql-app': TemplatedSqlWebviewApp;
  }
}

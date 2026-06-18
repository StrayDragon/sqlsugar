import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './analyzer-selector.js';
import type { AnalyzerOption } from './analyzer-selector.js';

export interface ToolbarEvents {
  'action-copy': void;
  'action-submit': void;
  'action-cancel': void;
  'action-settings': void;
  'analyzer-selection-change': {
    mode: 'auto' | 'manual';
    selectedAnalyzers: string[];
  };
}

@customElement('editor-toolbar')
export class EditorToolbar extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 4px 12px;
      cursor: pointer;
      border-radius: 2px;
      font-size: 12px;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .dialect-badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 2px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 11px;
    }
  `;

  @property({ type: Boolean }) processing = false;
  @property({ type: String }) dialect = '';
  @property({ type: Array }) analyzerOptions: AnalyzerOption[] = [];
  @property({ type: String }) analyzerMode: 'auto' | 'manual' = 'auto';
  @property({ type: Array }) selectedAnalyzers: string[] = ['jinja2'];

  private emit(event: string) {
    this.dispatchEvent(new CustomEvent(event, { bubbles: true, composed: true }));
  }

  override render() {
    return html`
      <div class="toolbar-left">
        <analyzer-selector
          .options=${this.analyzerOptions}
          .mode=${this.analyzerMode}
          .selectedAnalyzers=${this.selectedAnalyzers}
          .disabled=${this.processing}
        ></analyzer-selector>
      </div>

      <div class="toolbar-right">
        ${this.dialect
          ? html`<span class="dialect-badge">${this.dialect}</span>`
          : ''}
        <button
          @click=${() => this.emit('action-copy')}
          ?disabled=${this.processing}
        >
          Copy SQL
        </button>
        <button
          @click=${() => this.emit('action-submit')}
          ?disabled=${this.processing}
        >
          Submit
        </button>
        <button
          @click=${() => this.emit('action-cancel')}
          ?disabled=${this.processing}
        >
          Cancel
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'editor-toolbar': EditorToolbar;
  }
}

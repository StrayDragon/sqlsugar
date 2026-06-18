/**
 * Analyzer Selector Component
 *
 * Dropdown component for selecting which parameter analyzers to use.
 * Supports auto-detect mode and manual multi-select mode.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { ParamStyleType } from '../../analyzers/types.js';

/**
 * Analyzer option for the selector
 */
export interface AnalyzerOption {
  /** Unique analyzer name */
  name: string;
  /** Display label */
  label: string;
  /** Parameter style type */
  paramStyle: ParamStyleType;
  /** Default priority */
  priority: number;
}

/**
 * Default analyzer options
 */
export const DEFAULT_ANALYZER_OPTIONS: AnalyzerOption[] = [
  { name: 'jinja2', label: 'Jinja2', paramStyle: 'jinja2', priority: 5 },
  { name: 'named', label: 'Named (:param)', paramStyle: 'named', priority: 10 },
  { name: 'numeric', label: 'Numeric (:1)', paramStyle: 'numeric', priority: 20 },
  { name: 'pyformat', label: 'Pyformat (%(param)s)', paramStyle: 'pyformat', priority: 30 },
  { name: 'asyncpg', label: 'Asyncpg ($1)', paramStyle: 'asyncpg', priority: 40 },
];

/**
 * Events emitted by the analyzer selector
 */
export interface AnalyzerSelectorEvents {
  'analyzer-selection-change': {
    mode: 'auto' | 'manual';
    selectedAnalyzers: string[];
  };
}

@customElement('analyzer-selector')
export class AnalyzerSelector extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      position: relative;
      font-size: 12px;
    }

    .selector-trigger {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: 2px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      cursor: pointer;
      font-size: 12px;
      line-height: 18px;
      white-space: nowrap;
    }

    .selector-trigger:hover {
      background: var(--vscode-input-background);
      border-color: var(--vscode-input-border);
    }

    .selector-trigger .mode-label {
      opacity: 0.7;
    }

    .selector-trigger .count-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 8px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      font-size: 10px;
      font-weight: 500;
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 200px;
      background: var(--vscode-dropdown-background);
      border: 1px solid var(--vscode-dropdown-border);
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex;
      gap: 4px;
      padding: 6px 8px;
      border-bottom: 1px solid var(--vscode-dropdown-border);
    }

    .mode-button {
      flex: 1;
      padding: 4px 8px;
      border: none;
      border-radius: 2px;
      background: transparent;
      color: var(--vscode-foreground);
      cursor: pointer;
      font-size: 11px;
      opacity: 0.7;
    }

    .mode-button.active {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      opacity: 1;
    }

    .mode-button:hover:not(.active) {
      background: var(--vscode-list-hoverBackground);
    }

    .analyzer-list {
      padding: 4px 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .analyzer-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      cursor: pointer;
      user-select: none;
    }

    .analyzer-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .analyzer-item input[type="checkbox"] {
      margin: 0;
      cursor: pointer;
    }

    .analyzer-item label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      flex: 1;
    }

    .analyzer-item .style-tag {
      font-size: 10px;
      opacity: 0.5;
      color: var(--vscode-descriptionForeground);
    }

    .analyzer-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .auto-hint {
      padding: 6px 12px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
  `;

  @property({ type: Array })
  accessor options: AnalyzerOption[] = DEFAULT_ANALYZER_OPTIONS;

  @property({ type: String })
  accessor mode: 'auto' | 'manual' = 'auto';

  @property({ type: Array })
  accessor selectedAnalyzers: string[] = ['jinja2'];

  @property({ type: Boolean })
  accessor disabled = false;

  @state()
  accessor isOpen = false;

  private handleClickOutside = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) {
      this.isOpen = false;
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleClickOutside);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleClickOutside);
  }

  private toggleDropdown() {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
  }

  private setMode(mode: 'auto' | 'manual') {
    this.mode = mode;
    this.emitChange();
  }

  private toggleAnalyzer(name: string) {
    if (this.mode === 'auto') return;

    const index = this.selectedAnalyzers.indexOf(name);
    if (index >= 0) {

      if (this.selectedAnalyzers.length <= 1) return;
      this.selectedAnalyzers = this.selectedAnalyzers.filter((n) => n !== name);
    } else {
      this.selectedAnalyzers = [...this.selectedAnalyzers, name];
    }
    this.emitChange();
  }

  private emitChange() {
    this.dispatchEvent(
      new CustomEvent('analyzer-selection-change', {
        detail: {
          mode: this.mode,
          selectedAnalyzers: this.selectedAnalyzers,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private getDisplayText(): string {
    if (this.mode === 'auto') {
      return 'Auto';
    }
    return `${this.selectedAnalyzers.length} selected`;
  }

  override render() {
    return html`
      <div class="selector-trigger" @click=${this.toggleDropdown}>
        <span class="mode-label">Analyzers:</span>
        <span>${this.getDisplayText()}</span>
        ${this.mode === 'manual'
          ? html`<span class="count-badge">${this.selectedAnalyzers.length}</span>`
          : ''}
      </div>

      ${this.isOpen
        ? html`
            <div class="dropdown">
              <div class="dropdown-header">
                <button
                  class="mode-button ${this.mode === 'auto' ? 'active' : ''}"
                  @click=${() => this.setMode('auto')}
                >
                  Auto
                </button>
                <button
                  class="mode-button ${this.mode === 'manual' ? 'active' : ''}"
                  @click=${() => this.setMode('manual')}
                >
                  Manual
                </button>
              </div>

              ${this.mode === 'auto'
                ? html`<div class="auto-hint">
                    Analyzers will be auto-detected based on SQL content.
                  </div>`
                : html`
                    <div class="analyzer-list">
                      ${this.options.map(
                        (option) => html`
                          <div class="analyzer-item">
                            <input
                              type="checkbox"
                              .checked=${this.selectedAnalyzers.includes(option.name)}
                              @change=${() => this.toggleAnalyzer(option.name)}
                            />
                            <label>${option.label}</label>
                          </div>
                        `
                      )}
                    </div>
                  `}
            </div>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'analyzer-selector': AnalyzerSelector;
  }
}

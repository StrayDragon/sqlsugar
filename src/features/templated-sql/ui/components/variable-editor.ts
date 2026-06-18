/**
 * Variable Editor Component
 *
 * Unified editor for Jinja2 variables and SQL parameter placeholders.
 * Displays parameters with subtle type indicators.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TemplateVariable, TemplateVariableValue } from '../types.js';
import type { ExtractedParameter, ParamStyleType } from '../../analyzers/types.js';

/**
 * Unified variable info for display
 */
export interface UnifiedVariable {
  /** Variable name */
  name: string;
  /** Variable type (inferred) */
  type: string;
  /** Source type: jinja2 or parameter style */
  sourceType: 'jinja2' | ParamStyleType;
  /** Default value */
  defaultValue?: TemplateVariableValue;
  /** Whether this is required */
  isRequired?: boolean;
  /** Current value */
  value?: TemplateVariableValue;
}

/**
 * Type colors for subtle visual identification
 */
const TYPE_COLORS: Record<string, string> = {
  jinja2: 'var(--vscode-charts-blue, #569cd6)',
  named: 'var(--vscode-charts-orange, #ce9178)',
  numeric: 'var(--vscode-charts-green, #6a9955)',
  pyformat: 'var(--vscode-charts-purple, #c586c0)',
  asyncpg: 'var(--vscode-charts-teal, #4ec9b0)',
};

/**
 * Convert TemplateVariable to UnifiedVariable
 */
function toUnifiedVariable(v: TemplateVariable): UnifiedVariable {
  return {
    name: v.name,
    type: v.type,
    sourceType: 'jinja2',
    defaultValue: v.defaultValue,
    isRequired: v.isRequired,
  };
}

/**
 * Convert ExtractedParameter to UnifiedVariable
 */
function parameterToUnified(p: ExtractedParameter): UnifiedVariable {
  return {
    name: p.name,
    type: 'parameter',
    sourceType: p.type,
  };
}

export interface VariableEditorEvents {
  'variable-change': { name: string; value: TemplateVariableValue; type: string };
}

@customElement('variable-editor')
export class VariableEditor extends LitElement {
  static override styles = css`
    :host {
      display: block;
      overflow-y: auto;
    }

    .variable-list {
      padding: 8px;
    }

    .variable-group {
      margin-bottom: 12px;
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .group-header .group-icon {
      font-size: 12px;
      opacity: 0.7;
    }

    .variable-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.1s;
    }

    .variable-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .variable-item .var-name {
      flex: 1;
      font-size: 13px;
      color: var(--vscode-foreground);
      font-family: var(--vscode-editor-font-family, monospace);
    }

    .variable-item .var-type-tag {
      font-size: 10px;
      opacity: 0.6;
      color: var(--vscode-descriptionForeground);
      padding: 1px 6px;
      border-radius: 3px;
      background: var(--vscode-badge-background);
    }

    .variable-item .var-value-preview {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .variable-item .var-required {
      color: var(--vscode-errorForeground);
      font-size: 10px;
      font-weight: 500;
    }

    .empty-state {
      padding: 16px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }
  `;

  @property({ type: Array })
  accessor variables: TemplateVariable[] = [];

  @property({ type: Array })
  accessor parameters: ExtractedParameter[] = [];

  @property({ type: Object })
  accessor values: Record<string, TemplateVariableValue> = {};

  @property({ type: Boolean })
  accessor groupBySource = true;

  @state()
  accessor selectedVariable: string | null = null;

  private getUnifiedVariables(): UnifiedVariable[] {
    const jinjaVars = this.variables.map(toUnifiedVariable);
    const paramVars = this.parameters
      .filter((p) => p.type !== 'jinja2')
      .map(parameterToUnified);

    return [...jinjaVars, ...paramVars];
  }

  private groupBySourceType(vars: UnifiedVariable[]): Map<string, UnifiedVariable[]> {
    const groups = new Map<string, UnifiedVariable[]>();

    for (const v of vars) {
      const key = v.sourceType;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(v);
    }

    return groups;
  }

  private handleVariableClick(name: string) {
    this.selectedVariable = name;
    this.dispatchEvent(
      new CustomEvent('variable-select', {
        detail: { name },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderTypeTag(sourceType: string) {
    const color = TYPE_COLORS[sourceType] || 'var(--vscode-foreground)';
    return html`
      <span
        class="var-type-tag"
        style="color: ${color}; opacity: 0.6;"
      >
        ${sourceType}
      </span>
    `;
  }

  private renderVariableItem(variable: UnifiedVariable) {
    const value = this.values[variable.name];
    const valuePreview = value !== undefined ? String(value) : variable.defaultValue;

    return html`
      <div
        class="variable-item ${this.selectedVariable === variable.name ? 'selected' : ''}"
        @click=${() => this.handleVariableClick(variable.name)}
      >
        <span class="var-name">${variable.name}</span>
        ${this.renderTypeTag(variable.sourceType)}
        ${variable.isRequired ? html`<span class="var-required">*</span>` : ''}
        ${valuePreview !== undefined
          ? html`<span class="var-value-preview">${valuePreview}</span>`
          : ''}
      </div>
    `;
  }

  private renderGrouped() {
    const unified = this.getUnifiedVariables();
    const groups = this.groupBySourceType(unified);

    if (unified.length === 0) {
      return html`<div class="empty-state">No variables or parameters found</div>`;
    }

    return html`
      ${Array.from(groups.entries()).map(
        ([sourceType, vars]) => html`
          <div class="variable-group">
            <div class="group-header">
              ${this.renderTypeTag(sourceType)}
              <span>${vars.length} ${vars.length === 1 ? 'item' : 'items'}</span>
            </div>
            ${vars.map((v) => this.renderVariableItem(v))}
          </div>
        `
      )}
    `;
  }

  private renderFlat() {
    const unified = this.getUnifiedVariables();

    if (unified.length === 0) {
      return html`<div class="empty-state">No variables or parameters found</div>`;
    }

    return html`
      <div class="variable-list">
        ${unified.map((v) => this.renderVariableItem(v))}
      </div>
    `;
  }

  override render() {
    return html`
      <div class="variable-list">
        ${this.groupBySource ? this.renderGrouped() : this.renderFlat()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'variable-editor': VariableEditor;
  }
}

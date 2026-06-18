/**
 * Template Highlighter for Templated SQL Editor
 *
 * Provides Jinja2 template syntax highlighting with SQL sub-language support
 * while maintaining clickable variable functionality.
 *
 * Parameter placeholder highlighting strategy:
 *   Placeholders ($1, :param, %(name)s, :1) are tokenized in raw text BEFORE
 *   highlight.js syntax highlighting, because highlight.js splits them into
 *   multiple <span> tags (e.g., $<span class="hljs-number">1</span>) making
 *   post-hoc regex matching impossible. Tokens are restored after highlighting.
 */

import type { EnhancedVariable } from '../types.js';
import type { Jinja2VariableValue } from '../types.js';
import type { HighlightJs } from '../types/external-libraries.js';

export interface TemplateVariable {
  name: string;
  type: string;
  position: { start: number; end: number; line: number; column: number };
  isRequired: boolean;
  value?: Jinja2VariableValue;
}

export interface TemplateHighlightResult {
  html: string;
  variables: TemplateVariable[];
  cssClasses: string;
}

export interface TemplateHighlighterConfig {
  theme: string;
  fontSize: number;
  showLineNumbers: boolean;
  highlightStyle: 'background' | 'border' | 'underline';
  highlightSQL: boolean;
}

/**
 * Template Highlighter with Jinja2 and SQL syntax support
 */
export class TemplateHighlighter {
  private config: TemplateHighlighterConfig;
  private static readonly THEMES = {
    'vscode-dark': 'vs2015',
    'vscode-light': 'vs',
    'github-dark': 'github-dark',
    'github-light': 'github',
    'monokai': 'monokai',
    'solarized-dark': 'solarized-dark',
    'solarized-light': 'solarized-light',
    'dracula': 'dracula',
    'one-dark': 'atom-one-dark'
  };

  constructor(config: Partial<TemplateHighlighterConfig> = {}) {
    this.config = {
      theme: 'vscode-dark',
      fontSize: 14,
      showLineNumbers: true,
      highlightStyle: 'background',
      highlightSQL: true,
      ...config
    };
  }

  /**
   * Highlights Jinja2 template with SQL syntax highlighting
   */
  highlightTemplate(
    template: string,
    variables: EnhancedVariable[] = [],
    values: Record<string, Jinja2VariableValue> = {}
  ): TemplateHighlightResult {
    if (!template) {
      return {
        html: '',
        variables: [],
        cssClasses: this.getCSSClasses()
      };
    }

    try {
      const highlighted = this.highlightTemplateWithSQL(template, variables, values);

      return {
        html: `<div class="highlighted-template">${highlighted}</div>`,
        variables: [],
        cssClasses: this.getCSSClasses()
      };
    } catch (error) {
      console.warn('Template highlighting failed, using fallback:', error);
      return this.fallbackHighlight(template);
    }
  }

  /**
   * Advanced template highlighting that combines highlight.js syntax
   * highlighting with custom variable/param highlighting for clickable elements.
   *
   * Phases:
   *   1. Tokenize param placeholders in raw text (before highlight.js)
   *   2. SQL syntax highlight via highlight.js
   *   3. Restore param placeholder tokens to highlighted spans
   *   4. Highlight Jinja2 {{ variables }} with clickable spans
   *   5. Highlight variables in control structures
   */
  private highlightTemplateWithSQL(
    template: string,
    variables: EnhancedVariable[] = [],
    values: Record<string, Jinja2VariableValue> = {}
  ): string {
    try {
      // Phase 1: Tokenize parameter placeholders in raw text before highlight.js
      const { text: tokenizedText, tokenMap } = this.tokenizeParamPlaceholders(template);

      // Phase 2: Run highlight.js SQL syntax highlighting on tokenized text
      const hljsInstance = (globalThis as typeof globalThis & { hljs: HighlightJs }).hljs;
      const highlighted = hljsInstance.highlight(tokenizedText, {
        language: 'sql',
        ignoreIllegals: true,
      });

      let result = highlighted.value;

      // Phase 3: Restore parameter placeholder tokens to highlighted spans
      result = this.restoreParamTokens(result, tokenMap);

      // Phase 4: Highlight Jinja2 {{ variables }} with clickable spans
      variables.forEach((variable) => {
        const varPattern = new RegExp(
          `{{\\s*${this.escapeRegex(variable.name)}\\s*}}`,
          'g'
        );

        result = result.replace(varPattern, (match: string) => {
          const valueDisplay = this.formatValueForDisplay(
            values[variable.name]
          );
          const variableHTML = `<span class="template-variable variable-highlight" data-variable="${variable.name}" data-type="${variable.type}" title="Variable: ${variable.name} (${variable.type}) - Click to edit">${match}</span>`;
          const valueHTML = valueDisplay
            ? `<span class="variable-value-display">${valueDisplay}</span>`
            : '';
          return variableHTML + valueHTML;
        });
      });

      // Phase 5: Highlight variables in Jinja2 control structures
      result = this.highlightVariablesInControlStructures(result, variables);

      return result;
    } catch (error) {
      console.warn('Template highlighting failed:', error);
      return this.escapeHtml(template);
    }
  }

  /**
   * Tokenize all parameter placeholder patterns in raw template text
   * so they survive highlight.js syntax highlighting intact.
   *
   * Replacement order matters — most specific patterns first:
   *   1. Pyformat %(name)s
   *   2. Asyncpg $1, $2
   *   3. Numeric :1, :2 (before generic named to avoid conflict)
   *   4. Named :param (last, excluded by earlier patterns)
   *
   * Each is skipped if inside a Jinja2 expression ({{ }} or {% %}).
   */
  private tokenizeParamPlaceholders(rawText: string): {
    text: string;
    tokenMap: Map<string, string>;
  } {
    const tokenMap = new Map<string, string>();
    let tokenCounter = 0;
    let text = rawText;

    const nextToken = () => {
      const token = `__SQLSUGAR_PARAM_${tokenCounter}__`;
      tokenCounter++;
      return token;
    };

    // --- Pyformat: %(name)s ---
    text = text.replace(/%\(([\w]+)\)s/g, (match, paramName) => {
      if (this.isInsideJinja2Expression(text, match)) return match;
      const token = nextToken();
      const html = `<span class="variable-highlight param-highlight param-pyformat" data-variable="${paramName}" data-type="pyformat" data-param-style="pyformat" title="Pyformat: ${match} - Click to edit">${match}</span>`;
      tokenMap.set(token, html);
      return token;
    });

    // --- Asyncpg: $1, $2, ... ---
    text = text.replace(/\$(\d+)\b/g, (match, index) => {
      if (this.isInsideJinja2Expression(text, match)) return match;
      const token = nextToken();
      const html = `<span class="variable-highlight param-highlight param-asyncpg" data-variable="${index}" data-type="asyncpg" data-param-style="asyncpg" title="Asyncpg: ${match} - Click to edit">${match}</span>`;
      tokenMap.set(token, html);
      return token;
    });

    // --- Numeric: :1, :2 (Oracle) ---
    text = text.replace(/(?<!:):(\d+)\b/g, (match, index) => {
      if (this.isInsideJinja2Expression(text, match)) return match;
      const token = nextToken();
      const html = `<span class="variable-highlight param-highlight param-numeric" data-variable="${index}" data-type="numeric" data-param-style="numeric" title="Numeric: ${match} - Click to edit">${match}</span>`;
      tokenMap.set(token, html);
      return token;
    });

    // --- Named: :param (not ::escaped, not inside {{ }} or {% %}) ---
    const NAMED_REGEX = /(?<![\w:]):([a-zA-Z_]\w*)\b(?!\s*[}%])/g;
    text = text.replace(NAMED_REGEX, (match, paramName) => {
      if (this.isInsideJinja2Expression(text, match)) return match;
      const token = nextToken();
      const html = `<span class="variable-highlight param-highlight param-named" data-variable="${paramName}" data-type="named" data-param-style="named" title="Named: :${paramName} - Click to edit">${match}</span>`;
      tokenMap.set(token, html);
      return token;
    });

    return { text, tokenMap };
  }

  /**
   * Check whether a position in the template string is inside a Jinja2
   * expression ({{ }}) or control block ({% %}), where parameter
   * placeholder highlighting should not apply.
   */
  private isInsideJinja2Expression(template: string, match: string): boolean {
    const idx = template.indexOf(match);
    if (idx === -1) return false;
    const before = template.substring(0, idx);
    const openExpr = (before.match(/\{\{/g) || []).length;
    const closeExpr = (before.match(/\}\}/g) || []).length;
    const openBlock = (before.match(/\{%/g) || []).length;
    const closeBlock = (before.match(/%\}/g) || []).length;
    return openExpr > closeExpr || openBlock > closeBlock;
  }

  /**
   * Restore parameter placeholder tokens to their highlighted span HTML
   * after highlight.js syntax highlighting has completed.
   */
  private restoreParamTokens(
    highlightedHTML: string,
    tokenMap: Map<string, string>
  ): string {
    let result = highlightedHTML;
    for (const [token, replacementHTML] of tokenMap) {
      result = result.replace(token, replacementHTML);
    }
    return result;
  }

  /**
   * Highlights variables in Jinja2 control structures within highlighted HTML
   */
  private highlightVariablesInControlStructures(
    highlightedHTML: string,
    variables: EnhancedVariable[]
  ): string {
    let result = highlightedHTML;

    result = result.replace(/{%\s*if\s+([^%]+)\s*%}/g, (match: string, condition: string) => {
      let highlightedCondition = condition;

      variables.forEach(variable => {
        const regex = new RegExp(`\\b${this.escapeRegex(variable.name)}\\b`, 'g');
        highlightedCondition = highlightedCondition.replace(regex,
          `<span class="template-variable variable-highlight" data-variable="${variable.name}" data-type="${variable.type}">${variable.name}</span>`);
      });

      return `{% if ${highlightedCondition} %}`;
    });

    result = result.replace(/{%\s*for\s+\w+\s+in\s+\w+\s*%}/g, (match: string) => {
      let highlightedMatch = match;

      variables.forEach(variable => {
        const regex = new RegExp(`\\b${this.escapeRegex(variable.name)}\\b`, 'g');
        highlightedMatch = highlightedMatch.replace(regex,
          `<span class="template-variable variable-highlight" data-variable="${variable.name}" data-type="${variable.type}">${variable.name}</span>`);
      });

      return highlightedMatch;
    });

    return result;
  }

  /**
   * Formats value for display in variable highlighting
   */
  private formatValueForDisplay(value: Jinja2VariableValue): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Fallback highlighting when main highlighting fails
   */
  private fallbackHighlight(template: string): TemplateHighlightResult {
    return {
      html: this.escapeHtml(template),
      variables: [],
      cssClasses: this.getCSSClasses()
    };
  }

  /**
   * Escapes HTML characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Escapes regex special characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Gets CSS classes for the current theme
   */
  private getCSSClasses(): string {
    const themeName = this.mapThemeName(this.config.theme);
    return `hljs template-theme-${themeName} template-highlighter highlight-style-${this.config.highlightStyle}`;
  }

  /**
   * Maps internal theme names to highlight.js theme names
   */
  private mapThemeName(theme: string): string {
    return TemplateHighlighter.THEMES[theme as keyof typeof TemplateHighlighter.THEMES] || 'vs2015';
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<TemplateHighlighterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): TemplateHighlighterConfig {
    return { ...this.config };
  }
}

export default TemplateHighlighter;

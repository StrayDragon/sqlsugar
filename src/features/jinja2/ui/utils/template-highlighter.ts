/**
 * Template Highlighter for V2 Editor
 *
 * Provides Jinja2 template syntax highlighting with SQL sub-language support
 * while maintaining clickable variable functionality
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
   * Simple approach that preserves existing variable detection functionality
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
   * Advanced template highlighting that combines highlight.js syntax highlighting
   * with our custom variable highlighting for clickable elements
   */
  private highlightTemplateWithSQL(
    template: string,
    variables: EnhancedVariable[] = [],
    values: Record<string, Jinja2VariableValue> = {}
  ): string {
    try {

      const hljsInstance = (globalThis as typeof globalThis & { hljs: HighlightJs }).hljs;
      const highlighted = hljsInstance.highlight(template, { language: 'sql', ignoreIllegals: true });


      let result = highlighted.value;

      variables.forEach(variable => {

        const varPattern = new RegExp(`{{\\s*${this.escapeRegex(variable.name)}\\s*}}`, 'g');


        result = result.replace(varPattern, (match: string) => {
          const valueDisplay = this.formatValueForDisplay(values[variable.name]);
          const variableHTML = `<span class="template-variable variable-highlight" data-variable="${variable.name}" data-type="${variable.type}" title="Variable: ${variable.name} (${variable.type}) - Click to edit">${match}</span>`;
          const valueHTML = valueDisplay ? `<span class="variable-value-display">${valueDisplay}</span>` : '';
          return variableHTML + valueHTML;
        });
      });


      result = this.highlightVariablesInControlStructures(result, variables);

      // Highlight parameter placeholders (:param, $1, %(name)s, :1)
      result = this.highlightParameterPlaceholders(result);

      return result;
    } catch (error) {
      console.warn('Template highlighting failed:', error);
      return this.escapeHtml(template);
    }
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
   * Highlights parameter placeholders in SQL
   * Supports: :param (named), $1 (asyncpg), %(name)s (pyformat), :1 (numeric)
   */
  private highlightParameterPlaceholders(html: string): string {
    let result = html;

    // Named parameters :param (but not ::escaped or :1 numeric)
    // Match :word but not inside already highlighted spans or Jinja2 expressions
    result = result.replace(/(?<![:\w]):([a-zA-Z_]\w*)\b(?!\s*[}%])/g, (match, paramName) => {
      // Skip if inside a span (already highlighted)
      if (this.isInsideSpan(result, match)) return match;
      return `<span class="template-variable param-highlight param-named" data-variable="${paramName}" data-type="named" data-param-style="named" title="Named: :${paramName} - Click to edit">${match}</span>`;
    });

    // Asyncpg parameters $1, $2, ...
    result = result.replace(/\$(\d+)\b/g, (match, index) => {
      if (this.isInsideSpan(result, match)) return match;
      return `<span class="template-variable param-highlight param-asyncpg" data-variable="$${index}" data-type="asyncpg" data-param-style="asyncpg" title="Asyncpg: ${match} - Click to edit">${match}</span>`;
    });

    // Pyformat parameters %(name)s
    result = result.replace(/%\(([\w]+)\)s/g, (match, paramName) => {
      if (this.isInsideSpan(result, match)) return match;
      return `<span class="template-variable param-highlight param-pyformat" data-variable="${paramName}" data-type="pyformat" data-param-style="pyformat" title="Pyformat: ${match} - Click to edit">${match}</span>`;
    });

    // Numeric parameters :1, :2, ... (Oracle style)
    result = result.replace(/(?<!:):(\d+)\b/g, (match, index) => {
      if (this.isInsideSpan(result, match)) return match;
      return `<span class="template-variable param-highlight param-numeric" data-variable="$${index}" data-type="numeric" data-param-style="numeric" title="Numeric: ${match} - Click to edit">${match}</span>`;
    });

    return result;
  }

  /**
   * Check if a match is already inside a variable-highlight or param-highlight span
   */
  private isInsideSpan(html: string, match: string): boolean {
    const matchIndex = html.indexOf(match);
    if (matchIndex === -1) return false;

    // Check if the match is inside a variable-highlight or param-highlight span
    // by looking backwards for opening spans that haven't been closed
    const before = html.substring(0, matchIndex);

    // Find all span openings and closings
    const spanOpenRegex = /<span[^>]*class="[^"]*(?:variable-highlight|param-highlight)[^"]*"[^>]*>/g;
    const spanCloseRegex = /<\/span>/g;

    let openCount = 0;
    let closeCount = 0;

    while (spanOpenRegex.exec(before) !== null) openCount++;
    while (spanCloseRegex.exec(before) !== null) closeCount++;

    return openCount > closeCount;
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
   * Returns escaped HTML to ensure the template is still displayable
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

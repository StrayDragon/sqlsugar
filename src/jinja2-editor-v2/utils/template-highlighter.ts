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
      // Apply SQL syntax highlighting with custom variable highlighting
      const highlighted = this.highlightTemplateWithSQL(template, variables, values);

      return {
        html: `<div class="highlighted-template">${highlighted}</div>`,
        variables: [],
        cssClasses: this.getCSSClasses()
      };
    } catch (error) {
      console.warn('Template highlighting failed, using fallback:', error);
      return this.fallbackHighlight(template, variables, values);
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
      // Step 1: Apply highlight.js SQL syntax highlighting to the entire template
      const hljsInstance = (globalThis as typeof globalThis & { hljs: HighlightJs }).hljs;
      const highlighted = hljsInstance.highlight(template, {
        language: 'sql',
        ignoreIllegals: true
      });

      // Step 2: Replace variables in the highlighted HTML with our clickable elements
      let result = highlighted.value;

      variables.forEach(variable => {
        // Create regex to find variable patterns in the original template
        const varPattern = new RegExp(`{{\\s*${this.escapeRegex(variable.name)}\\s*}}`, 'g');

        // Replace each occurrence with our clickable variable element
        result = result.replace(varPattern, (match: string) => {
          const valueDisplay = this.formatValueForDisplay(values[variable.name]);
          const variableHTML = `<span class="template-variable variable-highlight" data-variable="${variable.name}" data-type="${variable.type}" title="Variable: ${variable.name} (${variable.type}) - Click to edit">${match}</span>`;
          const valueHTML = valueDisplay ? `<span class="variable-value-display">${valueDisplay}</span>` : '';
          return variableHTML + valueHTML;
        });
      });

      // Step 3: Also highlight variables in control structures like {% if variable %}
      result = this.highlightVariablesInControlStructures(result, variables, values);
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
    variables: EnhancedVariable[],
    values: Record<string, Jinja2VariableValue>
  ): string {
    let result = highlightedHTML;

    // Highlight variables in {% if variable %} structures
    result = result.replace(/{%\s*if\s+([^%]+)\s*%}/g, (match: string, condition: string) => {
      let highlightedCondition = condition;

      variables.forEach(variable => {
        const regex = new RegExp(`\\b${this.escapeRegex(variable.name)}\\b`, 'g');
        highlightedCondition = highlightedCondition.replace(regex,
          `<span class="template-variable variable-highlight" data-variable="${variable.name}" data-type="${variable.type}">${variable.name}</span>`);
      });

      return `{% if ${highlightedCondition} %}`;
    });

    // Highlight variables in {% for item in items %} structures
    result = result.replace(/{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%}/g, (match: string, itemVar: string, arrayVar: string) => {
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
   * Returns escaped HTML to ensure the template is still displayable
   */
  private fallbackHighlight(
    template: string,
    variables: EnhancedVariable[],
    values: Record<string, Jinja2VariableValue>
  ): TemplateHighlightResult {
    // Just return escaped HTML - let jinja2-editor-v2.ts handle variable highlighting
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

/**
 * SQL Syntax Highlighter for V2 Editor
 *
 * Provides professional SQL syntax highlighting using highlight.js
 * while maintaining support for clickable variables
 */

import type { Jinja2VariableValue } from '../types.js';
import type { HighlightJs } from '../types/external-libraries.js';

export interface VariablePosition {
  name: string;
  start: number;
  end: number;
  value?: Jinja2VariableValue;
}

export interface HighlightResult {
  html: string;
  variables: VariablePosition[];
  cssClasses: string;
}

export interface SqlHighlighterConfig {
  theme: string;
  fontSize: number;
  showLineNumbers: boolean;
  wordWrap: boolean;
  highlightVariables: boolean;
}

/**
 * SQL Syntax Highlighter with Variable Support
 */
export class SqlHighlighter {
  private config: SqlHighlighterConfig;
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

  constructor(config: Partial<SqlHighlighterConfig> = {}) {
    this.config = {
      theme: 'vscode-dark',
      fontSize: 14,
      showLineNumbers: true,
      wordWrap: true,
      highlightVariables: true,
      ...config
    };
  }

  /**
   * Highlights SQL code with syntax highlighting and variable detection
   */
  highlightSQL(sql: string, variables: Record<string, Jinja2VariableValue> = {}): HighlightResult {
    if (!sql) {
      return {
        html: '',
        variables: [],
        cssClasses: this.getCSSClasses()
      };
    }

    try {

      const variablePositions = this.detectVariablePositions(sql, variables);


      const { processedSQL, variableMap } = this.replaceVariablesWithPlaceholders(sql, variablePositions);


      const highlighted = hljs.highlight(processedSQL, {
        language: 'sql',
        ignoreIllegals: true
      });


      const finalHTML = this.reinsertVariables(highlighted.value, variableMap);

      return {
        html: `<pre><code class="hljs sql">${finalHTML}</code></pre>`,
        variables: variablePositions,
        cssClasses: this.getCSSClasses()
      };
    } catch (error) {
      console.warn('SQL highlighting failed, using fallback:', error);
      return this.fallbackHighlight(sql, variables);
    }
  }

  /**
   * Detects variable positions in SQL code
   */
  private detectVariablePositions(sql: string, variables: Record<string, Jinja2VariableValue>): VariablePosition[] {
    const positions: VariablePosition[] = [];

    Object.entries(variables).forEach(([name, value]) => {

      const valueStr = this.formatValueForSQL(value);
      if (valueStr) {
        const regex = new RegExp(this.escapeRegex(valueStr), 'gi');
        let match;

        while ((match = regex.exec(sql)) !== null) {
          positions.push({
            name,
            start: match.index,
            end: match.index + match[0].length,
            value
          });
        }
      }
    });


    return positions.sort((a, b) => b.start - a.start);
  }

  /**
   * Replaces variables with unique placeholders
   */
  private replaceVariablesWithPlaceholders(
    sql: string,
    positions: VariablePosition[]
  ): { processedSQL: string; variableMap: Map<string, VariablePosition> } {
    let processedSQL = sql;
    const variableMap = new Map<string, VariablePosition>();

    positions.forEach((position, index) => {
      const placeholder = `__VAR_${index}__`;
      variableMap.set(placeholder, position);

      const before = processedSQL.substring(0, position.start);
      const after = processedSQL.substring(position.end);
      processedSQL = before + placeholder + after;
    });

    return { processedSQL, variableMap };
  }

  /**
   * Re-inserts variables as clickable elements
   */
  private reinsertVariables(
    highlightedHTML: string,
    variableMap: Map<string, VariablePosition>
  ): string {
    let result = highlightedHTML;

    variableMap.forEach((position, placeholder) => {
      const escapedPlaceholder = this.escapeHtml(placeholder);
      const variableHTML = this.createVariableElement(position);
      result = result.replace(
        new RegExp(escapedPlaceholder, 'g'),
        variableHTML
      );
    });

    return result;
  }

  /**
   * Creates HTML element for a variable
   */
  private createVariableElement(position: VariablePosition): string {
    const valueStr = this.formatValueForDisplay(position.value);
    const escapedValue = this.escapeHtml(valueStr);

    return `<span class="sql-variable" data-variable="${position.name}" title="Variable: ${position.name}">${escapedValue}</span>`;
  }

  /**
   * Fallback highlighting when highlight.js fails
   */
  private fallbackHighlight(sql: string, variables: Record<string, Jinja2VariableValue>): HighlightResult {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
      'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'ON', 'AS', 'AND', 'OR', 'NOT',
      'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET',
      'UNION', 'ALL', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN',
      'ELSE', 'END', 'NULL', 'IS', 'TRUE', 'FALSE', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES'
    ];

    let highlighted = this.escapeHtml(sql);


    Object.entries(variables).forEach(([name, value]) => {
      const valueStr = this.formatValueForSQL(value);
      if (valueStr) {
        const regex = new RegExp(this.escapeRegex(valueStr), 'gi');
        highlighted = highlighted.replace(regex, (match) =>
          `<span class="sql-variable" data-variable="${name}">${match}</span>`
        );
      }
    });


    keywords.sort((a, b) => b.length - a.length);
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `<span class="sql-keyword">${keyword}</span>`);
    });


    highlighted = highlighted.replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>');
    highlighted = highlighted.replace(/"([^"]*)"/g, '<span class="sql-string">"$1"</span>');


    highlighted = highlighted.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

    return {
      html: `<pre><code class="sql-content">${highlighted}</code></pre>`,
      variables: this.detectVariablePositions(sql, variables),
      cssClasses: this.getCSSClasses()
    };
  }

  /**
   * Formats value for SQL display
   */
  private formatValueForSQL(value: Jinja2VariableValue): string {
    if (value == null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return String(value);
  }

  /**
   * Formats value for display
   */
  private formatValueForDisplay(value: Jinja2VariableValue): string {
    if (value == null) return 'NULL';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
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
    return `hljs sql-theme-${themeName} sql-highlighter`;
  }

  /**
   * Maps internal theme names to highlight.js theme names
   */
  private mapThemeName(theme: string): string {
    return SqlHighlighter.THEMES[theme as keyof typeof SqlHighlighter.THEMES] || 'vs2015';
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<SqlHighlighterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current configuration
   */
  getConfig(): SqlHighlighterConfig {
    return { ...this.config };
  }

  /**
   * 🚀 NEW: Simplified SQL highlighting without placeholder replacement
   * This method directly highlights the SQL without replacing variables with placeholders
   * This prevents the __VAR_XXX and 42VAR_XXX issues in HTML preview
   */
  highlightSQLSimple(sql: string): { html: string } {
    if (!sql) {
      return { html: '' };
    }

    try {

      const hljsInstance = (globalThis as typeof globalThis & { hljs: HighlightJs }).hljs;
      if (hljsInstance) {
        const highlighted = hljsInstance.highlight(sql, { language: 'sql', ignoreIllegals: true });

        return {
          html: `<pre><code class="hljs sql ${this.getCSSClasses()}">${highlighted.value}</code></pre>`
        };
      }
    } catch (error) {
      console.warn('Highlight.js not available, using simple highlighting:', error);
    }


    const highlighted = this.simpleKeywordHighlighting(sql);
    return {
      html: `<pre><code class="${this.getCSSClasses()}">${highlighted}</code></pre>`
    };
  }

  /**
   * Simple keyword highlighting as fallback
   */
  private simpleKeywordHighlighting(sql: string): string {
    if (!sql) return '';


    let highlighted = this.escapeHtml(sql);


    const keywords = [
      'select', 'from', 'where', 'and', 'or', 'not', 'in', 'like', 'between', 'is', 'null',
      'true', 'false', 'exists', 'distinct', 'order by', 'group by', 'having', 'join',
      'left join', 'right join', 'inner join', 'outer join', 'union', 'insert', 'update',
      'delete', 'create', 'drop', 'alter', 'table', 'index', 'view', 'procedure', 'function'
    ];

    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex,
        `<span class="hljs-keyword">${keyword.toUpperCase()}</span>`);
    });


    highlighted = highlighted.replace(/'([^']*)'/g,
      '<span class="hljs-string">\'$1\'</span>');


    highlighted = highlighted.replace(/\b(\d+)\b/g,
      '<span class="hljs-number">$1</span>');


    highlighted = highlighted.replace(/(--[^\n\r]*)/g,
      '<span class="hljs-comment">$1</span>');

    return highlighted;
  }

  /**
   * Registers custom SQL language definition if needed
   */
  static registerCustomLanguage(): void {
    return;
  }
}


SqlHighlighter.registerCustomLanguage();

export default SqlHighlighter;

/**
 * Jinja2 Analyzer
 *
 * Wraps the existing Jinja2 variable extraction logic to integrate
 * with the analyzer pipeline. Extracts {{ variable }} patterns.
 */

import type { Analyzer, AnalyzerContext, AnalyzerResult, ExtractedParameter } from './types.js';

/**
 * Regex for Jinja2 variable expressions {{ ... }}
 */
const JINJA2_EXPRESSION_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Regex for bare identifiers in expressions
 */
const IDENTIFIER_REGEX = /\b([a-zA-Z_]\w*(?:\.\w+)*)\b/g;

/**
 * Jinja2 keywords to exclude
 */
const JINJA2_KEYWORDS = new Set([
  'if', 'elif', 'else', 'endif',
  'for', 'endfor', 'in',
  'set', 'endset',
  'macro', 'endmacro', 'call', 'endcall', 'caller',
  'extends', 'block', 'endblock', 'include', 'import',
  'filter', 'endfilter',
  'and', 'or', 'not', 'is', 'as',
  'true', 'false', 'none', 'null',
  'defined', 'undefined',
  'loop', 'super', 'self', 'varargs', 'kwargs',
  'range', 'lipsum', 'cycler', 'joiner',
]);

/**
 * Jinja2 analyzer - extracts {{ variable }} style placeholders
 */
export class TemplateExpressionAnalyzer implements Analyzer {
  readonly name = 'jinja2';
  readonly priority = 5;
  readonly displayName = 'Jinja2 ({{ var }})';
  readonly paramStyle = 'jinja2' as const;

  analyze(sql: string, _context: AnalyzerContext): AnalyzerResult {
    const parameters: ExtractedParameter[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;


    JINJA2_EXPRESSION_REGEX.lastIndex = 0;

    while ((match = JINJA2_EXPRESSION_REGEX.exec(sql)) !== null) {
      const expression = match[1].trim();


      const variables = this.extractVariablesFromExpression(expression);

      for (const varName of variables) {

        if (JINJA2_KEYWORDS.has(varName.toLowerCase())) {
          continue;
        }


        if (seen.has(varName)) {
          continue;
        }
        seen.add(varName);

        parameters.push({
          name: varName,
          position: parameters.length,
          type: 'jinja2',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          originalText: match[0],
        });
      }
    }

    return {
      parameters,
      metadata: { pattern: 'jinja2' },
      hasResults: parameters.length > 0,
    };
  }

  /**
   * Extract variable names from a Jinja2 expression
   */
  private extractVariablesFromExpression(expr: string): string[] {
    const variables: string[] = [];
    let match: RegExpExecArray | null;


    const parts = expr.split('|');
    const mainExpr = parts[0].trim();


    IDENTIFIER_REGEX.lastIndex = 0;
    while ((match = IDENTIFIER_REGEX.exec(mainExpr)) !== null) {
      const varName = match[1];

      if (mainExpr[match.index + varName.length] === '(') {
        continue;
      }
      variables.push(varName);
    }

    return [...new Set(variables)];
  }
}

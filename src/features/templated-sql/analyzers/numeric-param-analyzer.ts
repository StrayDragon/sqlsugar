/**
 * Numeric Parameter Analyzer
 *
 * Extracts numeric positional parameters in the format :1, :2, etc.
 * Used by Oracle and some other databases.
 * Pattern: :[0-9]+
 */

import type { Analyzer, AnalyzerContext, AnalyzerResult, ExtractedParameter } from './types.js';

/**
 * Regex for numeric parameters (:1, :2, etc.)
 * Matches colon followed by digits, but not :: (escaped)
 */
const NUMERIC_PARAM_REGEX = /(?<!:):(\d+)\b/g;

/**
 * Numeric parameter analyzer - extracts :1, :2 style placeholders
 */
export class NumericParamAnalyzer implements Analyzer {
  readonly name = 'numeric';
  readonly priority = 20;
  readonly displayName = 'Numeric (:1)';
  readonly paramStyle = 'numeric' as const;

  analyze(sql: string, _context: AnalyzerContext): AnalyzerResult {
    const parameters: ExtractedParameter[] = [];
    let match: RegExpExecArray | null;


    NUMERIC_PARAM_REGEX.lastIndex = 0;

    while ((match = NUMERIC_PARAM_REGEX.exec(sql)) !== null) {

      if (this.isInsideJinja2Expression(sql, match.index)) {
        continue;
      }

      const positionIndex = parseInt(match[1], 10);

      parameters.push({
        name: match[1],
        position: positionIndex - 1,
        type: 'numeric',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        originalText: match[0],
      });
    }

    return {
      parameters,
      metadata: { pattern: 'numeric' },
      hasResults: parameters.length > 0,
    };
  }

  /**
   * Check if a position is inside a Jinja2 expression {{ ... }}
   */
  private isInsideJinja2Expression(sql: string, position: number): boolean {
    const before = sql.substring(0, position);
    const openBraces = (before.match(/\{\{/g) || []).length;
    const closeBraces = (before.match(/\}\}/g) || []).length;
    return openBraces > closeBraces;
  }
}

/**
 * Named Parameter Analyzer
 *
 * Extracts named parameters in the format :param (SQLAlchemy style).
 * Pattern: :[a-zA-Z_][a-zA-Z0-9_]*
 *
 * Excludes Jinja2 control characters ({%, {{, {#) to avoid false positives.
 */

import type { Analyzer, AnalyzerContext, AnalyzerResult, ExtractedParameter } from './types.js';

/**
 * Regex for named parameters (:param style)
 * Matches :word but NOT :: (escaped) or : followed by digit (numeric style)
 */
const NAMED_PARAM_REGEX = /(?<!:):([a-zA-Z_]\w*)\b(?!\s*[%}])/g;

/**
 * Named parameter analyzer - extracts :param style placeholders
 */
export class NamedParamAnalyzer implements Analyzer {
  readonly name = 'named';
  readonly priority = 10;
  readonly displayName = 'Named (:param)';
  readonly paramStyle = 'named' as const;

  analyze(sql: string, _context: AnalyzerContext): AnalyzerResult {
    const parameters: ExtractedParameter[] = [];
    let match: RegExpExecArray | null;


    NAMED_PARAM_REGEX.lastIndex = 0;

    while ((match = NAMED_PARAM_REGEX.exec(sql)) !== null) {
      const paramName = match[1];


      if (this.isInsideJinja2Expression(sql, match.index)) {
        continue;
      }

      parameters.push({
        name: paramName,
        position: parameters.length,
        type: 'named',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        originalText: match[0],
      });
    }

    return {
      parameters,
      metadata: { pattern: 'named' },
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

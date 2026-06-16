/**
 * Pyformat Parameter Analyzer
 *
 * Extracts Python extended format parameters in the format %(param)s.
 * Used by psycopg2 (PostgreSQL) and MySQLdb.
 * Pattern: %\([a-zA-Z_][a-zA-Z0-9_]*\)s
 */

import type { Analyzer, AnalyzerContext, AnalyzerResult, ExtractedParameter } from './types.js';

/**
 * Regex for pyformat parameters (%(param)s style)
 * Matches %(name)s pattern
 */
const PYFORMAT_PARAM_REGEX = /%\((\w+)\)s/g;

/**
 * Pyformat parameter analyzer - extracts %(param)s style placeholders
 */
export class PyformatParamAnalyzer implements Analyzer {
  readonly name = 'pyformat';
  readonly priority = 30;
  readonly displayName = 'Pyformat (%(param)s)';
  readonly paramStyle = 'pyformat' as const;

  analyze(sql: string, _context: AnalyzerContext): AnalyzerResult {
    const parameters: ExtractedParameter[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    PYFORMAT_PARAM_REGEX.lastIndex = 0;

    while ((match = PYFORMAT_PARAM_REGEX.exec(sql)) !== null) {
      // Skip if inside Jinja2 expression
      if (this.isInsideJinja2Expression(sql, match.index)) {
        continue;
      }

      parameters.push({
        name: match[1],
        position: parameters.length,
        type: 'pyformat',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        originalText: match[0],
      });
    }

    return {
      parameters,
      metadata: { pattern: 'pyformat' },
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

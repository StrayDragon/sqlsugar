/**
 * Asyncpg Parameter Analyzer
 *
 * Extracts PostgreSQL asyncpg-style positional parameters in the format $1, $2, etc.
 * Used by asyncpg and node-postgres.
 * Pattern: $[0-9]+
 */

import type { Analyzer, AnalyzerContext, AnalyzerResult, ExtractedParameter } from './types.js';

/**
 * Regex for asyncpg parameters ($1, $2, etc.)
 * Matches dollar sign followed by digits
 */
const ASYNCPG_PARAM_REGEX = /\$(\d+)\b/g;

/**
 * Asyncpg parameter analyzer - extracts $1, $2 style placeholders
 */
export class AsyncpgParamAnalyzer implements Analyzer {
  readonly name = 'asyncpg';
  readonly priority = 40;
  readonly displayName = 'Asyncpg ($1)';
  readonly paramStyle = 'asyncpg' as const;

  analyze(sql: string, _context: AnalyzerContext): AnalyzerResult {
    const parameters: ExtractedParameter[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    ASYNCPG_PARAM_REGEX.lastIndex = 0;

    while ((match = ASYNCPG_PARAM_REGEX.exec(sql)) !== null) {
      // Skip if inside Jinja2 expression
      if (this.isInsideJinja2Expression(sql, match.index)) {
        continue;
      }

      const positionIndex = parseInt(match[1], 10);

      parameters.push({
        name: match[1],
        position: positionIndex - 1, // Convert to 0-based
        type: 'asyncpg',
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        originalText: match[0],
      });
    }

    return {
      parameters,
      metadata: { pattern: 'asyncpg' },
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

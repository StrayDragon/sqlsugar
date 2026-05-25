/**
 * Shared Jinja2/Nunjucks regex patterns for consistent template parsing
 * across Extension host and WebView.
 *
 * Both processor.ts (Extension) and template-parser.ts (WebView) should
 * use these patterns to avoid extraction inconsistencies.
 */

export const JINJA2_REGEX = {
  /** Matches {{ expr }} — captures the full inner expression (with filters, spaces, etc.) */
  EXPRESSION: /\{\{\s*([^}]+?)\s*\}\}/g,

  /** Matches {% tag ... %} blocks — captures the tag keyword and body */
  BLOCK: /\{%[-\s]*(if|elif|else|endif|for|endfor|set|endset|macro|endmacro|call|endcall|include|extends|block|endblock|filter|endfilter)([^%]*?)[-\s]*%\}/g,

  /** Matches {# comment #} */
  COMMENT: /\{#[\s\S]*?#\}/g,

  /** Matches {% if/elif condition %} — captures tag keyword and condition */
  IF_CONDITION: /\{%[-\s]*(if|elif)\s+([^%]+?)\s*[-]?%\}/g,

  /** Matches {% for item in collection %} — captures loop var and iterable */
  FOR_LOOP: /\{%[-\s]*for\s+(\w+)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*[-]?%\}/g,

  /** Matches {% set var = value %} */
  SET_ASSIGNMENT: /\{%[-\s]*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^%]+?)\s*[-]?%\}/g,

  /** Matches a bare identifier in an expression (excludes Jinja2 keywords) */
  IDENTIFIER: /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b/g,

  /** Matches filter name after pipe: | filter_name */
  FILTER: /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)/g,
} as const;

/** Jinja2/Nunjucks keywords that should never be treated as user variables */
export const JINJA2_KEYWORDS = new Set([
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
 * Extract the variable name from a Jinja2 expression (strips filters).
 * e.g. "name | upper | default('x')" → "name"
 */
export function extractVariableFromExpression(expr: string): { variableName: string; filters: string[] } {
  const parts = expr.split('|').map(part => part.trim());
  const variableName = parts[0].replace(/\(.*\)/, '').trim();

  const filters = parts.slice(1).map(filterPart => {
    const match = filterPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
    return match ? match[1] : filterPart.trim();
  });

  return { variableName, filters };
}

/**
 * Check if a name is a Jinja2 keyword (should not be treated as a user variable)
 */
export function isJinja2Keyword(name: string): boolean {
  return JINJA2_KEYWORDS.has(name.toLowerCase());
}

/**
 * Template Parser for V2 Editor
 *
 * Parses Jinja2 templates and extracts variable positions and context
 */

import type {
  EnhancedVariable,
  VariablePosition,
  VariableContext,
  TemplateHighlight,
  TemplateStats,
  Jinja2Variable
} from '../types.js';
import { inferTypeFromValue, createJinja2Variable } from '../../jinja2-editor/utils/variable-utils.js';

/**
 * Regular expressions for Jinja2 syntax parsing
 */
const JINJA2_PATTERNS = {
  // Variables: {{ variable_name }}
  VARIABLE: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}/g,
  // Blocks: {% if condition %}, {% for item in items %}
  BLOCK: /\{%\s*(if|elif|else|endif|for|endfor|set|macro|include|extends|block|endblock)[^%]*%\}/g,
  // Comments: {# comment #}
  COMMENT: /\{#[\s\S]*?#\}/g,
  // Filters: {{ variable|filter_name }}
  FILTER: /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)/g
};

/**
 * Context window size for variable analysis
 */
const CONTEXT_WINDOW = 100; // characters before and after variable

/**
 * Parse template and extract all variables with positions
 */
export function parseTemplate(template: string): TemplateHighlight {
  const variables = extractVariables(template);
  const stats = calculateStats(template, variables);
  const highlightedHTML = createHighlightedHTML(template, variables);

  return {
    variables,
    highlightedHTML,
    stats
  };
}

/**
 * Extract variables from template with position and context information
 */
function extractVariables(template: string): EnhancedVariable[] {
  const variables: EnhancedVariable[] = [];
  const variableMap = new Map<string, EnhancedVariable>();

  // Reset regex lastIndex
  JINJA2_PATTERNS.VARIABLE.lastIndex = 0;

  let match;
  while ((match = JINJA2_PATTERNS.VARIABLE.exec(template)) !== null) {
    const fullMatch = match[0];
    const variableName = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Calculate line and column
    const beforeText = template.substring(0, startIndex);
    const lines = beforeText.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;

    // Extract context
    const context = extractContext(template, startIndex, endIndex);

    // Create enhanced variable
    const enhancedVar: EnhancedVariable = {
      ...createJinja2Variable(variableName, inferVariableType(variableName, context)),
      position: {
        startIndex,
        endIndex,
        line,
        column,
        name: variableName,
        fullMatch
      },
      context
    };

    // Track usage statistics
    if (variableMap.has(variableName)) {
      const existing = variableMap.get(variableName)!;
      // Update usage count would go here if we implement usage tracking
    } else {
      variableMap.set(variableName, enhancedVar);
      variables.push(enhancedVar);
    }
  }

  return variables;
}

/**
 * Extract context around a variable
 */
function extractContext(template: string, startIndex: number, endIndex: number): VariableContext {
  const contextStart = Math.max(0, startIndex - CONTEXT_WINDOW);
  const contextEnd = Math.min(template.length, endIndex + CONTEXT_WINDOW);

  const before = template.substring(contextStart, startIndex);
  const after = template.substring(endIndex, contextEnd);

  // Infer semantic context from surrounding text
  const semanticContext = inferSemanticContext(before, after);

  // Find related variables (same line or nearby)
  const relatedVariables = findRelatedVariables(template, startIndex, endIndex);

  return {
    surroundingText: { before, after },
    semanticContext,
    relatedVariables
  };
}

/**
 * Infer semantic context from surrounding text
 */
function inferSemanticContext(before: string, after: string): string {
  const surrounding = (before + after).toLowerCase();

  // SQL contexts
  if (surrounding.includes('select') || surrounding.includes('from') || surrounding.includes('where')) {
    if (surrounding.includes('where') && surrounding.includes('=')) return 'where_condition';
    if (surrounding.includes('where') && surrounding.includes('in')) return 'where_in_clause';
    if (surrounding.includes('where') && surrounding.includes('like')) return 'where_like_clause';
    if (surrounding.includes('join') || surrounding.includes('on')) return 'join_condition';
    if (surrounding.includes('order by') || surrounding.includes('group by')) return 'sorting_grouping';
    if (surrounding.includes('insert') || surrounding.includes('update') || surrounding.includes('delete')) {
      return 'dml_operation';
    }
    return 'sql_query';
  }

  // Template contexts
  if (surrounding.includes('if') || surrounding.includes('elif')) return 'conditional';
  if (surrounding.includes('for')) return 'loop';
  if (surrounding.includes('set')) return 'assignment';

  // Common patterns
  if (surrounding.includes('id') || surrounding.includes('_id')) return 'identifier';
  if (surrounding.includes('email') || surrounding.includes('mail')) return 'email_address';
  if (surrounding.includes('date') || surrounding.includes('time')) return 'datetime';
  if (surrounding.includes('name') || surrounding.includes('title')) return 'text_field';

  return 'general';
}

/**
 * Find variables that are related to the current one
 */
function findRelatedVariables(template: string, startIndex: number, endIndex: number): string[] {
  const related: string[] = [];
  const contextStart = Math.max(0, startIndex - 200);
  const contextEnd = Math.min(template.length, endIndex + 200);
  const context = template.substring(contextStart, contextEnd);

  // Find all variables in context
  JINJA2_PATTERNS.VARIABLE.lastIndex = 0;
  let match;
  while ((match = JINJA2_PATTERNS.VARIABLE.exec(context)) !== null) {
    const varName = match[1];
    if (varName !== match[1]) { // Not the current variable
      related.push(varName);
    }
  }

  // Remove duplicates and limit to nearby variables
  return [...new Set(related)].slice(0, 5);
}

/**
 * Infer variable type from name and context
 */
function inferVariableType(variableName: string, context: VariableContext): Jinja2Variable['type'] {
  const name = variableName.toLowerCase();
  const semanticContext = context.semanticContext.toLowerCase();

  // Name-based inference
  if (name.includes('id') && !name.includes('guid')) return 'integer';
  if (name.includes('email') || name.includes('mail')) return 'email';
  if (name.includes('url') || name.includes('link')) return 'url';
  if (name.includes('date') || name.includes('time')) {
    return name.includes('time') ? 'datetime' : 'date';
  }
  if (name.includes('uuid') || name.includes('guid')) return 'uuid';
  if (name.includes('is_') || name.includes('has_') || name.includes('can_')) return 'boolean';
  if (name.includes('count') || name.includes('total') || name.includes('num')) return 'integer';
  if (name.includes('price') || name.includes('amount') || name.includes('rate')) return 'number';
  if (name.includes('json') || name.includes('data') || name.includes('config')) return 'json';

  // Context-based inference
  if (semanticContext.includes('where') && semanticContext.includes('=')) {
    return name.includes('id') ? 'integer' : 'string';
  }
  if (semanticContext.includes('where') && semanticContext.includes('like')) {
    return 'string';
  }
  if (semanticContext.includes('where') && semanticContext.includes('in')) {
    return name.includes('id') ? 'integer' : 'string';
  }

  return 'string';
}

/**
 * Calculate template statistics
 */
function calculateStats(template: string, variables: EnhancedVariable[]): TemplateStats {
  const variableCount = variables.length;
  const requiredCount = variables.filter(v => v.isRequired).length;
  const optionalCount = variableCount - requiredCount;

  // Count by type
  const variablesByType: Record<string, number> = {};
  variables.forEach(v => {
    variablesByType[v.type] = (variablesByType[v.type] || 0) + 1;
  });

  // Calculate complexity
  let complexity: 'simple' | 'medium' | 'complex' = 'simple';

  // Check for complex Jinja2 features
  JINJA2_PATTERNS.BLOCK.lastIndex = 0;
  const blockMatches = template.match(JINJA2_PATTERNS.BLOCK) || [];

  if (variableCount > 10 || blockMatches.length > 5) {
    complexity = 'complex';
  } else if (variableCount > 5 || blockMatches.length > 2) {
    complexity = 'medium';
  }

  return {
    variableCount,
    requiredCount,
    optionalCount,
    variablesByType,
    complexity
  };
}

/**
 * Create HTML with highlighted variables
 */
function createHighlightedHTML(template: string, variables: EnhancedVariable[]): string {
  let html = template;
  let offset = 0;

  // Sort variables by position to avoid index shifting issues
  const sortedVars = [...variables].sort((a, b) => a.position.startIndex - b.position.startIndex);

  sortedVars.forEach(variable => {
    const pos = variable.position;
    const adjustedStart = pos.startIndex + offset;
    const adjustedEnd = pos.endIndex + offset;

    const before = html.substring(0, adjustedStart);
    const varText = html.substring(adjustedStart, adjustedEnd);
    const after = html.substring(adjustedEnd);

    // Create highlighted variable element
    const highlightedVar = `<span class="variable-highlight" data-variable="${variable.name}" data-index="${variables.indexOf(variable)}">${varText}</span>`;

    html = before + highlightedVar + after;
    offset += highlightedVar.length - varText.length;
  });

  // Escape HTML and convert line breaks
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
    .replace(/ /g, '&nbsp;');
}

/**
 * Find variable at given position
 */
export function findVariableAtPosition(
  variables: EnhancedVariable[],
  position: number
): EnhancedVariable | null {
  return variables.find(v =>
    position >= v.position.startIndex && position <= v.position.endIndex
  ) || null;
}

/**
 * Get variable by name
 */
export function getVariableByName(
  variables: EnhancedVariable[],
  name: string
): EnhancedVariable | null {
  return variables.find(v => v.name === name) || null;
}

/**
 * Sort variables for navigation
 */
export function sortVariablesForNavigation(variables: EnhancedVariable[]): EnhancedVariable[] {
  return [...variables].sort((a, b) => {
    // Required variables first
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;

    // Then by position in template
    return a.position.startIndex - b.position.startIndex;
  });
}

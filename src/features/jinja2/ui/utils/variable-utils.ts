/**
 * Variable Utilities for V2 Editor
 *
 * Utility functions for variable validation, type checking, and value formatting
 */

import type { EnhancedVariable, Jinja2Variable, Jinja2VariableValue } from '../types.js';
import type { TypeInferenceResult, ControlStructureContext, TemplateContext } from '../types/enhanced-variable.js';

export type VariableType = 'string' | 'number' | 'integer' | 'boolean' | 'date' | 'time' | 'datetime' | 'json' | 'uuid' | 'email' | 'url' | 'null';

/**
 * Gets a default value for a given variable type
 */
export function getDefaultValueForType(type: VariableType): Jinja2VariableValue {
  const defaults: Record<VariableType, Jinja2VariableValue> = {
    string: 'demo_value',
    number: 42,
    integer: 42,
    boolean: true,
    date: new Date().toISOString().split('T')[0],
    time: '00:00:00',
    datetime: new Date().toISOString(),
    json: {},
    uuid: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com',
    url: 'https://example.com',
    null: null
  };

  return defaults[type];
}

/**
 * Validates a value against its variable type
 */
export function validateValue(value: Jinja2VariableValue, type: VariableType): string | null {
  if (value == null && type !== 'null') {
    return 'Value cannot be null or undefined';
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') return 'Value must be a string';
      break;

    case 'number':
    case 'integer':
      if (typeof value !== 'number' || isNaN(value)) {
        return 'Value must be a valid number';
      }
      if (type === 'integer' && !Number.isInteger(value)) {
        return 'Value must be an integer';
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') return 'Value must be a boolean';
      break;

    case 'date':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'Value must be a valid date in YYYY-MM-DD format';
      }
      break;

    case 'datetime':
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        return 'Value must be a valid datetime in ISO format';
      }
      break;

    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Value must be a valid email address';
      }
      break;

    case 'url':
      if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) {
        return 'Value must be a valid URL starting with http:// or https://';
      }
      break;

    case 'uuid':
      if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        return 'Value must be a valid UUID';
      }
      break;

    case 'json':
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        } else if (typeof value !== 'object') {
          return 'Value must be a valid JSON object or string';
        }
      } catch {
        return 'Value must be valid JSON';
      }
      break;

    case 'null':
      if (value !== null && value !== 'null') {
        return 'Value must be null';
      }
      break;
  }

  return null;
}

/**
 * Infers variable type from a value
 */
export function inferTypeFromValue(value: Jinja2VariableValue): VariableType {
  if (value === null || value === 'null') return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }
  if (typeof value === 'string') {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^https?:\/\/.+/.test(value)) return 'url';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'datetime';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return 'uuid';

    try {
      JSON.parse(value);
      return 'json';
    } catch {
      return 'string';
    }
  }
  if (typeof value === 'object') return 'json';

  return 'string';
}

/**
 * Formats a value for display based on its type
 */
export function formatValueForDisplay(value: Jinja2VariableValue, type: VariableType): string {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (type === 'json' && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Creates a new Jinja2Variable with the provided properties
 */
export function createJinja2Variable(
  name: string,
  type: VariableType,
  options: Partial<Jinja2Variable> = {}
): Jinja2Variable {
  return {
    name,
    type,
    isRequired: false,
    description: '',
    filters: [],
    ...options
  };
}

/**
 * Gets a contextual default value for a variable based on its name and type
 */
export function getContextualDefaultValue(variable: EnhancedVariable): Jinja2VariableValue {
  const name = variable.name.toLowerCase();
  const type = variable.type as VariableType;


  switch (type) {
    case 'number':
    case 'integer':
      if (name.includes('id')) return 123;
      if (name.includes('count')) return 10;
      if (name.includes('limit')) return 50;
      return 42;

    case 'boolean':
      if (name.startsWith('is_') || name.startsWith('has_')) return true;
      if (name.includes('deleted') || name.includes('remove')) return false;
      return true;

    case 'date':
    case 'datetime':
      if (name.includes('created') || name.includes('start')) return '2024-01-01';
      if (name.includes('updated') || name.includes('end')) return '2024-12-31';
      return new Date().toISOString().split('T')[0];

    case 'string':
      if (name.includes('id')) return 'sample_id';
      if (name.includes('name')) return 'Sample Name';
      if (name.includes('email')) return 'test@example.com';
      return `demo_${name}`;

    case 'email':
      return 'test@example.com';

    case 'url':
      return 'https://example.com';

    case 'uuid':
      return '00000000-0000-0000-0000-000000000000';

    default:
      return getDefaultValueForType(type);
  }
}

// ===== Enhanced Type Inference Functions =====

/**
 * Analyzes control structures in a template to infer variable types
 */
export function analyzeControlStructures(template: string): ControlStructureContext[] {
  const contexts: ControlStructureContext[] = [];

  // Regex patterns for different control structures
  const patterns = {
    ifStatement: /{%\s*if\s+([^%}]+)\s*%}([\s\S]*?){%\s*endif\s*%}/g,
    forLoop: /{%\s*for\s+([^%}]+)\s+in\s+([^%}]+)\s*%}([\s\S]*?){%\s*endfor\s*%}/g,
    elifStatement: /{%\s*elif\s+([^%}]+)\s*%}/g,
    unlessStatement: /{%\s*unless\s+([^%}]+)\s*%}([\s\S]*?){%\s*endunless\s*%}/g,
    setStatement: /{%\s*set\s+([^=]+)\s*=\s*([^%}]*)\s*%}/g,
    macroDefinition: /{%\s*macro\s+([^%}]+)\s*\(([^)]*)\)\s*%}([\s\S]*?){%\s*endmacro\s*%}/g,
  };

  // Analyze if statements for boolean inference
  let match;
  while ((match = patterns.ifStatement.exec(template)) !== null) {
    const condition = match[1].trim();
    const body = match[2];

    contexts.push({
      type: 'conditional',
      condition,
      body,
      variablesInScope: extractVariablesFromCondition(condition),
      line: getLineNumber(template, match.index),
      column: match.index - template.lastIndexOf('\n', match.index) - 1
    });
  }

  // Analyze for loops for iterable/array inference
  patterns.forLoop.lastIndex = 0;
  while ((match = patterns.forLoop.exec(template)) !== null) {
    const loopVar = match[1].trim();
    const iterable = match[2].trim();
    const body = match[3];

    contexts.push({
      type: 'loop',
      condition: `${loopVar} in ${iterable}`,
      body,
      variablesInScope: [loopVar, ...extractVariablesFromCondition(iterable)],
      line: getLineNumber(template, match.index),
      column: match.index - template.lastIndexOf('\n', match.index) - 1
    });
  }

  // Analyze set statements for explicit type assignments
  patterns.setStatement.lastIndex = 0;
  while ((match = patterns.setStatement.exec(template)) !== null) {
    const varName = match[1].trim();
    const valueExpression = match[2].trim();

    contexts.push({
      type: 'assignment',
      condition: `${varName} = ${valueExpression}`,
      body: valueExpression,
      variablesInScope: [varName],
      line: getLineNumber(template, match.index),
      column: match.index - template.lastIndexOf('\n', match.index) - 1
    });
  }

  return contexts;
}

/**
 * Infers variable type based on control structure context
 */
export function inferTypeFromContext(
  variableName: string,
  contexts: ControlStructureContext[]
): TypeInferenceResult {
  let inferredType: VariableType = 'string';
  let confidence = 0.0;
  let reasoning: string[] = [];

  for (const context of contexts) {
    const contextResult = analyzeVariableInContext(variableName, context);
    if (contextResult.confidence > confidence) {
      inferredType = contextResult.type;
      confidence = contextResult.confidence;
      reasoning = contextResult.reasoning;
    }
  }

  // Fallback to name-based inference if no context found
  if (confidence === 0.0) {
    const nameBasedResult = inferTypeFromName(variableName);
    inferredType = nameBasedResult.type;
    confidence = nameBasedResult.confidence;
    reasoning.push(...nameBasedResult.reasoning);
  }

  return {
    type: inferredType,
    confidence,
    reasoning,
    sources: ['contextual-analysis']
  };
}

/**
 * Analyzes a specific variable within a control structure context
 */
function analyzeVariableInContext(
  variableName: string,
  context: ControlStructureContext
): TypeInferenceResult {
  const lowerVarName = variableName.toLowerCase();

  switch (context.type) {
    case 'conditional':
      return analyzeInConditionalContext(variableName, context);

    case 'loop':
      return analyzeInLoopContext(variableName, context);

    case 'assignment':
      return analyzeInAssignmentContext(variableName, context);

    default:
      return {
        type: 'string',
        confidence: 0.0,
        reasoning: ['Unknown context type'],
        sources: ['contextual-analysis']
      };
  }
}

/**
 * Analyzes variable usage in conditional (if/elif/unless) contexts
 */
function analyzeInConditionalContext(
  variableName: string,
  context: ControlStructureContext
): TypeInferenceResult {
  const condition = context.condition.toLowerCase();
  const varName = variableName.toLowerCase();

  // Boolean inference patterns
  const booleanPatterns = [
    `{% if ${varName} %}`,
    `{% if not ${varName} %}`,
    `{% if ${varName} is defined %}`,
    `{% if ${varName} is none %}`,
    `{% elif ${varName} %}`,
    `{% unless ${varName} %}`
  ];

  for (const pattern of booleanPatterns) {
    if (condition.includes(pattern)) {
      return {
        type: 'boolean',
        confidence: 0.9,
        reasoning: [
          `Variable appears in boolean condition: ${context.condition}`,
          'Used in conditional logic indicates boolean type'
        ],
        sources: ['conditional-analysis']
      };
    }
  }

  // Comparison operators suggest numeric or string types
  if (/\b(if|elif)\s+[^=]*([><]=?|==|!=)\s*['"]?/.test(condition)) {
    if (condition.includes(varName) && /[><]=?/.test(condition)) {
      return {
        type: 'number',
        confidence: 0.8,
        reasoning: [
          `Variable used in numeric comparison: ${context.condition}`,
          'Comparison operators suggest numeric type'
        ],
        sources: ['conditional-analysis']
      };
    }

    if (condition.includes(varName) && /==|!=/.test(condition)) {
      return {
        type: 'string',
        confidence: 0.6,
        reasoning: [
          `Variable used in equality comparison: ${context.condition}`,
          'Equality comparison suggests string or comparable type'
        ],
        sources: ['conditional-analysis']
      };
    }
  }

  // "is" operator checks
  if (condition.includes(`${varName} is`)) {
    if (condition.includes('empty') || condition.includes('null') || condition.includes('none')) {
      return {
        type: 'string',
        confidence: 0.5,
        reasoning: [
          `Variable checked for emptiness: ${context.condition}`,
          'Empty checks suggest string or collection type'
        ],
        sources: ['conditional-analysis']
      };
    }

    if (condition.includes('number') || condition.includes('integer')) {
      return {
        type: 'number',
        confidence: 0.8,
        reasoning: [
          `Variable explicitly checked as number: ${context.condition}`,
          'Type check indicates numeric type'
        ],
        sources: ['conditional-analysis']
      };
    }
  }

  return {
    type: 'string',
    confidence: 0.1,
    reasoning: ['No strong type indicators in conditional context'],
    sources: ['conditional-analysis']
  };
}

/**
 * Analyzes variable usage in loop contexts
 */
function analyzeInLoopContext(
  variableName: string,
  context: ControlStructureContext
): TypeInferenceResult {
  const condition = context.condition.toLowerCase();
  const varName = variableName.toLowerCase();

  // Loop variables are typically elements of iterables
  if (condition.includes(`${varName} in`)) {
    return {
      type: 'string',
      confidence: 0.4,
      reasoning: [
        `Variable used as loop iterator: ${context.condition}`,
        'Loop variables typically represent collection elements'
      ],
      sources: ['loop-analysis']
    };
  }

  // Variables used in range() are numeric
  if (condition.includes('range(') && condition.includes(varName)) {
    return {
      type: 'number',
      confidence: 0.7,
      reasoning: [
        `Variable used with range(): ${context.condition}`,
        'Range operations suggest numeric iteration'
      ],
      sources: ['loop-analysis']
    };
  }

  // Variables iterated over suggest they are collections
  if (condition.includes(`in ${varName}`)) {
    return {
      type: 'json',
      confidence: 0.6,
      reasoning: [
        `Variable used as iterable: ${context.condition}`,
        'Variables iterated over are typically arrays or objects'
      ],
      sources: ['loop-analysis']
    };
  }

  return {
    type: 'string',
    confidence: 0.2,
    reasoning: ['No strong type indicators in loop context'],
    sources: ['loop-analysis']
  };
}

/**
 * Analyzes variable usage in assignment contexts
 */
function analyzeInAssignmentContext(
  variableName: string,
  context: ControlStructureContext
): TypeInferenceResult {
  const body = context.body.toLowerCase();
  const varName = variableName.toLowerCase();

  // Direct value assignments
  if (body.includes(varName)) {
    // Numeric literals
    if (/\b\s*[0-9]+(\.[0-9]+)?\b/.test(body)) {
      return {
        type: 'number',
        confidence: 0.9,
        reasoning: [
          `Variable assigned numeric value: ${context.body}`,
          'Numeric literal assignment detected'
        ],
        sources: ['assignment-analysis']
      };
    }

    // String literals
    if (/'[^']*'/.test(body) || /"[^"]*"/.test(body)) {
      return {
        type: 'string',
        confidence: 0.8,
        reasoning: [
          `Variable assigned string value: ${context.body}`,
          'String literal assignment detected'
        ],
        sources: ['assignment-analysis']
      };
    }

    // Boolean literals
    if (/\b(true|false)\b/.test(body)) {
      return {
        type: 'boolean',
        confidence: 0.95,
        reasoning: [
          `Variable assigned boolean value: ${context.body}`,
          'Boolean literal assignment detected'
        ],
        sources: ['assignment-analysis']
      };
    }

    // Array/object literals
    if (/\[[^\]]*\]|\{[^}]*\}/.test(body)) {
      return {
        type: 'json',
        confidence: 0.85,
        reasoning: [
          `Variable assigned complex value: ${context.body}`,
          'Array or object literal assignment detected'
        ],
        sources: ['assignment-analysis']
      };
    }
  }

  return {
    type: 'string',
    confidence: 0.3,
    reasoning: ['No clear type indicators in assignment context'],
    sources: ['assignment-analysis']
  };
}

/**
 * Infers type based purely on variable name patterns
 */
function inferTypeFromName(variableName: string): TypeInferenceResult {
  const name = variableName.toLowerCase();

  // Boolean indicators
  const booleanPrefixes = ['is_', 'has_', 'can_', 'should_', 'would_', 'could_', 'will_', 'do_', 'does_'];
  const booleanSuffixes = ['_enabled', '_disabled', '_active', '_inactive', '_visible', '_hidden'];
  const booleanWords = ['enabled', 'disabled', 'active', 'inactive', 'visible', 'hidden', 'true', 'false'];

  for (const prefix of booleanPrefixes) {
    if (name.startsWith(prefix)) {
      return {
        type: 'boolean',
        confidence: 0.85,
        reasoning: [`Variable name starts with boolean prefix: ${prefix}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  for (const suffix of booleanSuffixes) {
    if (name.endsWith(suffix)) {
      return {
        type: 'boolean',
        confidence: 0.8,
        reasoning: [`Variable name ends with boolean suffix: ${suffix}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  for (const word of booleanWords) {
    if (name.includes(word)) {
      return {
        type: 'boolean',
        confidence: 0.6,
        reasoning: [`Variable name contains boolean word: ${word}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  // Numeric indicators
  const numericSuffixes = ['_count', '_total', '_sum', '_limit', '_offset', '_size', '_length', '_index', '_id'];
  const numericWords = ['count', 'total', 'sum', 'limit', 'offset', 'size', 'length', 'index', 'num', 'number'];

  for (const suffix of numericSuffixes) {
    if (name.endsWith(suffix)) {
      return {
        type: 'number',
        confidence: 0.9,
        reasoning: [`Variable name ends with numeric suffix: ${suffix}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  for (const word of numericWords) {
    if (name.includes(word)) {
      return {
        type: 'number',
        confidence: 0.7,
        reasoning: [`Variable name contains numeric word: ${word}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  // Date/datetime indicators
  const dateSuffixes = ['_date', '_time', '_at', '_on', '_created', '_updated', '_modified', '_start', '_end'];
  const dateWords = ['date', 'time', 'created', 'updated', 'modified', 'start', 'end'];

  for (const suffix of dateSuffixes) {
    if (name.endsWith(suffix)) {
      return {
        type: 'date',
        confidence: 0.85,
        reasoning: [`Variable name ends with date suffix: ${suffix}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  for (const word of dateWords) {
    if (name.includes(word)) {
      return {
        type: 'date',
        confidence: 0.6,
        reasoning: [`Variable name contains date word: ${word}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  // Email indicators
  if (name.includes('email') || name.includes('mail')) {
    return {
      type: 'email',
      confidence: 0.9,
      reasoning: ['Variable name indicates email address'],
      sources: ['naming-pattern-analysis']
    };
  }

  // URL indicators
  if (name.includes('url') || name.includes('link') || name.includes('href')) {
    return {
      type: 'url',
      confidence: 0.85,
      reasoning: ['Variable name indicates URL'],
      sources: ['naming-pattern-analysis']
    };
  }

  // UUID indicators
  if (name.includes('uuid') || name.includes('guid')) {
    return {
      type: 'uuid',
      confidence: 0.9,
      reasoning: ['Variable name indicates UUID/GUID'],
      sources: ['naming-pattern-analysis']
    };
  }

  // JSON/collection indicators
  const collectionSuffixes = ['_list', '_array', '_map', '_dict', '_object', '_json', '_config', '_settings'];
  const collectionWords = ['list', 'array', 'map', 'dict', 'object', 'json', 'config', 'settings', 'options'];

  for (const suffix of collectionSuffixes) {
    if (name.endsWith(suffix)) {
      return {
        type: 'json',
        confidence: 0.8,
        reasoning: [`Variable name ends with collection suffix: ${suffix}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  for (const word of collectionWords) {
    if (name.includes(word)) {
      return {
        type: 'json',
        confidence: 0.6,
        reasoning: [`Variable name contains collection word: ${word}`],
        sources: ['naming-pattern-analysis']
      };
    }
  }

  return {
    type: 'string',
    confidence: 0.3,
    reasoning: ['No specific type indicators in variable name'],
    sources: ['naming-pattern-analysis']
  };
}

/**
 * Extracts variable names from a condition expression
 */
function extractVariablesFromCondition(condition: string): string[] {
  // Extract variable names from Jinja2 expressions
  const variablePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
  const variables: string[] = [];
  let match;

  while ((match = variablePattern.exec(condition)) !== null) {
    const varName = match[1];
    // Filter out common keywords and operators
    if (!['and', 'or', 'not', 'in', 'is', 'defined', 'undefined', 'none', 'null', 'true', 'false', 'empty'].includes(varName.toLowerCase())) {
      variables.push(varName);
    }
  }

  return [...new Set(variables)]; // Remove duplicates
}

/**
 * Gets the line number for a given position in the template
 */
function getLineNumber(template: string, position: number): number {
  const before = template.substring(0, position);
  return before.split('\n').length;
}

/**
 * Performs comprehensive type inference for all variables in a template
 */
export function performTypeInference(template: string, variables: Jinja2Variable[]): {
  enhancedVariables: EnhancedVariable[];
  confidence: number;
  accuracy: {
    boolean: number;
    array: number;
    string: number;
    numeric: number;
  };
} {
  const contexts = analyzeControlStructures(template);
  const enhancedVariables: EnhancedVariable[] = [];
  let totalConfidence = 0;
  let inferenceCount = 0;
  const accuracy = { boolean: 0, array: 0, string: 0, numeric: 0 };

  for (const variable of variables) {
    const inference = inferTypeFromContext(variable.name, contexts);

    // Calculate accuracy for different categories
    if (inference.type === 'boolean') accuracy.boolean++;
    else if (inference.type === 'json') accuracy.array++;
    else if (inference.type === 'string') accuracy.string++;
    else if (inference.type === 'number' || inference.type === 'integer') accuracy.numeric++;

    totalConfidence += inference.confidence;
    inferenceCount++;

    enhancedVariables.push({
      ...variable,
      type: inference.type,
      confidence: inference.confidence,
      reasoning: inference.reasoning,
      context: {
        semanticContext: inference.reasoning.join('; '),
        controlStructures: contexts.filter(c =>
          c.variablesInScope.includes(variable.name)
        ),
        templateContext: getTemplateContext(template, variable.name)
      }
    });
  }

  return {
    enhancedVariables,
    confidence: inferenceCount > 0 ? totalConfidence / inferenceCount : 0,
    accuracy
  };
}

/**
 * Gets overall template context information
 */
function getTemplateContext(template: string, variableName: string): TemplateContext {
  const contexts = analyzeControlStructures(template);
  const variableContexts = contexts.filter(c =>
    c.variablesInScope.includes(variableName)
  );

  return {
    filename: '', // Will be populated by caller
    lineNumber: 0,
    templateSize: template.length,
    variableCount: contexts.reduce((sum, c) => sum + c.variablesInScope.length, 0),
    hasLoops: variableContexts.some(c => c.type === 'loop'),
    hasConditionals: variableContexts.some(c => c.type === 'conditional'),
    hasAssignments: variableContexts.some(c => c.type === 'assignment')
  };
}

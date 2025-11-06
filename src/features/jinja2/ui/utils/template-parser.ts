/**
 * Template Parser for V2 Editor
 *
 * Parses Jinja2 templates and extracts variable positions and context
 */

import type {
  EnhancedVariable,

  VariableContext,
  TemplateHighlight,
  TemplateStats,
  Jinja2Variable
} from '../types.js';
import { createJinja2Variable, analyzeControlStructures, performTypeInference } from './variable-utils.js';

/**
 * Regular expressions for Jinja2 syntax parsing
 */
const JINJA2_PATTERNS = {

  VARIABLE: /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*\}\}/g,

  BLOCK: /\{%\s*(if|elif|else|endif|for|endfor|set|macro|include|extends|block|endblock)[^%]*%\}/g,

  COMMENT: /\{#[\s\S]*?#\}/g,

  FILTER: /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)/g,

  IF_CONDITION: /\{%\s*(if|elif)\s+([^%]+?)\s*%\}/g,
  FOR_LOOP: /\{%\s*for\s+(\w+)\s+in\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\s*%\}/g,
  SET_ASSIGNMENT: /\{%\s*set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^%]+?)\s*%\}/g,

  VARIABLE_IN_EXPRESSION: /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\b/g
};

/**
 * Context window size for variable analysis
 */
const CONTEXT_WINDOW = 100;

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
 * Enhanced template parsing with contextual type inference
 * This function provides superior type accuracy by analyzing control structures
 */
export function parseTemplateWithEnhancedInference(template: string): TemplateHighlight & {
  typeInference: {
    confidence: number;
    accuracy: {
      boolean: number;
      array: number;
      string: number;
      numeric: number;
    };
    };
  controlStructures: any[];
} {
  // First, perform basic variable extraction
  const basicVariables = extractVariables(template);

  // Apply enhanced type inference
  const inferenceResult = performTypeInference(template, basicVariables);

  // Calculate enhanced statistics
  const stats = calculateEnhancedStats(template, inferenceResult.enhancedVariables);

  // Create HTML highlighting with enhanced type information
  const highlightedHTML = createEnhancedHighlightedHTML(template, inferenceResult.enhancedVariables);

  // Analyze control structures for context
  const controlStructures = analyzeControlStructures(template);

  return {
    variables: inferenceResult.enhancedVariables,
    highlightedHTML,
    stats,
    typeInference: {
      confidence: inferenceResult.confidence,
      accuracy: inferenceResult.accuracy
    },
    controlStructures
  };
}

/**
 * Extract variables from template with position and context information
 */
function extractVariables(template: string): EnhancedVariable[] {
  const variables: EnhancedVariable[] = [];
  const variableMap = new Map<string, EnhancedVariable>();


  JINJA2_PATTERNS.VARIABLE.lastIndex = 0;

  let match;
  while ((match = JINJA2_PATTERNS.VARIABLE.exec(template)) !== null) {
    const fullMatch = match[0];
    const variableName = match[1];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;


    const beforeText = template.substring(0, startIndex);
    const lines = beforeText.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;


    const context = extractContext(template, startIndex, endIndex);


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


    if (variableMap.has(variableName)) {
      const _existing = variableMap.get(variableName)!;

    } else {
      variableMap.set(variableName, enhancedVar);
      variables.push(enhancedVar);
    }
  }


  const controlStructureVariables = extractVariablesFromControlStructures(template);


  for (const variable of controlStructureVariables) {
    if (!variableMap.has(variable.name)) {
      variableMap.set(variable.name, variable);
      variables.push(variable);
    }
  }

  return variables;
}

/**
 * Extract variables from Jinja2 control structures (if, for, set statements)
 */
function extractVariablesFromControlStructures(template: string): EnhancedVariable[] {
  const variables: EnhancedVariable[] = [];
  const processedVariables = new Set<string>();


  JINJA2_PATTERNS.IF_CONDITION.lastIndex = 0;
  let ifMatch;
  while ((ifMatch = JINJA2_PATTERNS.IF_CONDITION.exec(template)) !== null) {
    const fullMatch = ifMatch[0];
    const condition = ifMatch[2];
    const startIndex = ifMatch.index;
    const endIndex = startIndex + fullMatch.length;


    const conditionVariables = extractVariablesFromExpression(condition, startIndex, endIndex, 'conditional');

    for (const variable of conditionVariables) {
      if (!processedVariables.has(variable.name)) {
        processedVariables.add(variable.name);
        variables.push(variable);
      }
    }
  }


  JINJA2_PATTERNS.FOR_LOOP.lastIndex = 0;
  let forMatch;
  while ((forMatch = JINJA2_PATTERNS.FOR_LOOP.exec(template)) !== null) {
    const fullMatch = forMatch[0];
    const loopVar = forMatch[1];
    const collectionVar = forMatch[2];
    const startIndex = forMatch.index;
    const endIndex = startIndex + fullMatch.length;


    const beforeText = template.substring(0, startIndex);
    const lines = beforeText.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;


    const context = extractContext(template, startIndex, endIndex);


    if (!processedVariables.has(loopVar)) {
      const loopVariable: EnhancedVariable = {
        ...createJinja2Variable(loopVar, inferVariableType(loopVar, { ...context, semanticContext: 'loop' })),
        position: {
          startIndex,
          endIndex,
          line,
          column,
          name: loopVar,
          fullMatch
        },
        context: { ...context, semanticContext: 'loop' }
      };

      processedVariables.add(loopVar);
      variables.push(loopVariable);
    }


    if (!processedVariables.has(collectionVar)) {
      const collectionVariable: EnhancedVariable = {
        ...createJinja2Variable(collectionVar, inferVariableType(collectionVar, { ...context, semanticContext: 'array' })),
        position: {
          startIndex,
          endIndex,
          line,
          column,
          name: collectionVar,
          fullMatch
        },
        context: { ...context, semanticContext: 'array' }
      };

      processedVariables.add(collectionVar);
      variables.push(collectionVariable);
    }
  }


  JINJA2_PATTERNS.SET_ASSIGNMENT.lastIndex = 0;
  let setMatch;
  while ((setMatch = JINJA2_PATTERNS.SET_ASSIGNMENT.exec(template)) !== null) {
    const fullMatch = setMatch[0];
    const varName = setMatch[1];
    const value = setMatch[2];
    const startIndex = setMatch.index;
    const endIndex = startIndex + fullMatch.length;


    const beforeText = template.substring(0, startIndex);
    const lines = beforeText.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;


    const context = extractContext(template, startIndex, endIndex);


    if (!processedVariables.has(varName)) {
      const assignedVariable: EnhancedVariable = {
        ...createJinja2Variable(varName, inferVariableType(varName, { ...context, semanticContext: 'assignment' })),
        position: {
          startIndex,
          endIndex,
          line,
          column,
          name: varName,
          fullMatch
        },
        context: { ...context, semanticContext: 'assignment' }
      };

      processedVariables.add(varName);
      variables.push(assignedVariable);
    }


    const valueVariables = extractVariablesFromExpression(value, startIndex, endIndex, 'assignment_value');
    for (const variable of valueVariables) {
      if (!processedVariables.has(variable.name)) {
        processedVariables.add(variable.name);
        variables.push(variable);
      }
    }
  }

  return variables;
}

/**
 * Extract variables from a Jinja2 expression (condition, assignment value, etc.)
 */
function extractVariablesFromExpression(
  expression: string,
  startIndex: number,
  endIndex: number,
  semanticContext: string
): EnhancedVariable[] {
  const variables: EnhancedVariable[] = [];


  JINJA2_PATTERNS.VARIABLE_IN_EXPRESSION.lastIndex = 0;

  let match;
  while ((match = JINJA2_PATTERNS.VARIABLE_IN_EXPRESSION.exec(expression)) !== null) {
    const variableName = match[1];


    const skipWords = new Set([
      'if', 'elif', 'else', 'endif', 'for', 'endfor', 'set', 'endset',
      'in', 'and', 'or', 'not', 'is', 'defined', 'undefined', 'none', 'null',
      'true', 'false', 'length', 'first', 'last', 'sort', 'reverse', 'round',
      'int', 'float', 'string', 'list', 'dict', 'range', 'lipsum', 'cycler'
    ]);

    if (skipWords.has(variableName.toLowerCase())) {
      continue;
    }


    const beforeText = expression.substring(0, match.index);
    const lines = beforeText.split('\n');
    const line = 1;
    const column = lines[lines.length - 1].length + 1;


    const context: VariableContext = {
      surroundingText: { before: expression.substring(0, match.index), after: expression.substring(match.index + variableName.length) },
      semanticContext,
      relatedVariables: []
    };


    const enhancedVar: EnhancedVariable = {
      ...createJinja2Variable(variableName, inferVariableType(variableName, context)),
      position: {
        startIndex: startIndex + match.index,
        endIndex: startIndex + match.index + variableName.length,
        line,
        column,
        name: variableName,
        fullMatch: variableName
      },
      context
    };

    variables.push(enhancedVar);
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


  const semanticContext = inferSemanticContext(before, after);


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


  if (surrounding.includes('if') || surrounding.includes('elif')) return 'conditional';
  if (surrounding.includes('for')) return 'loop';
  if (surrounding.includes('set')) return 'assignment';


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


  JINJA2_PATTERNS.VARIABLE.lastIndex = 0;
  let match;
  while ((match = JINJA2_PATTERNS.VARIABLE.exec(context)) !== null) {
    const varName = match[1];
    if (varName !== match[1]) {
      related.push(varName);
    }
  }


  return [...new Set(related)].slice(0, 5);
}

/**
 * Infer variable type from name and context
 */
function inferVariableType(variableName: string, context: VariableContext): Jinja2Variable['type'] {
  const name = variableName.toLowerCase();
  const semanticContext = context.semanticContext.toLowerCase();


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


  const variablesByType: Record<string, number> = {};
  variables.forEach(v => {
    variablesByType[v.type] = (variablesByType[v.type] || 0) + 1;
  });


  let complexity: 'simple' | 'medium' | 'complex' = 'simple';


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


  const sortedVars = [...variables].sort((a, b) => a.position.startIndex - b.position.startIndex);

  sortedVars.forEach(variable => {
    const pos = variable.position;
    const adjustedStart = pos.startIndex + offset;
    const adjustedEnd = pos.endIndex + offset;

    const before = html.substring(0, adjustedStart);
    const varText = html.substring(adjustedStart, adjustedEnd);
    const after = html.substring(adjustedEnd);


    const highlightedVar = `<span class="variable-highlight" data-variable="${variable.name}" data-index="${variables.indexOf(variable)}">${varText}</span>`;

    html = before + highlightedVar + after;
    offset += highlightedVar.length - varText.length;
  });


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

    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;


    return a.position.startIndex - b.position.startIndex;
  });
}

// ===== Enhanced Template Parsing Functions =====

/**
 * Calculate enhanced statistics including type inference accuracy
 */
function calculateEnhancedStats(template: string, enhancedVariables: EnhancedVariable[]): TemplateStats & {
  typeInferenceAccuracy: {
    boolean: number;
    array: number;
    string: number;
    numeric: number;
  };
  confidenceScore: number;
} {
  const basicStats = calculateStats(template, enhancedVariables);

  // Calculate type inference accuracy
  const typeInferenceAccuracy = {
    boolean: 0,
    array: 0,
    string: 0,
    numeric: 0
  };

  let totalConfidence = 0;
  let variablesWithConfidence = 0;

  enhancedVariables.forEach(variable => {
    if (variable.confidence !== undefined) {
      totalConfidence += variable.confidence;
      variablesWithConfidence++;

      // Categorize by type for accuracy metrics
      switch (variable.type) {
        case 'boolean':
          typeInferenceAccuracy.boolean++;
          break;
        case 'json':
          typeInferenceAccuracy.array++;
          break;
        case 'string':
        case 'email':
        case 'url':
        case 'uuid':
          typeInferenceAccuracy.string++;
          break;
        case 'number':
        case 'integer':
          typeInferenceAccuracy.numeric++;
          break;
      }
    }
  });

  const confidenceScore = variablesWithConfidence > 0 ? totalConfidence / variablesWithConfidence : 0;

  return {
    ...basicStats,
    typeInferenceAccuracy,
    confidenceScore
  };
}

/**
 * Create HTML with enhanced highlighting that includes confidence indicators
 */
function createEnhancedHighlightedHTML(template: string, enhancedVariables: EnhancedVariable[]): string {
  let html = template;
  let offset = 0;

  // Sort variables by position to ensure correct highlighting order
  const sortedVars = [...enhancedVariables].sort((a, b) => a.position.startIndex - b.position.startIndex);

  sortedVars.forEach(variable => {
    const pos = variable.position;
    const adjustedStart = pos.startIndex + offset;
    const adjustedEnd = pos.endIndex + offset;

    const before = html.substring(0, adjustedStart);
    const varText = html.substring(adjustedStart, adjustedEnd);
    const after = html.substring(adjustedEnd);

    // Create enhanced highlight with confidence information
    const confidence = variable.confidence || 0;
    const confidenceClass = getConfidenceClass(confidence);
    const typeClass = `type-${variable.type}`;

    const highlightedVar = `<span class="variable-enhanced-highlight ${confidenceClass} ${typeClass}" data-variable="${variable.name}" data-type="${variable.type}" data-confidence="${confidence}" data-index="${enhancedVariables.indexOf(variable)}">${varText}</span>`;

    html = before + highlightedVar + after;
    offset += highlightedVar.length - varText.length;
  });

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
 * Get confidence class for CSS styling
 */
function getConfidenceClass(confidence: number): string {
  if (confidence >= 0.8) return 'confidence-high';
  if (confidence >= 0.6) return 'confidence-medium';
  if (confidence >= 0.4) return 'confidence-low';
  return 'confidence-very-low';
}

/**
 * Extract control structure information for enhanced context
 */
export function extractControlStructureContext(template: string, variableName: string): {
  inConditional: boolean;
  inLoop: boolean;
  inAssignment: boolean;
  relatedStructures: Array<{
    type: 'conditional' | 'loop' | 'assignment';
    line: number;
    content: string;
  }>;
} {
  const controlStructures = analyzeControlStructures(template);
  const variableStructures = controlStructures.filter(structure =>
    structure.variablesInScope.includes(variableName)
  );

  return {
    inConditional: variableStructures.some(s => s.type === 'conditional'),
    inLoop: variableStructures.some(s => s.type === 'loop'),
    inAssignment: variableStructures.some(s => s.type === 'assignment'),
    relatedStructures: variableStructures.map(s => ({
      type: s.type,
      line: s.line,
      content: s.condition
    }))
  };
}

/**
 * Validate type inference accuracy for testing and debugging
 */
export function validateTypeInference(
  template: string,
  expectedTypes: Record<string, string>
): {
  accuracy: number;
  correctInferences: number;
  totalInferences: number;
  errors: Array<{
    variable: string;
    expectedType: string;
    actualType: string;
    confidence: number;
  }>;
} {
  const parsingResult = parseTemplateWithEnhancedInference(template);
  let correctInferences = 0;
  const errors: Array<{
    variable: string;
    expectedType: string;
    actualType: string;
    confidence: number;
  }> = [];

  Object.entries(expectedTypes).forEach(([variableName, expectedType]) => {
    const variable = parsingResult.variables.find(v => v.name === variableName);
    if (variable) {
      if (variable.type === expectedType) {
        correctInferences++;
      } else {
        errors.push({
          variable: variableName,
          expectedType,
          actualType: variable.type,
          confidence: variable.confidence || 0
        });
      }
    }
  });

  const totalInferences = Object.keys(expectedTypes).length;
  const accuracy = totalInferences > 0 ? correctInferences / totalInferences : 0;

  return {
    accuracy,
    correctInferences,
    totalInferences,
    errors
  };
}

/**
 * Get type inference suggestions for improvement
 */
export function getTypeInferenceSuggestions(template: string): Array<{
  variable: string;
  currentType: string;
  currentConfidence: number;
  suggestions: Array<{
    type: string;
    reason: string;
    confidence: number;
  }>;
}> {
  const parsingResult = parseTemplateWithEnhancedInference(template);
  const suggestions: Array<{
    variable: string;
    currentType: string;
    currentConfidence: number;
    suggestions: Array<{
      type: string;
      reason: string;
      confidence: number;
    }>;
  }> = [];

  // Find variables with low confidence that could be improved
  parsingResult.variables
    .filter(variable => (variable.confidence || 0) < 0.7)
    .forEach(variable => {
      const controlContext = extractControlStructureContext(template, variable.name);
      const variableSuggestions: Array<{
        type: string;
        reason: string;
        confidence: number;
      }> = [];

      // Analyze control structures for better type suggestions
      if (controlContext.inConditional) {
        variableSuggestions.push({
          type: 'boolean',
          reason: 'Variable appears in conditional context',
          confidence: 0.8
        });
      }

      if (controlContext.inLoop) {
        if (variable.name.toLowerCase().includes('index')) {
          variableSuggestions.push({
            type: 'integer',
            reason: 'Loop index variable detected',
            confidence: 0.9
          });
        }
      }

      if (variableSuggestions.length > 0) {
        suggestions.push({
          variable: variable.name,
          currentType: variable.type,
          currentConfidence: variable.confidence || 0,
          suggestions: variableSuggestions
        });
      }
    });

  return suggestions;
}

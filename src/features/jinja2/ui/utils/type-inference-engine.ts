/**
 * Contextual type inference engine for enhanced variable typing
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type {
  TypeInferenceResult,
  ControlStructure,
  Assignment,
  FilterUsage,
  TypeConstraint,
  TypeConstraintGraph
} from '../types/enhanced-variable';
import type { Jinja2VariableType, Jinja2VariableValue } from '../types/types';
import { enhancedTemplateParser } from './enhanced-template-parser';
import { analyzeControlStructures, inferTypeFromContext, performTypeInference } from './variable-utils';

/**
 * Type inference options
 */
export interface TypeInferenceOptions {
  includeAlternatives?: boolean;
  maxAlternatives?: number;
  minConfidence?: number;
  enableContextualAnalysis?: boolean;
  enableFilterAnalysis?: boolean;
  enableNamingAnalysis?: boolean;
}

/**
 * Inference context information
 */
export interface InferenceContext {
  variableName: string;
  template: string;
  currentValue?: Jinja2VariableValue;
  surroundingText?: { before: string; after: string };
  controlStructures?: ControlStructure[];
  assignments?: Assignment[];
  filterUsages?: FilterUsage[];
}

/**
 * Enhanced type inference engine
 */
export class TypeInferenceEngine {
  private readonly defaultOptions: Required<TypeInferenceOptions> = {
    includeAlternatives: true,
    maxAlternatives: 3,
    minConfidence: 0.1,
    enableContextualAnalysis: true,
    enableFilterAnalysis: true,
    enableNamingAnalysis: true
  };

  /**
   * Infer type for a variable based on context
   */
  public inferVariableType(
    context: InferenceContext,
    options?: TypeInferenceOptions
  ): TypeInferenceResult {
    const opts = { ...this.defaultOptions, ...options };
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    try {
      // === Enhanced Contextual Analysis Using New Functions ===

      // Use enhanced contextual analysis from variable-utils.ts
      if (opts.enableContextualAnalysis && context.template) {
        const controlStructures = analyzeControlStructures(context.template);
        const contextualInference = inferTypeFromContext(context.variableName, controlStructures);

        if (contextualInference.confidence > 0.3) {
          inferences.push({
            type: contextualInference.type as Jinja2VariableType,
            confidence: contextualInference.confidence,
            reason: contextualInference.reasoning.join('; '),
            source: 'enhanced-context'
          });
        }
      }

      // Analyze current value if provided
      if (context.currentValue !== undefined && context.currentValue !== null) {
        const valueInference = this.inferTypeFromValue(context.currentValue);
        inferences.push({
          type: valueInference.type,
          confidence: valueInference.confidence,
          reason: valueInference.reason,
          source: 'value'
        });
      }

      // Naming-based inference (enhanced)
      if (opts.enableNamingAnalysis) {
        const namingInference = this.inferTypeFromNaming(context.variableName);
        inferences.push({
          type: namingInference.type,
          confidence: namingInference.confidence,
          reason: namingInference.reason,
          source: 'naming'
        });
      }

      // Legacy contextual analysis from control structures
      if (opts.enableContextualAnalysis && context.controlStructures) {
        const contextualInferences = this.inferTypeFromContext(
          context.variableName,
          context.controlStructures,
          context.assignments || []
        );

        inferences.push(...contextualInferences);
      }

      // Filter-based inference
      if (opts.enableFilterAnalysis && context.filterUsages) {
        const filterInferences = this.inferTypeFromFilters(
          context.variableName,
          context.filterUsages
        );

        inferences.push(...filterInferences);
      }

      // Analyze surrounding text for clues
      if (context.surroundingText) {
        const surroundingInference = this.inferTypeFromSurroundingText(
          context.variableName,
          context.surroundingText
        );

        if (surroundingInference) {
          inferences.push(surroundingInference);
        }
      }

      // === Advanced Constraint Analysis ===

      // Apply cross-variable constraint analysis
      if (opts.enableContextualAnalysis && context.template) {
        const constraintInferences = this.analyzeVariableConstraints(
          context.variableName,
          context.template,
          context.assignments || []
        );
        inferences.push(...constraintInferences);
      }

      // Select the best inference
      const bestInference = this.selectBestInference(inferences, opts);

      // Generate alternatives if requested
      const alternatives = opts.includeAlternatives
        ? this.generateAlternatives(inferences, bestInference, opts)
        : undefined;

      return {
        type: bestInference.type,
        confidence: bestInference.confidence,
        reasons: [bestInference.reason],
        alternatives,
        source: bestInference.source as any
      };

    } catch (error) {
      // Return fallback inference
      return {
        type: 'string',
        confidence: 0.1,
        reasons: ['Inference failed, defaulting to string'],
        source: 'manual'
      };
    }
  }

  /**
   * Infer type for multiple variables
   */
  public inferVariableTypes(
    contexts: InferenceContext[],
    options?: TypeInferenceOptions
  ): Map<string, TypeInferenceResult> {
    const results = new Map<string, TypeInferenceResult>();

    // Build constraint graph for relationship analysis
    const constraintGraph = this.buildConstraintGraph(contexts);

    contexts.forEach(context => {
      const result = this.inferVariableType(context, options);

      // Apply constraint-based refinements
      const refinedResult = this.applyConstraintBasedRefinements(
        context.variableName,
        result,
        constraintGraph
      );

      results.set(context.variableName, refinedResult);
    });

    return results;
  }

  /**
   * Infer type from value analysis
   */
  private inferTypeFromValue(value: Jinja2VariableValue): { type: Jinja2VariableType; confidence: number; reason: string } {
    if (value === null || value === undefined) {
      return { type: 'null', confidence: 1.0, reason: 'Value is null or undefined' };
    }

    if (typeof value === 'boolean') {
      return { type: 'boolean', confidence: 1.0, reason: 'Value is boolean' };
    }

    if (typeof value === 'number') {
      const type = Number.isInteger(value) ? 'integer' : 'number';
      return {
        type,
        confidence: 1.0,
        reason: `Value is ${type === 'integer' ? 'integer' : 'floating-point'} number`
      };
    }

    if (value instanceof Date) {
      return { type: 'datetime', confidence: 1.0, reason: 'Value is Date object' };
    }

    if (Array.isArray(value)) {
      return { type: 'array', confidence: 1.0, reason: 'Value is array' };
    }

    if (typeof value === 'object') {
      return { type: 'object', confidence: 0.9, reason: 'Value is object' };
    }

    if (typeof value === 'string') {
      // More specific string type inference
      if (this.isEmail(value)) {
        return { type: 'email', confidence: 0.9, reason: 'String matches email pattern' };
      }
      if (this.isUrl(value)) {
        return { type: 'url', confidence: 0.9, reason: 'String matches URL pattern' };
      }
      if (this.isUuid(value)) {
        return { type: 'uuid', confidence: 0.95, reason: 'String matches UUID pattern' };
      }
      if (this.isTimeString(value)) {
        return { type: 'time', confidence: 0.8, reason: 'String matches time format' };
      }
      if (this.isDateString(value)) {
        return { type: 'date', confidence: 0.8, reason: 'String matches date format' };
      }
      if (this.isJsonString(value)) {
        return { type: 'json', confidence: 0.7, reason: 'String appears to be JSON' };
      }

      return { type: 'string', confidence: 0.6, reason: 'Value is string' };
    }

    return { type: 'string', confidence: 0.1, reason: 'Unknown type, defaulting to string' };
  }

  /**
   * Infer type from naming patterns
   */
  private inferTypeFromNaming(variableName: string): { type: Jinja2VariableType; confidence: number; reason: string } {
    const name = variableName.toLowerCase();

    // Boolean patterns
    if (name.startsWith('is_') || name.startsWith('has_') || name.startsWith('can_') ||
        name.startsWith('should_') || name.startsWith('would_') || name.startsWith('could_') ||
        name.startsWith('will_') || name.endsWith('_enabled') || name.endsWith('_disabled') ||
        name.endsWith('_active') || name.endsWith('_visible') || name.endsWith('_available')) {
      return { type: 'boolean', confidence: 0.8, reason: 'Variable name suggests boolean value' };
    }

    // Numeric patterns
    if (name.includes('id') || name.includes('count') || name.includes('number') ||
        name.includes('amount') || name.includes('quantity') || name.includes('total') ||
        name.includes('sum') || name.includes('average') || name.includes('max') || name.includes('min')) {
      return { type: 'number', confidence: 0.7, reason: 'Variable name suggests numeric value' };
    }

    // Integer patterns
    if (name.includes('age') || name.includes('year') || name.includes('month') || name.includes('day') ||
        name.endsWith('_id') || name.endsWith('_count') || name.endsWith('_number')) {
      return { type: 'integer', confidence: 0.8, reason: 'Variable name suggests integer value' };
    }

    // Date/Time patterns
    if (name.includes('date') || name.includes('time') || name.includes('created') ||
        name.includes('updated') || name.includes('modified') || name.includes('expires')) {
      if (name.includes('time')) {
        return { type: 'time', confidence: 0.7, reason: 'Variable name suggests time value' };
      }
      return { type: 'date', confidence: 0.7, reason: 'Variable name suggests date value' };
    }

    // Email patterns
    if (name.includes('email') || name.includes('mail')) {
      return { type: 'email', confidence: 0.9, reason: 'Variable name suggests email address' };
    }

    // URL patterns
    if (name.includes('url') || name.includes('link') || name.includes('href') || name.includes('uri')) {
      return { type: 'url', confidence: 0.8, reason: 'Variable name suggests URL' };
    }

    // UUID patterns
    if (name.includes('uuid') || name.includes('guid')) {
      return { type: 'uuid', confidence: 0.9, reason: 'Variable name suggests UUID' };
    }

    // Array/List patterns
    if (name.endsWith('s') || name.endsWith('list') || name.endsWith('array') ||
        name.includes('items') || name.includes('elements') || name.includes('entries')) {
      return { type: 'array', confidence: 0.6, reason: 'Variable name suggests array or list' };
    }

    return { type: 'string', confidence: 0.3, reason: 'No specific naming pattern detected' };
  }

  /**
   * Infer type from control structures context
   */
  private inferTypeFromContext(
    variableName: string,
    controlStructures: ControlStructure[],
    assignments: Assignment[]
  ): Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> {
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    // Analyze control structures
    controlStructures.forEach(cs => {
      switch (cs.type) {
        case 'if':
          if (cs.condition?.includes(variableName)) {
            inferences.push({
              type: 'boolean',
              confidence: 0.9,
              reason: 'Variable used in {% if %} condition',
              source: 'context'
            });
          }
          break;

        case 'for':
          if (cs.iterator === variableName) {
            inferences.push({
              type: 'object',
              confidence: 0.85,
              reason: 'Variable is loop iterator in {% for %}',
              source: 'context'
            });
          } else if (cs.collection === variableName) {
            inferences.push({
              type: 'array',
              confidence: 0.85,
              reason: 'Variable is collection in {% for %}',
              source: 'context'
            });
          }
          break;

        case 'set':
          if (cs.assignment?.variableName === variableName) {
            const expression = cs.assignment.expression.trim();
            const typeFromExpression = this.inferTypeFromExpression(expression);

            inferences.push({
              type: typeFromExpression.type,
              confidence: typeFromExpression.confidence * 0.8, // Slightly lower confidence for expressions
              reason: `Variable assigned via {% set %} with expression: ${expression}`,
              source: 'context'
            });
          }
          break;
      }
    });

    // Analyze assignments
    assignments.forEach(assignment => {
      if (assignment.variableName === variableName) {
        const typeFromExpression = this.inferTypeFromExpression(assignment.expression);

        inferences.push({
          type: typeFromExpression.type,
          confidence: assignment.confidence * typeFromExpression.confidence,
          reason: `Variable assigned with expression: ${assignment.expression}`,
          source: 'context'
        });
      }
    });

    return inferences;
  }

  /**
   * Infer type from expression
   */
  private inferTypeFromExpression(expression: string): { type: Jinja2VariableType; confidence: number } {
    const expr = expression.trim();

    // String literals
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return { type: 'string', confidence: 1.0 };
    }
    if (expr.startsWith("'") && expr.endsWith("'")) {
      return { type: 'string', confidence: 1.0 };
    }

    // Numeric literals
    if (/^\d+$/.test(expr)) {
      return { type: 'integer', confidence: 1.0 };
    }
    if (/^\d+\.\d+$/.test(expr)) {
      return { type: 'number', confidence: 1.0 };
    }

    // Boolean literals
    if (/^(true|false)$/i.test(expr)) {
      return { type: 'boolean', confidence: 1.0 };
    }

    // Null/None
    if (/^(null|none)$/i.test(expr)) {
      return { type: 'null', confidence: 1.0 };
    }

    // Array literal
    if (expr.startsWith('[') && expr.endsWith(']')) {
      return { type: 'array', confidence: 0.9 };
    }

    // Object literal
    if (expr.startsWith('{') && expr.endsWith('}')) {
      return { type: 'object', confidence: 0.9 };
    }

    // Arithmetic operations suggest numeric
    if (/[\+\-\*\/]/.test(expr) && !/[a-zA-Z]/.test(expr)) {
      return { type: 'number', confidence: 0.8 };
    }

    // Default
    return { type: 'string', confidence: 0.1 };
  }

  /**
   * Infer type from filter usage
   */
  private inferTypeFromFilters(
    variableName: string,
    filterUsages: FilterUsage[]
  ): Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> {
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    filterUsages.forEach(filter => {
      if (filter.variableName === variableName) {
        const filterType = this.inferTypeFromFilter(filter.filterName);

        if (filterType) {
          inferences.push({
            type: filterType,
            confidence: 0.7,
            reason: `Variable used with |${filter.filterName} filter`,
            source: 'filter'
          });
        }
      }
    });

    return inferences;
  }

  /**
   * Infer type from specific filter
   */
  private inferTypeFromFilter(filterName: string): Jinja2VariableType | null {
    const filter = filterName.toLowerCase();

    // String filters
    const stringFilters = ['upper', 'lower', 'title', 'capitalize', 'trim', 'strip', 'lstrip', 'rstrip', 'replace', 'split', 'join'];
    if (stringFilters.includes(filter)) {
      return 'string';
    }

    // Numeric filters
    const numericFilters = ['round', 'int', 'float', 'abs', 'length', 'count', 'sum'];
    if (numericFilters.includes(filter)) {
      return 'number';
    }

    // Date/Time filters
    const dateFilters = ['date', 'time', 'datetime', 'strftime'];
    if (dateFilters.includes(filter)) {
      return 'datetime';
    }

    // Boolean filters
    const booleanFilters = ['bool', 'default', 'first', 'last', 'random'];
    if (booleanFilters.includes(filter)) {
      return 'boolean';
    }

    // Array filters
    const arrayFilters = ['list', 'map', 'select', 'reject', 'sort', 'reverse', 'slice', 'batch'];
    if (arrayFilters.includes(filter)) {
      return 'array';
    }

    // JSON filters
    if (filter === 'tojson' || filter === 'fromjson') {
      return 'json';
    }

    return null;
  }

  /**
   * Infer type from surrounding text
   */
  private inferTypeFromSurroundingText(
    variableName: string,
    surroundingText: { before: string; after: string }
  ): { type: Jinja2VariableType; confidence: number; reason: string; source: string } | null {
    const combined = (surroundingText.before + ' ' + surroundingText.after).toLowerCase();

    // SQL keywords suggest string types
    const sqlKeywords = ['select', 'from', 'where', 'insert', 'update', 'delete', 'join', 'order by', 'group by'];
    if (sqlKeywords.some(keyword => combined.includes(keyword))) {
      return {
        type: 'string',
        confidence: 0.6,
        reason: 'Variable appears in SQL context',
        source: 'surrounding'
      };
    }

    // Comparison operators suggest numeric
    if (/[><=]/.test(combined) && /\d/.test(combined)) {
      return {
        type: 'number',
        confidence: 0.5,
        reason: 'Variable appears in numeric comparison',
        source: 'surrounding'
      };
    }

    return null;
  }

  /**
   * Select best inference from multiple candidates
   */
  private selectBestInference(
    inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }>,
    options: Required<TypeInferenceOptions>
  ): { type: Jinja2VariableType; confidence: number; reason: string; source: string } {
    // Filter by minimum confidence
    const validInferences = inferences.filter(i => i.confidence >= options.minConfidence);

    if (validInferences.length === 0) {
      return {
        type: 'string',
        confidence: 0.1,
        reason: 'No confident inference found, defaulting to string',
        source: 'fallback'
      };
    }

    // Sort by confidence and source priority
    const sourcePriority = { value: 4, context: 3, filter: 2, naming: 1, surrounding: 0 };

    validInferences.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }

      const sourcePriorityDiff = sourcePriority[b.source as keyof typeof sourcePriority] - sourcePriority[a.source as keyof typeof sourcePriority];
      return sourcePriorityDiff;
    });

    return validInferences[0];
  }

  /**
   * Generate alternative type suggestions
   */
  private generateAlternatives(
    inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }>,
    bestInference: { type: Jinja2VariableType; confidence: number; reason: string; source: string },
    options: Required<TypeInferenceOptions>
  ): Array<{ type: Jinja2VariableType; confidence: number; reason: string }> {
    const alternatives: Array<{ type: Jinja2VariableType; confidence: number; reason: string }> = [];

    // Get other valid inferences
    const others = inferences
      .filter(i => i.type !== bestInference.type && i.confidence >= options.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, options.maxAlternatives);

    others.forEach(inference => {
      alternatives.push({
        type: inference.type,
        confidence: inference.confidence * 0.8, // Slightly reduce confidence for alternatives
        reason: inference.reason
      });
    });

    return alternatives;
  }

  /**
   * Build constraint graph for relationship analysis
   */
  private buildConstraintGraph(contexts: InferenceContext[]): TypeConstraintGraph {
    const graph: TypeConstraintGraph = {
      nodes: new Map(),
      edges: []
    };

    // This is a simplified implementation - could be expanded for more complex analysis
    contexts.forEach(context => {
      if (context.assignments) {
        context.assignments.forEach(assignment => {
          // Extract variable relationships from expressions
          const referencedVars = this.extractVariablesFromExpression(assignment.expression);

          referencedVars.forEach(refVar => {
            graph.edges.push({
              from: refVar,
              to: assignment.variableName,
              relationship: 'assignment',
              confidence: assignment.confidence
            });
          });
        });
      }
    });

    return graph;
  }

  /**
   * Apply constraint-based refinements
   */
  private applyConstraintBasedRefinements(
    variableName: string,
    result: TypeInferenceResult,
    constraintGraph: TypeConstraintGraph
  ): TypeInferenceResult {
    // Simple constraint propagation - could be enhanced
    const constraints = constraintGraph.edges.filter(edge => edge.to === variableName);

    // If variable is assigned from another variable with high confidence, adjust confidence
    constraints.forEach(constraint => {
      if (constraint.relationship === 'assignment' && constraint.confidence > 0.8) {
        result.confidence = Math.min(result.confidence * 1.1, 1.0);
      }
    });

    return result;
  }

  /**
   * Extract variables from expression
   */
  private extractVariablesFromExpression(expression: string): string[] {
    // Simple variable extraction - could be enhanced
    const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_]*\b/g;
    const matches = expression.match(variablePattern) || [];

    return matches.filter(match =>
      !['true', 'false', 'null', 'none'].includes(match.toLowerCase())
    );
  }

  // Helper methods for type checking
  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  private isUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  private isTimeString(value: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    return timeRegex.test(value);
  }

  private isDateString(value: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    return dateRegex.test(value) || !isNaN(Date.parse(value));
  }

  private isJsonString(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  // ===== Enhanced Contextual Analysis Methods =====

  /**
   * Analyze cross-variable constraints for better type inference
   */
  private analyzeVariableConstraints(
    variableName: string,
    template: string,
    assignments: Assignment[]
  ): Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> {
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    try {
      // Analyze variable relationships in assignments
      assignments.forEach(assignment => {
        if (assignment.expression.includes(variableName)) {
          const constraintType = this.inferConstraintType(assignment.expression, variableName);
          if (constraintType) {
            inferences.push({
              type: constraintType.type,
              confidence: constraintType.confidence * assignment.confidence,
              reason: constraintType.reason,
              source: 'constraint'
            });
          }
        }
      });

      // Analyze comparative constraints in the template
      const comparativeInferences = this.analyzeComparativeConstraints(variableName, template);
      inferences.push(...comparativeInferences);

      // Analyze loop constraints
      const loopInferences = this.analyzeLoopConstraints(variableName, template);
      inferences.push(...loopInferences);

      // Analyze conditional constraints
      const conditionalInferences = this.analyzeConditionalConstraints(variableName, template);
      inferences.push(...conditionalInferences);

    } catch (error) {
      // Silently fail constraint analysis
    }

    return inferences;
  }

  /**
   * Infer constraint type from expression
   */
  private inferConstraintType(expression: string, variableName: string): { type: Jinja2VariableType; confidence: number; reason: string } | null {
    const expr = expression.toLowerCase();

    // Check for boolean operations
    if (expr.includes(variableName.toLowerCase()) && (expr.includes(' and ') || expr.includes(' or '))) {
      return {
        type: 'boolean',
        confidence: 0.8,
        reason: `Variable used in boolean expression: ${expression}`
      };
    }

    // Check for arithmetic operations
    const arithmeticPattern = new RegExp(`\\b${variableName.toLowerCase()}\\s*[+\\-*/]`, 'i');
    if (arithmeticPattern.test(expr)) {
      return {
        type: 'number',
        confidence: 0.85,
        reason: `Variable used in arithmetic expression: ${expression}`
      };
    }

    // Check for string concatenation
    if (expr.includes('~') && expr.includes(variableName.toLowerCase())) {
      return {
        type: 'string',
        confidence: 0.8,
        reason: `Variable used in string concatenation: ${expression}`
      };
    }

    // Check for equality/inequality with literals
    const equalityWithNumber = new RegExp(`\\b${variableName.toLowerCase()}\\s*(==|!=)\\s*\\d+`, 'i');
    if (equalityWithNumber.test(expr)) {
      return {
        type: 'number',
        confidence: 0.7,
        reason: `Variable compared with numeric literal: ${expression}`
      };
    }

    return null;
  }

  /**
   * Analyze comparative constraints in template
   */
  private analyzeComparativeConstraints(variableName: string, template: string): Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> {
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    // Find comparison patterns
    const comparisonPatterns = [
      { pattern: new RegExp(`\\b${variableName}\\s*[><=]\\s*\\d+`, 'gi'), type: 'number', confidence: 0.8 },
      { pattern: new RegExp(`\\b${variableName}\\s*[><=]\\s*['"][^'"]*['"]`, 'gi'), type: 'string', confidence: 0.6 },
      { pattern: new RegExp(`\\b\\d+\\s*[><=]\\s*${variableName}`, 'gi'), type: 'number', confidence: 0.8 },
      { pattern: new RegExp(`\\b['"][^'"]*['"]\\s*[><=]\\s*${variableName}`, 'gi'), type: 'string', confidence: 0.6 }
    ];

    comparisonPatterns.forEach(({ pattern, type, confidence }) => {
      const matches = template.match(pattern);
      if (matches && matches.length > 0) {
        inferences.push({
          type: type as Jinja2VariableType,
          confidence,
          reason: `Variable appears in ${matches.length} comparison(s)`,
          source: 'comparative'
        });
      }
    });

    return inferences;
  }

  /**
   * Analyze loop constraints for type inference
   */
  private analyzeLoopConstraints(variableName: string, template: string): Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> {
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    // Pattern for {% for item in collection %}
    const forPattern = new RegExp(`{%\\s*for\\s+(\\w+)\\s+in\\s+${variableName}\\s*%}`, 'gi');
    const forMatches = template.match(forPattern);

    if (forMatches && forMatches.length > 0) {
      // If variable is used as collection, it's likely an array
      inferences.push({
        type: 'array',
        confidence: 0.9,
        reason: `Variable used as collection in ${forMatches.length} loop(s)`,
        source: 'loop'
      });
    }

    // Pattern for {% for item in variable.collection %}
    const nestedForPattern = new RegExp(`{%\\s*for\\s+(\\w+)\\s+in\\s+\\w+\\.${variableName}\\s*%}`, 'gi');
    const nestedForMatches = template.match(nestedForPattern);

    if (nestedForMatches && nestedForMatches.length > 0) {
      // If variable is used as collection property, it's likely an array
      inferences.push({
        type: 'array',
        confidence: 0.8,
        reason: `Variable used as collection property in ${nestedForMatches.length} loop(s)`,
        source: 'loop'
      });
    }

    // Check if variable is used as loop iterator
    const iteratorPattern = new RegExp(`{%\\s*for\\s+${variableName}\\s+in\\s+(\\w+)\\s*%}`, 'gi');
    const iteratorMatches = template.match(iteratorPattern);

    if (iteratorMatches && iteratorMatches.length > 0) {
      // If variable is loop iterator, infer from collection context
      inferences.push({
        type: 'object', // Most common case for loop items
        confidence: 0.7,
        reason: `Variable used as loop iterator in ${iteratorMatches.length} loop(s)`,
        source: 'loop'
      });
    }

    return inferences;
  }

  /**
   * Analyze conditional constraints for type inference
   */
  private analyzeConditionalConstraints(variableName: string, template: string): Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> {
    const inferences: Array<{ type: Jinja2VariableType; confidence: number; reason: string; source: string }> = [];

    // Pattern for {% if variable %} or {% elif variable %}
    const conditionalPattern = new RegExp(`{%\\s*(if|elif)\\s+${variableName}\\b[^%]*%}`, 'gi');
    const conditionalMatches = template.match(conditionalPattern);

    if (conditionalMatches && conditionalMatches.length > 0) {
      inferences.push({
        type: 'boolean',
        confidence: 0.9,
        reason: `Variable used in boolean condition in ${conditionalMatches.length} conditional(s)`,
        source: 'conditional'
      });
    }

    // Pattern for {% if not variable %}
    const notConditionalPattern = new RegExp(`{%\\s*(if|elif)\\s+not\\s+${variableName}\\b[^%]*%}`, 'gi');
    const notConditionalMatches = template.match(notConditionalPattern);

    if (notConditionalMatches && notConditionalMatches.length > 0) {
      inferences.push({
        type: 'boolean',
        confidence: 0.95, // Even higher confidence for explicit boolean usage
        reason: `Variable used in explicit boolean negation in ${notConditionalMatches.length} conditional(s)`,
        source: 'conditional'
      });
    }

    // Pattern for type checks: {% if variable is string %}
    const typeCheckPattern = new RegExp(`{%\\s*(if|elif)\\s+${variableName}\\s+is\\s+(\\w+)\\b[^%]*%}`, 'gi');
    const typeCheckMatches = template.match(typeCheckPattern);

    if (typeCheckMatches && typeCheckMatches.length > 0) {
      // Extract the type being checked
      const typeCheckMatch = typeCheckPattern.exec(template);
      if (typeCheckMatch && typeCheckMatch[2]) {
        const checkedType = typeCheckMatch[2].toLowerCase();
        let inferredType: Jinja2VariableType = 'string';

        switch (checkedType) {
          case 'number':
          case 'integer':
            inferredType = 'number';
            break;
          case 'string':
            inferredType = 'string';
            break;
          case 'boolean':
            inferredType = 'boolean';
            break;
          case 'array':
          case 'list':
            inferredType = 'array';
            break;
          case 'object':
          case 'dict':
            inferredType = 'object';
            break;
          case 'null':
          case 'none':
            inferredType = 'null';
            break;
        }

        inferences.push({
          type: inferredType,
          confidence: 1.0, // Very high confidence for explicit type checks
          reason: `Variable explicitly checked as ${checkedType} in template`,
          source: 'conditional'
        });
      }
    }

    return inferences;
  }

  /**
   * Enhanced batch inference for all variables in a template
   */
  public enhancedInferVariableTypes(
    template: string,
    variableNames: string[],
    options?: TypeInferenceOptions
  ): Map<string, TypeInferenceResult> {
    const results = new Map<string, TypeInferenceResult>();

    try {
      // Use the enhanced performTypeInference function from variable-utils.ts
      const basicVariables = variableNames.map(name => ({
        name,
        type: 'string' as Jinja2VariableType,
        isRequired: false,
        description: '',
        filters: []
      }));

      const inferenceResult = performTypeInference(template, basicVariables);

      // Convert to TypeInferenceResult format
      inferenceResult.enhancedVariables.forEach(variable => {
        results.set(variable.name, {
          type: variable.type as Jinja2VariableType,
          confidence: variable.confidence || 0.5,
          reasons: variable.reasoning || [],
          source: 'enhanced-batch' as any
        });
      });

      // Apply any additional analysis from the engine
      const engineResults = this.inferVariableTypes(
        variableNames.map(name => ({
          variableName: name,
          template,
          surroundingText: this.extractSurroundingText(template, name)
        })),
        options
      );

      // Merge results, preferring enhanced analysis
      engineResults.forEach((result, name) => {
        if (results.has(name)) {
          const existing = results.get(name)!;
          if (result.confidence > existing.confidence) {
            results.set(name, result);
          }
        } else {
          results.set(name, result);
        }
      });

    } catch (error) {
      // Fallback to individual analysis
      variableNames.forEach(name => {
        if (!results.has(name)) {
          const context: InferenceContext = {
            variableName: name,
            template,
            surroundingText: this.extractSurroundingText(template, name)
          };
          results.set(name, this.inferVariableType(context, options));
        }
      });
    }

    return results;
  }

  /**
   * Extract surrounding text for a variable in template
   */
  private extractSurroundingText(template: string, variableName: string): { before: string; after: string } {
    const variablePattern = new RegExp(`\\b${variableName}\\b`, 'gi');
    const match = variablePattern.exec(template);

    if (match) {
      const start = match.index;
      const end = start + match[0].length;
      const contextWindow = 100;

      return {
        before: template.substring(Math.max(0, start - contextWindow), start),
        after: template.substring(end, Math.min(template.length, end + contextWindow))
      };
    }

    return { before: '', after: '' };
  }
}

/**
 * Create type inference engine instance
 */
export const typeInferenceEngine = new TypeInferenceEngine();
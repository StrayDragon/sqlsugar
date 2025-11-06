/**
 * Enhanced template parser with control structure analysis
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type {
  ControlStructure,
  Assignment,
  FilterUsage,
  VariableContext
} from '../types/enhanced-variable';

/**
 * Template parsing options
 */
export interface TemplateParsingOptions {
  includePositions?: boolean;
  extractFilters?: boolean;
  extractAssignments?: boolean;
  extractControlStructures?: boolean;
  maxDepth?: number;
}

/**
 * Parsed template result
 */
export interface ParsedTemplate {
  variables: string[];
  controlStructures: ControlStructure[];
  assignments: Assignment[];
  filterUsages: FilterUsage[];
  contexts: Map<string, VariableContext>;
  complexity: number;
  hasLoops: boolean;
  hasConditions: boolean;
  hasAssignments: boolean;
}

/**
 * Enhanced template parser for type inference
 */
export class EnhancedTemplateParser {
  private readonly defaultOptions: Required<TemplateParsingOptions> = {
    includePositions: true,
    extractFilters: true,
    extractAssignments: true,
    extractControlStructures: true,
    maxDepth: 10
  };

  /**
   * Parse template and extract structural information
   */
  public parseTemplate(template: string, options?: TemplateParsingOptions): ParsedTemplate {
    const opts = { ...this.defaultOptions, ...options };
    const result: ParsedTemplate = {
      variables: [],
      controlStructures: [],
      assignments: [],
      filterUsages: [],
      contexts: new Map(),
      complexity: 0,
      hasLoops: false,
      hasConditions: false,
      hasAssignments: false
    };

    try {
      const lines = template.split('\n');

      // Extract control structures
      if (opts.extractControlStructures) {
        this.extractControlStructures(template, lines, result);
      }

      // Extract assignments
      if (opts.extractAssignments) {
        this.extractAssignments(template, lines, result);
      }

      // Extract variables and filters
      this.extractVariablesAndFilters(template, lines, result, opts);

      // Calculate complexity
      result.complexity = this.calculateComplexity(result);

      // Determine template characteristics
      result.hasLoops = result.controlStructures.some(cs => cs.type === 'for');
      result.hasConditions = result.controlStructures.some(cs => cs.type === 'if');
      result.hasAssignments = result.assignments.length > 0;

      // Build variable contexts
      if (opts.includePositions) {
        this.buildVariableContexts(template, lines, result);
      }

      return result;

    } catch (error) {
      // Return partial result on error
      return result;
    }
  }

  /**
   * Extract control structures from template
   */
  private extractControlStructures(template: string, lines: string[], result: ParsedTemplate): void {
    const patterns = [
      // If statements
      {
        type: 'if' as const,
        regex: /\{%\s*if\s+([^%]+?)\s*%\}/,
        endRegex: /\{%\s*endif\s*%\}/
      },
      // Elif statements
      {
        type: 'if' as const,
        regex: /\{%\s*elif\s+([^%]+?)\s*%\}/,
        endRegex: null
      },
      // For loops
      {
        type: 'for' as const,
        regex: /\{%\s*for\s+(\w+)\s+in\s+([^%]+?)\s*%\}/,
        endRegex: /\{%\s*endfor\s*%\}/
      },
      // Set statements
      {
        type: 'set' as const,
        regex: /\{%\s*set\s+(\w+)\s*=\s*([^%]+?)\s*%\}/,
        endRegex: null
      },
      // Macro definitions
      {
        type: 'macro' as const,
        regex: /\{%\s*macro\s+(\w+)\s*\([^)]*\)\s*%\}/,
        endRegex: /\{%\s*endmacro\s*%\}/
      },
      // Block definitions
      {
        type: 'block' as const,
        regex: /\{%\s*block\s+(\w+)\s*%\}/,
        endRegex: /\{%\s*endblock\s*%\}/
      }
    ];

    lines.forEach((line, lineIndex) => {
      patterns.forEach(pattern => {
        const match = line.match(pattern.regex);
        if (match) {
          const controlStructure: ControlStructure = {
            type: pattern.type,
            position: {
              line: lineIndex + 1,
              column: match.index ? match.index + 1 : 0
            }
          };

          // Add specific properties based on type
          if (pattern.type === 'if') {
            controlStructure.condition = match[1]?.trim();
          } else if (pattern.type === 'for') {
            controlStructure.iterator = match[1]?.trim();
            controlStructure.collection = match[2]?.trim();
          } else if (pattern.type === 'set') {
            controlStructure.assignment = {
              variableName: match[1]?.trim(),
              expression: match[2]?.trim(),
              confidence: 0.8,
              position: controlStructure.position
            };
          }

          result.controlStructures.push(controlStructure);
        }
      });
    });
  }

  /**
   * Extract assignments from template
   */
  private extractAssignments(template: string, lines: string[], result: ParsedTemplate): void {
    // Set statement patterns
    const setPatterns = [
      /\{%\s*set\s+(\w+)\s*=\s*([^%]+?)\s*%\}/g,
      /\{\{\s*(\w+)\s*=\s*([^}]+?)\s*\}\}/g
    ];

    lines.forEach((line, lineIndex) => {
      setPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const assignment: Assignment = {
            variableName: match[1]?.trim(),
            expression: match[2]?.trim(),
            confidence: this.calculateAssignmentConfidence(match[2]?.trim()),
            position: {
              line: lineIndex + 1,
              column: match.index ? match.index + 1 : 0
            }
          };

          result.assignments.push(assignment);
        }
      });
    });
  }

  /**
   * Extract variables and filters from template
   */
  private extractVariablesAndFilters(
    template: string,
    lines: string[],
    result: ParsedTemplate,
    options: Required<TemplateParsingOptions>
  ): void {
    lines.forEach((line, lineIndex) => {
      // Extract variables
      const variablePattern = /\{\{\s*([^}]+?)\s*\}\}/g;
      let match;

      while ((match = variablePattern.exec(line)) !== null) {
        const variableExpression = match[1]?.trim();
        if (variableExpression) {
          // Extract variable names from complex expressions
          const variableNames = this.extractVariableNamesFromExpression(variableExpression);

          variableNames.forEach(varName => {
            if (!result.variables.includes(varName)) {
              result.variables.push(varName);
            }

            // Extract filters if requested
            if (options.extractFilters) {
              const filters = this.extractFiltersFromExpression(variableExpression);
              filters.forEach(filter => {
                result.filterUsages.push({
                  variableName: varName,
                  filterName: filter.name,
                  parameters: filter.parameters,
                  confidence: 0.9
                });
              });
            }
          });
        }
      }
    });
  }

  /**
   * Extract variable names from complex expressions
   */
  private extractVariableNamesFromExpression(expression: string): string[] {
    const variableNames: string[] = [];

    // Simple variable access: variable
    const simpleVarRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;

    while ((match = simpleVarRegex.exec(expression)) !== null) {
      variableNames.push(match[1]);
    }

    // Attribute access: object.property
    const attrAccessRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)/g;
    while ((match = attrAccessRegex.exec(expression)) !== null) {
      variableNames.push(match[1]);
      variableNames.push(`${match[0]}`);
    }

    // Array access: array[index] or array.key
    const arrayAccessRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\[[^\]]+\]/g;
    while ((match = arrayAccessRegex.exec(expression)) !== null) {
      variableNames.push(match[1]);
    }

    // Remove duplicates and filter out reserved words
    const reservedWords = ['true', 'false', 'null', 'none', 'undefined'];
    return [...new Set(variableNames)].filter(name => !reservedWords.includes(name.toLowerCase()));
  }

  /**
   * Extract filters from expression
   */
  private extractFiltersFromExpression(expression: string): Array<{ name: string; parameters: string[] }> {
    const filters: Array<{ name: string; parameters: string[] }> = [];

    // Filter pattern: variable | filter_name(arg1, arg2)
    const filterRegex = /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\(([^)]*)\))?/g;
    let match;

    while ((match = filterRegex.exec(expression)) !== null) {
      const filterName = match[1];
      const parametersStr = match[2];

      const parameters: string[] = [];
      if (parametersStr) {
        // Simple parameter parsing (comma-separated)
        parameters.push(...parametersStr.split(',').map(p => p.trim()));
      }

      filters.push({ name: filterName, parameters });
    }

    return filters;
  }

  /**
   * Build variable contexts
   */
  private buildVariableContexts(template: string, lines: string[], result: ParsedTemplate): void {
    result.variables.forEach(variableName => {
      const context = this.buildVariableContext(variableName, template, lines, result);
      result.contexts.set(variableName, context);
    });
  }

  /**
   * Build context for a specific variable
   */
  private buildVariableContext(
    variableName: string,
    template: string,
    lines: string[],
    result: ParsedTemplate
  ): VariableContext {
    // Find all occurrences of the variable
    const occurrences: Array<{ line: number; column: number; context: string }> = [];

    lines.forEach((line, lineIndex) => {
      const variablePattern = new RegExp(`\\{\\{\\s*[^}]*\\b${variableName}\\b[^}]*\\s*\\}\\}`, 'g');
      let match;

      while ((match = variablePattern.exec(line)) !== null) {
        occurrences.push({
          line: lineIndex + 1,
          column: match.index ? match.index + 1 : 0,
          context: match[0]
        });
      }

      // Also check control structures
      const controlPattern = new RegExp(`\\{%\\s*[^}]*\\b${variableName}\\b[^%]*\\s*%\\}`, 'g');
      while ((match = controlPattern.exec(line)) !== null) {
        occurrences.push({
          line: lineIndex + 1,
          column: match.index ? match.index + 1 : 0,
          context: match[0]
        });
      }
    });

    // Find related variables and surrounding text
    const relatedVariables = new Set<string>();
    const controlStructures: ControlStructure[] = [];
    const assignments: Assignment[] = [];
    const filterUsages: FilterUsage[] = [];

    occurrences.forEach(occ => {
      // Get surrounding context (before and after)
      const line = lines[occ.line - 1] || '';
      const before = line.substring(0, Math.max(0, occ.column - 50));
      const after = line.substring(occ.column + 50, Math.min(line.length, occ.column + 100));

      // Extract related variables from surrounding text
      const surroundingVars = this.extractVariableNamesFromExpression(before + after);
      surroundingVars.forEach(v => {
        if (v !== variableName) {
          relatedVariables.add(v);
        }
      });
    });

    // Find relevant control structures
    result.controlStructures.forEach(cs => {
      if (cs.condition?.includes(variableName) ||
          cs.iterator === variableName ||
          cs.collection === variableName ||
          cs.assignment?.variableName === variableName) {
        controlStructures.push(cs);
      }
    });

    // Find relevant assignments
    result.assignments.forEach(assign => {
      if (assign.variableName === variableName ||
          assign.expression.includes(variableName)) {
        assignments.push(assign);
      }
    });

    // Find relevant filter usages
    result.filterUsages.forEach(filter => {
      if (filter.variableName === variableName) {
        filterUsages.push(filter);
      }
    });

    // Determine position (first occurrence)
    const position = occurrences.length > 0 ? {
      line: occurrences[0].line,
      column: occurrences[0].column
    } : { line: 0, column: 0 };

    return {
      surroundingText: {
        before: occurrences.length > 0 ? lines[occurrences[0].line - 1]?.substring(0, occurrences[0].column) || '' : '',
        after: occurrences.length > 0 ? lines[occurrences[0].line - 1]?.substring(occurrences[0].column + 20) || '' : ''
      },
      semanticContext: this.determineSemanticContext(variableName, controlStructures, assignments),
      relatedVariables: Array.from(relatedVariables),
      controlStructures,
      assignments,
      filters: filterUsages,
      position
    };
  }

  /**
   * Calculate assignment confidence
   */
  private calculateAssignmentConfidence(expression: string): number {
    // Higher confidence for simple assignments
    if (/^\s*"[^"]*"\s*$/.test(expression)) return 1.0; // String literal
    if (/^\s*'[^']*'\s*$/.test(expression)) return 1.0; // String literal
    if (/^\s*\d+\s*$/.test(expression)) return 1.0; // Number literal
    if (/^\s*true\s*$/i.test(expression) || /^\s*false\s*$/i.test(expression)) return 1.0; // Boolean

    // Lower confidence for complex expressions
    if (expression.includes('+') || expression.includes('-') || expression.includes('*')) return 0.7;
    if (expression.includes('|')) return 0.8; // Filter expression

    return 0.6; // Variable reference
  }

  /**
   * Calculate template complexity
   */
  private calculateComplexity(result: ParsedTemplate): number {
    let complexity = 0;

    // Base complexity from variables
    complexity += result.variables.length * 0.1;

    // Control structures add complexity
    result.controlStructures.forEach(cs => {
      switch (cs.type) {
        case 'if':
          complexity += 0.5;
          break;
        case 'for':
          complexity += 0.8;
          break;
        case 'set':
          complexity += 0.3;
          break;
        case 'macro':
          complexity += 1.0;
          break;
        case 'block':
          complexity += 0.4;
          break;
      }
    });

    // Assignments add complexity
    complexity += result.assignments.length * 0.2;

    // Filters add complexity
    complexity += result.filterUsages.length * 0.1;

    return Math.min(complexity, 10); // Cap at 10
  }

  /**
   * Determine semantic context for a variable
   */
  private determineSemanticContext(
    variableName: string,
    controlStructures: ControlStructure[],
    assignments: Assignment[]
  ): string {
    const contexts: string[] = [];

    // Check control structures
    controlStructures.forEach(cs => {
      if (cs.condition?.includes(variableName)) {
        contexts.push('condition');
      }
      if (cs.iterator === variableName) {
        contexts.push('loop_iterator');
      }
      if (cs.collection === variableName) {
        contexts.push('loop_collection');
      }
    });

    // Check assignments
    if (assignments.some(a => a.variableName === variableName)) {
      contexts.push('assigned_variable');
    }

    // Infer from variable name patterns
    if (variableName.includes('id') || variableName.includes('pk')) {
      contexts.push('identifier');
    }
    if (variableName.includes('count') || variableName.includes('total')) {
      contexts.push('aggregate');
    }
    if (variableName.includes('date') || variableName.includes('time')) {
      contexts.push('temporal');
    }
    if (variableName.includes('is_') || variableName.includes('has_')) {
      contexts.push('boolean_flag');
    }

    return contexts.join(', ') || 'general_variable';
  }
}

/**
 * Create enhanced template parser instance
 */
export const enhancedTemplateParser = new EnhancedTemplateParser();
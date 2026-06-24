/**
 * Enhanced type definitions for Jinja2 variable inference system
 * Provides advanced context-aware variable analysis with confidence scoring
 */

import type { TemplateVariableValue } from '../types.js';

/**
 * Enhanced variable type system beyond basic 4 types
 */
export type VariableType =

  | 'string' | 'number' | 'date' | 'boolean'

  | 'array' | 'object' | 'uuid' | 'email' | 'json'
  | 'sql_identifier' | 'phone' | 'currency'

  | 'time' | 'datetime' | 'integer' | 'null'

  | 'custom' | 'unknown';

/**
 * Complex type information for arrays and objects
 */
export interface ComplexType {
  type: 'array' | 'object';
  itemType?: VariableType;
  properties?: Map<string, VariableType>;
  isOptional: boolean;
}

/**
 * Source of variable inference with confidence scoring
 */
export interface InferenceSource {
  type: 'pattern' | 'usage' | 'assignment' | 'cross-template' | 'sqlalchemy' | 'custom';
  ruleName?: string;
  confidence: number;
  explanation: string;
}

/**
 * Custom inference rule for pattern matching
 */
export interface InferenceRule {
  name: string;
  pattern: RegExp;
  type: VariableType;
  confidence: number;
  context?: string[];
  validator?: (context: VariableContext) => boolean;
  priority: number;
}

/**
 * Variable usage patterns in templates
 */
export interface UsagePattern {
  type: UsageType;
  context: unknown;
  position: SourcePosition;
  filters: FilterContext[];
  operators?: string[];
  conditions?: string[];
}

/**
 * Types of variable usage in Jinja2 templates
 */
export type UsageType =
  | 'output'
  | 'condition'
  | 'iteration'
  | 'assignment'
  | 'filter'
  | 'comparison'
  | 'member_access'
  | 'function_call';

/**
 * Filter context for variables
 */
export interface FilterContext {
  name: string;
  arguments: TemplateVariableValue[];
  type: FilterType;
  confidence: number;
}

/**
 * Filter types for inference
 */
export type FilterType =
  | 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'sql';

/**
 * Source position information
 */
export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
  endLine?: number;
  endColumn?: number;
  endOffset?: number;
}

/**
 * Variable scope information
 */
export interface VariableScope {
  type: ScopeType;
  level: number;
  parent?: VariableScope;
  children: VariableScope[];
  variables: Map<string, VariableContext>;
}

/**
 * Types of variable scopes
 */
export type ScopeType =
  | 'global' | 'template' | 'block' | 'for' | 'if' | 'macro' | 'with' | 'set';

/**
 * Variable relationships for cross-reference analysis
 */
export interface VariableRelationship {
  type: 'parent' | 'child' | 'reference' | 'dependency' | 'assignment';
  source: string;
  target: string;
  strength: number;
  context: string;
}

/**
 * Enhanced variable context with comprehensive inference information
 */
export interface VariableContext {

  name: string;
  displayName: string;
  fullName: string;


  type: VariableType;
  confidence: number;
  inferenceSource: InferenceSource;
  alternatives: VariableType[];


  usagePatterns: UsagePattern[];
  scope: VariableScope;
  relationships: VariableRelationship[];


  suggestedDefaults: TemplateVariableValue[];
  contextualDefault: TemplateVariableValue;


  isEditable: boolean;
  positionRanges: SourcePosition[];
  filters: FilterContext[];
}

/**
 * Inference state for template analysis
 */
export interface InferenceState {

  template: string;
  variables: Map<string, VariableContext>;
  inferenceTime: number;


  templateHash: string;
  lastAnalysis: Date;
  version: string;


  processingTime: number;
  cacheHit: boolean;


  errors: InferenceError[];
  warnings: InferenceWarning[];
}

/**
 * Inference error information
 */
export interface InferenceError {
  type: 'syntax' | 'parsing' | 'inference' | 'performance';
  message: string;
  position?: SourcePosition;
  severity: 'error' | 'warning' | 'info';
  recoverable: boolean;
}

/**
 * Inference warning information
 */
export interface InferenceWarning {
  type: 'low_confidence' | 'ambiguous_type' | 'unused_variable' | 'potential_error';
  message: string;
  variable?: string;
  suggestion: string;
}

/**
 * Cache entry for inference results
 */
export interface CacheEntry {
  key: string;
  value: InferenceState;
  timestamp: Date;
  size: number;
  accessCount: number;
  lastAccessed: Date;
  dependencies: string[];
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  size: number;
  maxSize: number;
  hitRate: number;
  evictionCount: number;
  totalHits: number;
  totalMisses: number;
}

/**
 * Performance metrics for inference operations
 */
export interface PerformanceMetrics {
  template: {
    size: number;
    complexity: number;
    lineCount: number;
    variableCount: number;
  };

  processing: {
    parseTime: number;
    inferenceTime: number;
    renderTime: number;
    totalTime: number;
  };

  memory: {
    used: number;
    peak: number;
    variables: number;
  };

  cache: CacheMetrics;
}

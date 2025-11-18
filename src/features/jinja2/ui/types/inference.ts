/**
 * Enhanced type definitions for Jinja2 variable inference system
 * Provides advanced context-aware variable analysis with confidence scoring
 */

import type { Jinja2VariableValue } from '../types.js';

/**
 * Enhanced variable type system beyond basic 4 types
 */
export type VariableType =
  // Basic types (existing)
  | 'string' | 'number' | 'date' | 'boolean'
  // Enhanced types
  | 'array' | 'object' | 'uuid' | 'email' | 'json'
  | 'sql_identifier' | 'url' | 'phone' | 'currency'
  // Specialized types
  | 'custom' | 'unknown';

/**
 * Complex type information for arrays and objects
 */
export interface ComplexType {
  type: 'array' | 'object';
  itemType?: VariableType; // For arrays
  properties?: Map<string, VariableType>; // For objects
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
  priority: number; // Higher = more important
}

/**
 * Variable usage patterns in templates
 */
export interface UsagePattern {
  type: UsageType;
  context: any; // NunjucksNode
  position: SourcePosition;
  filters: FilterContext[];
  operators?: string[];
  conditions?: string[]; // For conditional usage
}

/**
 * Types of variable usage in Jinja2 templates
 */
export type UsageType =
  | 'output'           // {{ variable }}
  | 'condition'        // {% if variable %}
  | 'iteration'        // {% for item in variable %}
  | 'assignment'       // {% set variable = value %}
  | 'filter'           // {{ variable | filter }}
  | 'comparison'       // {% if variable == value %}
  | 'member_access'    // {{ variable.property }}
  | 'function_call';   // {{ variable() }}

/**
 * Filter context for variables
 */
export interface FilterContext {
  name: string;
  arguments: Jinja2VariableValue[];
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
  strength: number; // 0.0 - 1.0
  context: string;
}

/**
 * Enhanced variable context with comprehensive inference information
 */
export interface VariableContext {
  // Basic identification
  name: string;
  displayName: string;
  fullName: string; // For nested access like "user.profile.name"

  // Type inference
  type: VariableType;
  confidence: number; // 0.0 - 1.0
  inferenceSource: InferenceSource;
  alternatives: VariableType[]; // Other possible types with lower confidence

  // Context analysis
  usagePatterns: UsagePattern[];
  scope: VariableScope;
  relationships: VariableRelationship[];

  // Default values
  suggestedDefaults: Jinja2VariableValue[];
  contextualDefault: Jinja2VariableValue;

  // Rendering metadata
  isEditable: boolean;
  positionRanges: SourcePosition[];
  filters: FilterContext[];
}

/**
 * Inference state for template analysis
 */
export interface InferenceState {
  // Current analysis
  template: string;
  variables: Map<string, VariableContext>;
  inferenceTime: number;

  // Analysis metadata
  templateHash: string;
  lastAnalysis: Date;
  version: string;

  // Performance metrics
  processingTime: number;
  cacheHit: boolean;

  // Errors and warnings
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
  key: string; // Template hash
  value: InferenceState;
  timestamp: Date;
  size: number; // Bytes
  accessCount: number;
  lastAccessed: Date;
  dependencies: string[]; // Other cache keys this depends on
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  size: number; // Current cache size
  maxSize: number; // Maximum allowed size
  hitRate: number; // Cache hit rate percentage
  evictionCount: number; // Number of evictions
  totalHits: number;
  totalMisses: number;
}

/**
 * Performance metrics for inference operations
 */
export interface PerformanceMetrics {
  template: {
    size: number; // Characters
    complexity: number; // Computed complexity score
    lineCount: number;
    variableCount: number;
  };

  processing: {
    parseTime: number; // ms
    inferenceTime: number; // ms
    renderTime: number; // ms
    totalTime: number; // ms
  };

  memory: {
    used: number; // MB
    peak: number; // MB
    variables: number; // Number of variables in memory
  };

  cache: CacheMetrics;
}
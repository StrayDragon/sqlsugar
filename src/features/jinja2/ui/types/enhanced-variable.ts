/**
 * Enhanced variable types for improved type inference and memory
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { Jinja2VariableType, Jinja2VariableValue } from './types';
import type { TemplateFingerprint, VariableMemory } from './memory';

/**
 * Enhanced variable state with memory and inference capabilities
 */
export interface EnhancedVariableState {
  current: Jinja2VariableValue;
  type: Jinja2VariableType;
  history: VariableHistoryEntry[];
  isValid: boolean;
  validationError?: string | null;
  lastModified: number;

  /** Memory persistence fields */
  memoryId?: string;                    // Unique identifier for memory
  isRemembered: boolean;                // Whether value is persisted
  rememberSource?: 'user' | 'inferred';
  lastRemembered?: number;
  memoryConfidence: number;             // Confidence in remembered value

  /** Type inference fields */
  typeInference?: TypeInferenceResult;
  inferenceOverride?: {
    originalType: Jinja2VariableType;
    overriddenType: Jinja2VariableType;
    reason: string;
    timestamp: number;
  };
}

/**
 * Variable history entry for tracking value changes
 */
export interface VariableHistoryEntry {
  value: Jinja2VariableValue;
  type: Jinja2VariableType;
  timestamp: number;
  source: 'user' | 'default' | 'inferred' | 'suggestion';
  isValid: boolean;
}

/**
 * Enhanced variable with additional metadata
 */
export interface EnhancedVariable {
  name: string;
  type: Jinja2VariableType;
  isRequired: boolean;
  defaultValue?: Jinja2VariableValue;
  currentValue?: Jinja2VariableValue;
  context: VariableContext;

  /** Memory-related fields */
  isRemembered: boolean;
  memoryConfidence: number;
  lastRemembered?: number;
  rememberSource?: 'user' | 'inferred' | 'default' | 'suggestion';

  /** Type inference fields */
  typeInference?: TypeInferenceResult;
  inferenceOverride?: {
    originalType: Jinja2VariableType;
    overriddenType: Jinja2VariableType;
    reason: string;
    timestamp: number;
  };
}

/**
 * Enhanced variable context with detailed analysis
 */
export interface VariableContext {
  surroundingText: { before: string; after: string };
  semanticContext: string;
  relatedVariables: string[];

  /** Enhanced inference context */
  controlStructures: ControlStructure[];
  assignments: Assignment[];
  filters: FilterUsage[];
  position: { line: number; column: number };
  templateFingerprint?: string;
}

/**
 * Type inference result with confidence scoring
 */
export interface TypeInferenceResult {
  type: Jinja2VariableType;
  confidence: number;           // 0-1 confidence score
  reasons: string[];            // Explanation of inference
  alternatives?: Array<{
    type: Jinja2VariableType;
    confidence: number;
    reason: string;
  }>;
  source: 'naming' | 'context' | 'assignment' | 'filter' | 'manual';
}

/**
 * Control structure analysis for contextual type inference
 */
export interface ControlStructure {
  type: 'if' | 'for' | 'set' | 'macro' | 'block';
  condition?: string;           // For if statements
  iterator?: string;            // For for loops
  collection?: string;          // For for loops
  assignment?: Assignment;      // For set statements
  position: { line: number; column: number };
}

/**
 * Assignment analysis for type inference
 */
export interface Assignment {
  variableName: string;
  expression: string;
  inferredType?: Jinja2VariableType;
  confidence: number;
  position: { line: number; column: number };
}

/**
 * Filter usage analysis for type inference
 */
export interface FilterUsage {
  variableName: string;
  filterName: string;
  parameters: string[];
  inferredType?: Jinja2VariableType;
  confidence: number;
}

/**
 * Type constraint for propagation analysis
 */
export interface TypeConstraint {
  variable: string;
  type: Jinja2VariableType;
  confidence: number;
  source: 'inference' | 'assignment' | 'context' | 'user';
  constraints: TypeConstraint[];
  position: { line: number; column: number };
}

/**
 * Type constraint graph for variable relationship analysis
 */
export interface TypeConstraintGraph {
  nodes: Map<string, TypeConstraint>;
  edges: Array<{
    from: string;
    to: string;
    relationship: 'assignment' | 'condition' | 'iteration' | 'filter';
    confidence: number;
  }>;
}

/**
 * Enhanced configuration for the V2 editor
 */
export interface EnhancedEditorV2Config {
  /** Existing configuration */
  animations: boolean;
  keyboardNavigation: boolean;
  popoverPlacement: 'top' | 'bottom' | 'auto';

  /** New memory configuration */
  enableVariableMemory: boolean;
  memoryStorageLocation: 'global' | 'workspace' | 'hybrid';
  memoryRetentionDays: number;
  maxMemoryEntries: number;
  autoRememberUserValues: boolean;

  /** New type inference configuration */
  enableTypeInference: boolean;
  inferenceDepth: 'basic' | 'deep' | 'comprehensive';
  minConfidenceThreshold: number;
  showConfidenceIndicators: boolean;
  enableContextualInference: boolean;

  /** Privacy settings */
  enableCrossWorkspaceSync: boolean;
  anonymizeUsageData: boolean;
  clearMemoryOnExit: boolean;
}

/**
 * Variable validation result
 */
export interface VariableValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  position: { line: number; column: number };
  context?: string;
}

/**
 * Validation warning with confidence
 */
export interface ValidationWarning {
  code: string;
  message: string;
  confidence: number;
  suggestion?: string;
}

/**
 * Validation suggestion for improvement
 */
export interface ValidationSuggestion {
  type: 'value' | 'type' | 'format';
  suggestedValue?: Jinja2VariableValue;
  suggestedType?: Jinja2VariableType;
  reason: string;
  confidence: number;
}
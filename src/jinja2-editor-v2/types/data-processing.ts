/**
 * Data Processing Types for V2 Editor
 *
 * Type-safe data processing and context management
 */

import type { Jinja2Variable, Jinja2VariableValue, EnhancedVariable, Jinja2VariableType } from '../types.js';

/**
 * Type-safe variable processing context for Nunjucks rendering
 */
export type VariableProcessingContext = Record<string, Jinja2VariableValue>;

/**
 * Template rendering context with enhanced type safety
 */
export interface TemplateRenderingContext {
  /** User-defined variables with strict typing */
  variables: VariableProcessingContext;
  /** Built-in template functions and filters */
  functions: {
    [key: string]: (...args: unknown[]) => unknown;
  };
  /** Template metadata */
  metadata: {
    templateName?: string;
    renderTime: number;
    variableCount: number;
  };
}

/**
 * Safe variable value mapper for type conversion
 */
export interface VariableValueMapper {
  /** Convert unknown value to specific Jinja2VariableType */
  toTypedValue<T extends Jinja2VariableType>(
    value: unknown,
    targetType: T
  ): Extract<Jinja2VariableValue, { __typeHint: T }>;

  /** Validate value against expected type */
  validateValue<T extends Jinja2VariableType>(
    value: unknown,
    expectedType: T
  ): { isValid: boolean; value?: Jinja2VariableValue; error?: string };

  /** Get default value for variable type */
  getDefaultValue<T extends Jinja2VariableType>(
    type: T
  ): Extract<Jinja2VariableValue, { __typeHint: T }>;
}

/**
 * Variable state management types
 */
export interface VariableState {
  /** Current value */
  value: Jinja2VariableValue;
  /** Last known valid value */
  lastValidValue: Jinja2VariableValue;
  /** Is value currently valid */
  isValid: boolean;
  /** Validation error message */
  validationError?: string;
  /** Last update timestamp */
  lastUpdated: number;
}

/**
 * Enhanced variable state map
 */
export type VariableStateMap = Map<string, VariableState>;

/**
 * Data transformation result
 */
export interface DataTransformationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

/**
 * Type-safe event data for variable changes
 */
export interface VariableChangeData {
  variable: EnhancedVariable;
  oldValue: Jinja2VariableValue;
  newValue: Jinja2VariableValue;
  changeType: 'value' | 'type' | 'validation';
  timestamp: number;
}

/**
 * Bulk variable update payload
 */
export interface BulkVariableUpdate {
  updates: Array<{
    variableName: string;
    value: Jinja2VariableValue;
    type?: Jinja2VariableType;
  }>;
  source: 'user-input' | 'template-import' | 'state-restore';
  timestamp: number;
}

/**
 * Variable export format
 */
export interface VariableExport {
  version: string;
  timestamp: number;
  variables: Array<{
    name: string;
    type: string;
    value: Jinja2VariableValue;
    description?: string;
    isRequired?: boolean;
  }>;
  metadata: {
    templateName?: string;
    exportedBy: string;
    context?: Record<string, unknown>;
  };
}

/**
 * JSON serialization helpers
 */
export interface SerializableVariableState {
  [variableName: string]: {
    value: Jinja2VariableValue;
    type: string;
    isValid: boolean;
    validationError?: string;
    lastUpdated: number;
  };
}

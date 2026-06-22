/**
 * Templated SQL Editor Type Definitions
 *
 * Independent type definitions for Templated SQL editor
 */

/**
 * Variable value types
 */
export type TemplateVariableValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

/**
 * HTML input element types
 */
export type HTMLInputType = 'number' | 'text' | 'email' | 'url' | 'password';

/**
 * Supported variable types
 */
export type TemplateVariableType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'json'
  | 'uuid'
  | 'email'
  | 'url'
  | 'null'

  | 'array'
  | 'object'
  | 'sql_identifier'
  | 'phone'
  | 'currency'
  | 'custom'
  | 'unknown';

/**
 * Base Jinja2 variable interface
 */
export interface TemplateVariable {
  name: string;
  type: TemplateVariableType;
  description?: string;
  defaultValue?: TemplateVariableValue;
  filters?: string[];
  isRequired?: boolean;
  valid?: boolean;
  validationError?: string;
  extractionMethod?: 'nunjucks' | 'regex' | 'fallback';
  /** For parameter placeholders ($1, :param, etc.): the literal pattern to replace in rendered SQL */
  paramPattern?: string;
}

/**
 * Enhanced variable information for Templated SQL editor
 */
export interface EnhancedVariable extends TemplateVariable {
  /** Position information in template */
  position: VariablePosition;
  /** Usage statistics */
  usage?: VariableUsage;
  /** Context information */
  context?: VariableContext;
  /** For array variables used as for-loop iterables: property names
   *  accessed on each element (e.g. for `{% for c in cats %}{{ c.id }}{{ c.name }}{% endfor %}`
   *  this would be `['id', 'name']`). Used to generate a meaningful sample array. */
  elementProperties?: string[];
}

/**
 * Variable position in template
 */
export interface VariablePosition {
  /** Start index in template string */
  startIndex: number;
  /** End index in template string */
  endIndex: number;
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
  /** Variable name without Jinja2 syntax */
  name: string;
  /** Full matched text including {{ }} */
  fullMatch: string;
}

/**
 * Variable usage statistics
 */
export interface VariableUsage {
  /** How many times this variable appears */
  count: number;
  /** Last used values */
  recentValues: TemplateVariableValue[];
  /** Usage frequency score (0-1) */
  frequency: number;
}

/**
 * Variable context information
 */
export interface VariableContext {
  /** Nearby code context */
  surroundingText: {
    before: string;
    after: string;
  };
  /** Inferred semantic context */
  semanticContext: string;
  /** Related variables */
  relatedVariables: string[];
}

/**
 * Popover state
 */
export interface PopoverState {
  /** Currently editing variable */
  variable: EnhancedVariable | null;
  /** Popover position */
  position: PopoverPosition;
  /** Is popover visible */
  isVisible: boolean;
  /** Current editing value */
  editingValue: TemplateVariableValue;
  /** Current editing type */
  editingType: string;
}

/**
 * Popover positioning information
 */
export interface PopoverPosition {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Preferred placement */
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** Available space calculations */
  availableSpace: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Template highlighting information
 */
export interface TemplateHighlight {
  /** Variables found in template */
  variables: EnhancedVariable[];
  /** Highlighted HTML content */
  highlightedHTML: string;
  /** Template statistics */
  stats: TemplateStats;
}

/**
 * Template statistics
 */
export interface TemplateStats {
  /** Total number of variables */
  variableCount: number;
  /** Number of required variables */
  requiredCount: number;
  /** Number of optional variables */
  optionalCount: number;
  /** Variables by type */
  variablesByType: Record<string, number>;
  /** Template complexity score */
  complexity: 'simple' | 'medium' | 'complex';
}

/**
 * Templated SQL Editor configuration
 */
export interface TemplatedSqlEditorConfig {
  /** Enable Templated SQL editor */
  enabled: boolean;
  /** Popover positioning strategy */
  popoverPlacement: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  /** Highlight style preference */
  highlightStyle: 'background' | 'border' | 'underline';
  /** Auto-preview on changes */
  autoPreview: boolean;
  /** Enable keyboard navigation */
  keyboardNavigation: boolean;
  /** Enable animations */
  animationsEnabled: boolean;
  /** Show variable suggestions */
  showSuggestions: boolean;
  /** Auto-focus first variable */
  autoFocusFirst: boolean;
}

/**
 * Variable change event
 */
export interface VariableChangeEvent {
  variable: EnhancedVariable;
  oldValue: TemplateVariableValue;
  newValue: TemplateVariableValue;
  oldType: string;
  newType: string;
}

/**
 * Editor state
 */
export interface TemplatedSqlEditorState {
  /** Template content */
  template: string;
  /** All variables with enhanced info */
  variables: EnhancedVariable[];
  /** Current variable values */
  values: Record<string, TemplateVariableValue>;
  /** Selected/highlighted variable */
  selectedVariable: string | null;
  /** Popover state */
  popover: PopoverState;
  /** Rendered result */
  renderedResult: string;
  /** Is processing */
  isProcessing: boolean;
  /** Last render time */
  lastRenderTime: number;
}

/**
 * Keyboard navigation event
 */
export interface KeyboardNavigationEvent {
  action: 'next' | 'previous' | 'first' | 'last' | 'edit' | 'close';
  variableName?: string;
  fromKeyboard: boolean;
}

/**
 * Template render event
 */
export interface TemplateRenderEvent {
  /** Template content */
  template: string;
  /** Variable values used for rendering */
  values: Record<string, TemplateVariableValue>;
  /** Rendered result */
  result: string;
  /** Render error if any */
  error?: string;
  /** Variables that were used */
  usedVariables: string[];
  /** Variables that were missing */
  missingVariables: string[];
  /** Render performance metrics */
  metrics: {
    renderTime: number;
    variableCount: number;
    templateLength: number;
  };
}

// Enhanced inference types imported from inference.ts
export type {
  VariableType,
  ComplexType,
  InferenceSource,
  InferenceRule,
  UsagePattern,
  FilterContext,
  VariableContext as InferenceVariableContext,
  SourcePosition,
  VariableScope,
  VariableRelationship,
  PerformanceMetrics,
  CacheMetrics
} from './types/inference.js';

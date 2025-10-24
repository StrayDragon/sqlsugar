/**
 * Jinja2 Editor V2 Type Definitions
 *
 * Independent type definitions for V2 editor
 */

/**
 * Variable value types
 */
export type Jinja2VariableValue =
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
export type Jinja2VariableType =
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
  | 'null';

/**
 * Base Jinja2 variable interface
 */
export interface Jinja2Variable {
  name: string;
  type: Jinja2VariableType;
  description?: string;
  defaultValue?: Jinja2VariableValue;
  filters?: string[];
  isRequired?: boolean;
  valid?: boolean;
  validationError?: string;
  extractionMethod?: 'nunjucks' | 'regex' | 'fallback';
}

/**
 * Template render event
 */
export interface TemplateRenderEvent {
  template: string;
  values: Record<string, Jinja2VariableValue>;
  result: string;
  error?: string;
}

/**
 * Enhanced variable information for V2 editor
 */
export interface EnhancedVariable extends Jinja2Variable {
  /** Position information in template */
  position: VariablePosition;
  /** Usage statistics */
  usage?: VariableUsage;
  /** Context information */
  context?: VariableContext;
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
  recentValues: Jinja2VariableValue[];
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
  editingValue: Jinja2VariableValue;
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
 * V2 Editor configuration
 */
export interface EditorV2Config {
  /** Enable V2 editor */
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
 * Variable change event for V2
 */
export interface VariableChangeEventV2 {
  variable: EnhancedVariable;
  oldValue: Jinja2VariableValue;
  newValue: Jinja2VariableValue;
  oldType: string;
  newType: string;
}

/**
 * Editor state for V2
 */
export interface EditorV2State {
  /** Template content */
  template: string;
  /** All variables with enhanced info */
  variables: EnhancedVariable[];
  /** Current variable values */
  values: Record<string, Jinja2VariableValue>;
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
 * V2 Template render event with enhanced info
 */
export interface TemplateRenderEventV2 extends TemplateRenderEvent {
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

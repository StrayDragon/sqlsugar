/**
 * Enhanced webview message protocol for variable memory and type inference
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { Jinja2VariableValue, Jinja2VariableType } from './types';
import type { VariableMemory, TypeInferenceResult, TemplateFingerprint } from './memory';
import type { EnhancedVariable } from './enhanced-variable';

/**
 * Base webview message structure
 */
export interface WebViewMessage {
  command: string;
  timestamp: number;
  requestId?: string;
  data?: any;
}

/**
 * Enhanced response structure
 */
export interface WebViewResponse {
  success: boolean;
  timestamp: number;
  requestId?: string;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Initialize message with enhanced data
 */
export interface InitializeMessage extends WebViewMessage {
  command: 'initialize';
  data: {
    template: string;
    variables: EnhancedVariable[];
    config: EnhancedEditorConfig;
    fingerprint?: string;
    memoryData?: {
      [name: string]: VariableMemory;
    };
    inferenceData?: {
      [name: string]: TypeInferenceResult;
    };
  };
}

/**
 * Enhanced editor configuration
 */
export interface EnhancedEditorConfig {
  // Existing V2 config
  animations: boolean;
  keyboardNavigation: boolean;
  popoverPlacement: 'top' | 'bottom' | 'auto';

  // New memory configuration
  enableVariableMemory: boolean;
  showMemoryIndicators: boolean;
  memoryStorageLocation: 'global' | 'workspace' | 'hybrid';
  memoryRetentionDays: number;
  maxMemoryEntries: number;
  autoRememberUserValues: boolean;

  // New type inference configuration
  enableTypeInference: boolean;
  showConfidenceIndicators: boolean;
  minConfidenceThreshold: number;
  enableContextualInference: boolean;
  showInferenceReasons: boolean;
  allowTypeOverride: boolean;
}

/**
 * Variable update message with memory support
 */
export interface VariableChangedMessage extends WebViewMessage {
  command: 'variableChanged';
  data: {
    variableName: string;
    value: Jinja2VariableValue;
    type: Jinja2VariableType;
    source: 'user' | 'default' | 'inferred' | 'suggestion' | 'memory';
    saveToMemory?: boolean;
    inferenceResult?: TypeInferenceResult;
  };
}

/**
 * Load variable memory message
 */
export interface LoadVariableMemoryMessage extends WebViewMessage {
  command: 'loadVariableMemory';
  data: {
    templateFingerprint: string;
    includeHistory?: boolean;
    maxAge?: number;
  };
}

/**
 * Save variable memory message
 */
export interface SaveVariableMemoryMessage extends WebViewMessage {
  command: 'saveVariableMemory';
  data: {
    templateFingerprint: string;
    variables: {
      [name: string]: {
        value: Jinja2VariableValue;
        type: Jinja2VariableType;
        confidence?: number;
        source?: 'user' | 'inferred' | 'default' | 'suggestion';
      };
    };
    source?: 'user' | 'inferred' | 'default' | 'suggestion';
  };
}

/**
 * Clear variable memory message
 */
export interface ClearVariableMemoryMessage extends WebViewMessage {
  command: 'clearVariableMemory';
  data: {
    templateFingerprint?: string;
    variableName?: string;
    allMemory?: boolean;
  };
}

/**
 * Get value suggestions message
 */
export interface GetValueSuggestionsMessage extends WebViewMessage {
  command: 'getValueSuggestions';
  data: {
    variableName: string;
    type?: Jinja2VariableType;
    limit?: number;
    context?: string;
  };
}

/**
 * Value suggestions response
 */
export interface ValueSuggestionsResponse {
  suggestions: Array<{
    value: Jinja2VariableValue;
    type: Jinja2VariableType;
    confidence: number;
    source: 'history' | 'pattern' | 'inference' | 'default';
    reason: string;
    frequency?: number;
  }>;
}

/**
 * Perform type inference message
 */
export interface InferVariableTypesMessage extends WebViewMessage {
  command: 'inferVariableTypes';
  data: {
    template: string;
    variables: Array<{
      name: string;
      currentValue?: Jinja2VariableValue;
      context?: {
        surroundingText: { before: string; after: string };
        controlStructures: any[];
        assignments: any[];
        filters: any[];
      };
    }>;
    options?: {
      includeAlternatives?: boolean;
      maxAlternatives?: number;
      minConfidence?: number;
      enableContextualAnalysis?: boolean;
    };
  };
}

/**
 * Update type inference message
 */
export interface UpdateTypeInferenceMessage extends WebViewMessage {
  command: 'updateTypeInference';
  data: {
    inferences: {
      [name: string]: TypeInferenceResult;
    };
    timestamp: number;
  };
}

/**
 * Override type inference message
 */
export interface OverrideTypeInferenceMessage extends WebViewMessage {
  command: 'overrideTypeInference';
  data: {
    variableName: string;
    originalType: Jinja2VariableType;
    overriddenType: Jinja2VariableType;
    reason: string;
  };
}

/**
 * Get inference reasons message
 */
export interface GetInferenceReasonsMessage extends WebViewMessage {
  command: 'getInferenceReasons';
  data: {
    variableName: string;
  };
}

/**
 * Inference reasons response
 */
export interface InferenceReasonsResponse {
  variableName: string;
  currentType: Jinja2VariableType;
  inference: TypeInferenceResult;
  alternatives: Array<{
    type: Jinja2VariableType;
    confidence: number;
    reason: string;
    benefits: string[];
    drawbacks: string[];
  }>;
}

/**
 * Update variables message with enhanced data
 */
export interface UpdateVariablesMessage extends WebViewMessage {
  command: 'updateVariables';
  data: {
    variables: EnhancedVariable[];
    memoryData?: {
      [name: string]: VariableMemory;
    };
    inferenceData?: {
      [name: string]: TypeInferenceResult;
    };
    templateFingerprint?: string;
  };
}

/**
 * Show memory indicators message
 */
export interface ShowMemoryIndicatorsMessage extends WebViewMessage {
  command: 'showMemoryIndicators';
  data: {
    enabled: boolean;
    confidenceThreshold?: number;
    showHistory?: boolean;
  };
}

/**
 * Update confidence display message
 */
export interface UpdateConfidenceDisplayMessage extends WebViewMessage {
  command: 'updateConfidenceDisplay';
  data: {
    enabled: boolean;
    minConfidence?: number;
    showAlternatives?: boolean;
    showReasons?: boolean;
  };
}

/**
 * Toggle inference details message
 */
export interface ToggleInferenceDetailsMessage extends WebViewMessage {
  command: 'toggleInferenceDetails';
  data: {
    variableName?: string;
    showDetails: boolean;
  };
}

/**
 * Memory statistics message
 */
export interface GetMemoryStatisticsMessage extends WebViewMessage {
  command: 'getMemoryStatistics';
  data?: {
    includeAnalytics?: boolean;
    includeTemplates?: boolean;
  };
}

/**
 * Memory statistics response
 */
export interface MemoryStatisticsResponse {
  totalTemplates: number;
  totalVariables: number;
  totalMemoryUsed: number;
  averageConfidence: number;
  oldestEntry: number;
  newestEntry: number;
  templates?: Array<{
    fingerprint: string;
    variableCount: number;
    lastAccessed: number;
    accessCount: number;
  }>;
  analytics?: {
    totalVariablesRemembered: number;
    totalTemplatesProcessed: number;
    averageConfidenceScore: number;
    lastCleanup: number;
  };
}

/**
 * Template fingerprint message
 */
export interface GenerateTemplateFingerprintMessage extends WebViewMessage {
  command: 'generateTemplateFingerprint';
  data: {
    template: string;
    options?: {
      includeContentHash?: boolean;
      normalizeWhitespace?: boolean;
      sensitivity?: 'low' | 'medium' | 'high';
    };
  };
}

/**
 * Template fingerprint response
 */
export interface TemplateFingerprintResponse {
  fingerprint: TemplateFingerprint;
  duration: number;
  similarity?: {
    similarTemplates: Array<{
      fingerprint: string;
      similarity: number;
      lastAccessed: number;
    }>;
  };
}

/**
 * Configuration update message
 */
export interface UpdateConfigurationMessage extends WebViewMessage {
  command: 'updateConfiguration';
  data: Partial<EnhancedEditorConfig>;
}

/**
 * User interaction tracking message
 */
export interface UserInteractionMessage extends WebViewMessage {
  command: 'userInteraction';
  data: {
    action: string;
    variableName?: string;
    details?: {
      [key: string]: any;
    };
    timestamp: number;
  };
}

/**
 * Performance metrics message
 */
export interface PerformanceMetricsMessage extends WebViewMessage {
  command: 'performanceMetrics';
  data: {
    operation: string;
    duration: number;
    metadata?: {
      [key: string]: any;
    };
    timestamp: number;
  };
}

/**
 * Error report message
 */
export interface ErrorReportMessage extends WebViewMessage {
  command: 'errorReport';
  data: {
    error: {
      code: string;
      message: string;
      stack?: string;
    };
    context: {
      operation: string;
      variableName?: string;
      template?: string;
      userAction?: string;
    };
    timestamp: number;
  };
}

/**
 * Type guard for checking message types
 */
export function isInitializeMessage(message: WebViewMessage): message is InitializeMessage {
  return message.command === 'initialize';
}

export function isVariableChangedMessage(message: WebViewMessage): message is VariableChangedMessage {
  return message.command === 'variableChanged';
}

export function isLoadVariableMemoryMessage(message: WebViewMessage): message is LoadVariableMemoryMessage {
  return message.command === 'loadVariableMemory';
}

export function isSaveVariableMemoryMessage(message: WebViewMessage): message is SaveVariableMemoryMessage {
  return message.command === 'saveVariableMemory';
}

export function isInferVariableTypesMessage(message: WebViewMessage): message is InferVariableTypesMessage {
  return message.command === 'inferVariableTypes';
}

export function isUpdateTypeInferenceMessage(message: WebViewMessage): message is UpdateTypeInferenceMessage {
  return message.command === 'updateTypeInference';
}

export function isGetValueSuggestionsMessage(message: WebViewMessage): message is GetValueSuggestionsMessage {
  return message.command === 'getValueSuggestions';
}

export function isOverrideTypeInferenceMessage(message: WebViewMessage): message is OverrideTypeInferenceMessage {
  return message.command === 'overrideTypeInference';
}

/**
 * Message factory functions
 */
export function createInitializeMessage(
  template: string,
  variables: EnhancedVariable[],
  config: EnhancedEditorConfig,
  requestId?: string
): InitializeMessage {
  return {
    command: 'initialize',
    timestamp: Date.now(),
    requestId,
    data: {
      template,
      variables,
      config
    }
  };
}

export function createVariableChangedMessage(
  variableName: string,
  value: Jinja2VariableValue,
  type: Jinja2VariableType,
  source: 'user' | 'default' | 'inferred' | 'suggestion' | 'memory' = 'user',
  requestId?: string
): VariableChangedMessage {
  return {
    command: 'variableChanged',
    timestamp: Date.now(),
    requestId,
    data: {
      variableName,
      value,
      type,
      source
    }
  };
}

export function createLoadVariableMemoryMessage(
  templateFingerprint: string,
  includeHistory = false,
  requestId?: string
): LoadVariableMemoryMessage {
  return {
    command: 'loadVariableMemory',
    timestamp: Date.now(),
    requestId,
    data: {
      templateFingerprint,
      includeHistory
    }
  };
}

export function createValueSuggestionsMessage(
  variableName: string,
  type?: Jinja2VariableType,
  limit = 5,
  requestId?: string
): GetValueSuggestionsMessage {
  return {
    command: 'getValueSuggestions',
    timestamp: Date.now(),
    requestId,
    data: {
      variableName,
      type,
      limit
    }
  };
}

export function createInferVariableTypesMessage(
  template: string,
  variables: Array<{ name: string; currentValue?: Jinja2VariableValue }>,
  requestId?: string
): InferVariableTypesMessage {
  return {
    command: 'inferVariableTypes',
    timestamp: Date.now(),
    requestId,
    data: {
      template,
      variables
    }
  };
}

export function createSuccessResponse<T = any>(
  data?: T,
  requestId?: string
): WebViewResponse {
  return {
    success: true,
    timestamp: Date.now(),
    requestId,
    data
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  requestId?: string
): WebViewResponse {
  return {
    success: false,
    timestamp: Date.now(),
    requestId,
    error: {
      code,
      message,
      details
    }
  };
}
/**
 * Enhanced variable state manager with memory and inference capabilities
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { ExtensionContext } from 'vscode';
import type {
  EnhancedVariableState,
  VariableHistoryEntry,
  EnhancedVariable,
  TypeInferenceResult,
  EnhancedEditorV2Config
} from '../types/enhanced-variable';
import type { Jinja2Variable, Jinja2VariableValue, Jinja2VariableType } from '../types/types';
import type { VariableMemoryService } from './variable-memory-service';
import type { TemplateFingerprinter } from './template-fingerprinter';
import type { TypeInferenceEngine } from './type-inference-engine';
import { memoryLogger } from '../../../core/logging/memory-logger';

/**
 * State change event data
 */
export interface StateChangeEvent {
  variableName: string;
  oldValue?: Jinja2VariableValue;
  newValue: Jinja2VariableValue;
  oldType?: Jinja2VariableType;
  newType: Jinja2VariableType;
  source: 'user' | 'default' | 'inferred' | 'suggestion' | 'memory';
  timestamp: number;
  isValid: boolean;
  isRemembered?: boolean;
  inferenceResult?: TypeInferenceResult;
}

/**
 * Enhanced state manager options
 */
export interface EnhancedStateManagerOptions {
  enableMemoryPersistence?: boolean;
  enableTypeInference?: boolean;
  enableAutoSave?: boolean;
  maxHistoryEntries?: number;
  confidenceThreshold?: number;
}

/**
 * Enhanced variable state manager
 */
export class EnhancedVariableStateManager {
  private variables: Map<string, EnhancedVariableState>;
  private templates: Map<string, EnhancedVariable[]>;
  private changeListeners: Set<(event: StateChangeEvent) => void>;
  private memoryService?: VariableMemoryService;
  private fingerprinter?: TemplateFingerprinter;
  private inferenceEngine?: TypeInferenceEngine;
  private options: Required<EnhancedStateManagerOptions>;
  private currentTemplateFingerprint?: string;
  private context: ExtensionContext;

  constructor(
    context: ExtensionContext,
    initialVariables: EnhancedVariable[],
    options: EnhancedStateManagerOptions = {},
    memoryService?: VariableMemoryService,
    fingerprinter?: TemplateFingerprinter,
    inferenceEngine?: TypeInferenceEngine
  ) {
    this.context = context;
    this.variables = new Map();
    this.templates = new Map();
    this.changeListeners = new Set();
    this.options = {
      enableMemoryPersistence: true,
      enableTypeInference: true,
      enableAutoSave: true,
      maxHistoryEntries: 50,
      confidenceThreshold: 0.6,
      ...options
    };

    // Service dependencies
    this.memoryService = memoryService;
    this.fingerprinter = fingerprinter;
    this.inferenceEngine = inferenceEngine;

    // Initialize variables
    this.initializeVariables(initialVariables);
  }

  /**
   * Get current state for a variable
   */
  public getVariableState(name: string): EnhancedVariableState | undefined {
    return this.variables.get(name);
  }

  /**
   * Get all variable states
   */
  public getAllStates(): Map<string, EnhancedVariableState> {
    return new Map(this.variables);
  }

  /**
   * Update variable value and type
   */
  public async updateValue(
    name: string,
    value: Jinja2VariableValue,
    type: Jinja2VariableType,
    source: 'user' | 'default' | 'inferred' | 'suggestion' | 'memory' = 'user'
  ): Promise<boolean> {
    try {
      const currentState = this.variables.get(name);
      const oldValue = currentState?.current;
      const oldType = currentState?.type;

      // Validate value against type
      const isValid = this.validateValue(value, type);

      // Create history entry
      const historyEntry: VariableHistoryEntry = {
        value,
        type,
        timestamp: Date.now(),
        source,
        isValid
      };

      // Update or create state
      let state: EnhancedVariableState;
      if (currentState) {
        // Update existing state
        state = {
          ...currentState,
          current: value,
          type,
          isValid,
          validationError: isValid ? undefined : this.getValidationError(value, type),
          lastModified: Date.now(),
          history: [...currentState.history, historyEntry].slice(-this.options.maxHistoryEntries)
        };
      } else {
        // Create new state
        state = {
          current: value,
          type,
          history: [historyEntry],
          isValid,
          validationError: isValid ? undefined : this.getValidationError(value, type),
          lastModified: Date.now(),
          memoryId: undefined,
          isRemembered: false,
          memoryConfidence: 0,
          lastRemembered: undefined,
          rememberSource: undefined,
          typeInference: undefined,
          inferenceOverride: undefined
        };
      }

      this.variables.set(name, state);

      // Perform enhanced inference if enabled
      if (this.options.enableTypeInference && this.inferenceEngine && source === 'user') {
        await this.performTypeInference(name);
      }

      // Save to memory if enabled and appropriate
      if (this.options.enableMemoryPersistence && this.memoryService &&
          this.options.enableAutoSave && source === 'user' && isValid) {
        await this.saveToMemory(name, value, type);
      }

      // Notify listeners
      const event: StateChangeEvent = {
        variableName: name,
        oldValue,
        newValue: value,
        oldType,
        newType: type,
        source,
        timestamp: Date.now(),
        isValid,
        isRemembered: state.isRemembered,
        inferenceResult: state.typeInference
      };

      this.notifyListeners(event);

      memoryLogger.userInteraction('variable_value_updated', name, {
        type,
        source,
        isValid,
        isRemembered: state.isRemembered
      });

      return true;

    } catch (error) {
      memoryLogger.error('Failed to update variable value', error as Error, {
        operation: 'updateValue',
        variableName: name,
        type,
        source
      });

      return false;
    }
  }

  /**
   * Update template fingerprint for current context
   */
  public setTemplateFingerprint(fingerprint: string): void {
    this.currentTemplateFingerprint = fingerprint;
    memoryLogger.debug('Template fingerprint set', {
      operation: 'setTemplateFingerprint',
      templateFingerprint: fingerprint
    });
  }

  /**
   * Load remembered values for template
   */
  public async loadRememberedValues(template: string): Promise<void> {
    if (!this.options.enableMemoryPersistence || !this.memoryService || !this.fingerprinter) {
      return;
    }

    try {
      // Generate fingerprint and update current context
      const fingerprint = this.fingerprinter.generateFingerprint(template);
      this.setTemplateFingerprint(fingerprint.structureHash);

      // Load remembered values
      const rememberedValues = await this.memoryService.loadVariableValues(template);

      // Apply remembered values to existing variables
      for (const [name, value] of Object.entries(rememberedValues)) {
        const currentState = this.variables.get(name);

        if (currentState && currentState.current === undefined) {
          // Only apply if current value is not already set
          const inferredType = this.inferTypeFromValue(value);
          await this.updateValue(name, value, inferredType, 'memory');

          // Mark as remembered
          const updatedState = this.variables.get(name);
          if (updatedState) {
            updatedState.isRemembered = true;
            updatedState.memoryConfidence = 1.0;
            updatedState.lastRemembered = Date.now();
            updatedState.rememberSource = 'user';
          }

          memoryLogger.debug('Remembered value applied', {
            operation: 'loadRememberedValues',
            variableName: name,
            templateFingerprint: fingerprint.structureHash
          });
        }
      }

      memoryLogger.info('Remembered values loaded', {
        operation: 'loadRememberedValues',
        variablesLoaded: Object.keys(rememberedValues).length
      });

    } catch (error) {
      memoryLogger.error('Failed to load remembered values', error as Error, {
        operation: 'loadRememberedValues'
      });
    }
  }

  /**
   * Get suggestions for a variable
   */
  public async getSuggestions(
    name: string,
    limit: number = 5
  ): Promise<Array<{ value: Jinja2VariableValue; type: Jinja2VariableType; confidence: number; reason: string }>> {
    const suggestions: Array<{ value: Jinja2VariableValue; type: Jinja2VariableType; confidence: number; reason: string }> = [];

    try {
      // Get value suggestions from memory
      if (this.memoryService) {
        const currentState = this.variables.get(name);
        const type = currentState?.type || 'string';
        const memorySuggestions = await this.memoryService.getValueSuggestions(name, type, limit);

        memorySuggestions.forEach(suggestion => {
          suggestions.push({
            value: suggestion.value,
            type: suggestion.type,
            confidence: suggestion.confidence,
            reason: `${suggestion.reason} (used ${suggestion.frequency} times)`
          });
        });
      }

      // Add inference-based suggestions
      if (this.inferenceEngine && this.templates.size > 0) {
        const templateVars = this.getTemplateVariables();
        const context = templateVars.find(v => v.name === name);

        if (context) {
          const inference = this.inferenceEngine.inferVariableType({
            variableName: name,
            template: '', // Could be enhanced to pass actual template
            currentValue: context.currentValue,
            surroundingText: context.context?.surroundingText,
            controlStructures: context.context?.controlStructures,
            filterUsages: context.context?.filters
          });

          if (inference.confidence > 0.7) {
            // Generate a default value based on type
            const defaultValue = this.generateDefaultValue(inference.type);
            if (defaultValue !== null) {
              suggestions.push({
                value: defaultValue,
                type: inference.type,
                confidence: inference.confidence * 0.5, // Lower confidence for generated defaults
                reason: `Inferred type: ${inference.reasons.join(', ')}`
              });
            }
          }
        }
      }

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);

      return suggestions.slice(0, limit);

    } catch (error) {
      memoryLogger.error('Failed to get suggestions', error as Error, {
        operation: 'getSuggestions',
        variableName: name
      });

      return [];
    }
  }

  /**
   * Override inferred type
   */
  public overrideInferredType(name: string, originalType: Jinja2VariableType, overriddenType: Jinja2VariableType, reason: string): boolean {
    const state = this.variables.get(name);
    if (!state) {
      return false;
    }

    state.inferenceOverride = {
      originalType,
      overriddenType,
      reason,
      timestamp: Date.now()
    };

    // Update current type
    state.type = overriddenType;

    memoryLogger.userInteraction('type_inference_overridden', name, {
      originalType,
      overriddenType,
      reason
    });

    return true;
  }

  /**
   * Add change listener
   */
  public addChangeListener(listener: (event: StateChangeEvent) => void): void {
    this.changeListeners.add(listener);
  }

  /**
   * Remove change listener
   */
  public removeChangeListener(listener: (event: StateChangeEvent) => void): void {
    this.changeListeners.delete(listener);
  }

  /**
   * Clear all history and reset state
   */
  public clearHistory(): void {
    this.variables.forEach((state, name) => {
      state.history = [{
        value: state.current,
        type: state.type,
        timestamp: Date.now(),
        source: 'user',
        isValid: state.isValid
      }];
    });

    memoryLogger.info('Variable history cleared', {
      operation: 'clearHistory',
      variablesCleared: this.variables.size
    });
  }

  /**
   * Get state statistics
   */
  public getStatistics(): {
    totalVariables: number;
    validVariables: number;
    rememberedVariables: number;
    overriddenTypes: number;
    averageHistoryLength: number;
  } {
    const states = Array.from(this.variables.values());

    return {
      totalVariables: states.length,
      validVariables: states.filter(s => s.isValid).length,
      rememberedVariables: states.filter(s => s.isRemembered).length,
      overriddenTypes: states.filter(s => s.inferenceOverride).length,
      averageHistoryLength: states.reduce((sum, s) => sum + s.history.length, 0) / Math.max(states.length, 1)
    };
  }

  /**
   * Initialize variables from enhanced variable definitions
   */
  private initializeVariables(variables: EnhancedVariable[]): void {
    this.templates.set('current', variables);

    variables.forEach(variable => {
      const state: EnhancedVariableState = {
        current: variable.currentValue,
        type: variable.type,
        history: variable.currentValue ? [{
          value: variable.currentValue,
          type: variable.type,
          timestamp: Date.now(),
          source: 'default',
          isValid: true
        }] : [],
        isValid: true,
        lastModified: Date.now(),
        isRemembered: variable.isRemembered || false,
        memoryConfidence: variable.memoryConfidence || 0,
        lastRemembered: variable.lastRemembered,
        rememberSource: variable.rememberSource,
        typeInference: variable.typeInference,
        inferenceOverride: variable.inferenceOverride
      };

      this.variables.set(variable.name, state);
    });

    memoryLogger.info('Variable states initialized', {
      operation: 'initializeVariables',
      variablesCount: variables.length
    });
  }

  /**
   * Perform type inference for variable
   */
  private async performTypeInference(name: string): Promise<void> {
    if (!this.inferenceEngine || !this.memoryService) {
      return;
    }

    try {
      const state = this.variables.get(name);
      if (!state) return;

      // Get current template context
      const templateVars = this.getTemplateVariables();
      const variable = templateVars.find(v => v.name === name);

      if (!variable || !variable.context) return;

      const inference = this.inferenceEngine.inferVariableType({
        variableName: name,
        template: '', // Could be enhanced with actual template
        currentValue: state.current,
        surroundingText: variable.context.surroundingText,
        controlStructures: variable.context.controlStructures,
        filterUsages: variable.context.filters
      });

      // Apply inference if confidence meets threshold
      if (inference.confidence >= this.options.confidenceThreshold) {
        state.typeInference = inference;

        // Optionally update type if no override exists
        if (!state.inferenceOverride && inference.confidence > 0.8) {
          const oldType = state.type;
          state.type = inference.type;
          state.lastModified = Date.now();

          // Update validation
          state.isValid = this.validateValue(state.current, state.type);
          state.validationError = state.isValid ? undefined : this.getValidationError(state.current, state.type);

          memoryLogger.debug('Type inference applied', {
            operation: 'performTypeInference',
            variableName: name,
            inferredType: inference.type,
            confidence: inference.confidence,
            oldType,
            newType: state.type
          });
        }
      }

    } catch (error) {
      memoryLogger.error('Failed to perform type inference', error as Error, {
        operation: 'performTypeInference',
        variableName: name
      });
    }
  }

  /**
   * Save variable to memory
   */
  private async saveToMemory(name: string, value: Jinja2VariableValue, type: Jinja2VariableType): Promise<void> {
    if (!this.memoryService || !this.currentTemplateFingerprint) {
      return;
    }

    try {
      const template = ''; // Could be enhanced with actual template content
      const variables = { [name]: value };
      const types = { [name]: type };

      await this.memoryService.saveVariableValues(template, variables, types);

      // Update state memory metadata
      const state = this.variables.get(name);
      if (state) {
        state.isRemembered = true;
        state.memoryConfidence = 1.0;
        state.lastRemembered = Date.now();
        state.rememberSource = 'user';
      }

    } catch (error) {
      memoryLogger.error('Failed to save to memory', error as Error, {
        operation: 'saveToMemory',
        variableName: name
      });
    }
  }

  /**
   * Notify all change listeners
   */
  private notifyListeners(event: StateChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        memoryLogger.error('Error in change listener', error as Error, {
          operation: 'notifyListeners',
          variableName: event.variableName
        });
      }
    });
  }

  /**
   * Validate value against type
   */
  private validateValue(value: Jinja2VariableValue, type: Jinja2VariableType): boolean {
    if (value === null || value === undefined) {
      return type === 'null';
    }

    switch (type) {
      case 'string':
      case 'email':
      case 'url':
      case 'uuid':
      case 'time':
        return typeof value === 'string';

      case 'number':
        return typeof value === 'number' && !isNaN(value);

      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);

      case 'boolean':
        return typeof value === 'boolean';

      case 'date':
      case 'datetime':
        return value instanceof Date || typeof value === 'string' || typeof value === 'number';

      case 'array':
        return Array.isArray(value);

      case 'object':
      case 'json':
        return typeof value === 'object' && !Array.isArray(value);

      case 'null':
        return value === null;

      default:
        return true;
    }
  }

  /**
   * Get validation error message
   */
  private getValidationError(value: Jinja2VariableValue, type: Jinja2VariableType): string {
    const actualType = value === null ? 'null' : typeof value;
    return `Expected ${type}, but got ${actualType}`;
  }

  /**
   * Infer type from value
   */
  private inferTypeFromValue(value: Jinja2VariableValue): Jinja2VariableType {
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (value instanceof Date) return 'datetime';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  /**
   * Generate default value for type
   */
  private generateDefaultValue(type: Jinja2VariableType): Jinja2VariableValue {
    switch (type) {
      case 'string':
      case 'email':
      case 'url':
      case 'uuid':
      case 'time':
        return '';

      case 'number':
        return 0;

      case 'integer':
        return 0;

      case 'boolean':
        return false;

      case 'date':
      case 'datetime':
        return new Date();

      case 'array':
        return [];

      case 'object':
      case 'json':
        return {};

      case 'null':
        return null;

      default:
        return '';
    }
  }

  /**
   * Get template variables from current context
   */
  private getTemplateVariables(): EnhancedVariable[] {
    return this.templates.get('current') || [];
  }
}

/**
 * Create enhanced variable state manager
 */
export function createEnhancedVariableStateManager(
  context: ExtensionContext,
  variables: EnhancedVariable[],
  options?: EnhancedStateManagerOptions,
  memoryService?: VariableMemoryService,
  fingerprinter?: TemplateFingerprinter,
  inferenceEngine?: TypeInferenceEngine
): EnhancedVariableStateManager {
  return new EnhancedVariableStateManager(context, variables, options, memoryService, fingerprinter, inferenceEngine);
}
/**
 * Variable State Manager for V2 Editor
 *
 * Manages the state of all variables with history tracking and validation
 */

import type { ExtensionContext } from 'vscode';
import type {
  EnhancedVariable,
  Jinja2VariableValue,
  Jinja2VariableType
} from '../types.js';
import { validateValue } from './variable-utils.js';
import type { VariableMemoryService } from './variable-memory-service.js';
import type { TemplateFingerprinter } from './template-fingerprinter.js';
import type { EnhancedVariableState } from './enhanced-variable-state-manager.js';
import { memoryLogger } from '../../../core/logging/memory-logger.js';

/**
 * Variable state with history tracking
 */
export interface VariableState {
  current: Jinja2VariableValue;
  type: Jinja2VariableType;
  history: VariableHistoryEntry[];
  isValid: boolean;
  validationError?: string | null;
  lastModified: Date;
}

/**
 * History entry for variable changes
 */
export interface VariableHistoryEntry {
  value: Jinja2VariableValue;
  type: Jinja2VariableType;
  timestamp: Date;
  changeReason: 'user-input' | 'validation' | 'type-change' | 'import';
}

/**
 * Map of variable states
 */
export type VariableStateMap = Map<string, VariableState>;

/**
 * State change event
 */
export interface StateChangeEvent {
  variableName: string;
  oldState: VariableState;
  newState: VariableState;
  source: string;
}

/**
 * Variable State Manager
 */
export class VariableStateManager {
  private states: Map<string, VariableState> = new Map();
  private variables: Map<string, EnhancedVariable> = new Map();
  private maxHistorySize = 50;
  private listeners: Set<(event: StateChangeEvent) => void> = new Set();

  // Memory integration properties
  private memoryService?: VariableMemoryService;
  private fingerprinter?: TemplateFingerprinter;
  private context?: ExtensionContext;
  private currentTemplateFingerprint?: string;
  private memoryEnabled: boolean = true;
  private autoSave: boolean = true;

  /**
   * Constructor with optional memory service integration
   */
  constructor(
    context?: ExtensionContext,
    memoryService?: VariableMemoryService,
    fingerprinter?: TemplateFingerprinter,
    options?: { memoryEnabled?: boolean; autoSave?: boolean }
  ) {
    this.context = context;
    this.memoryService = memoryService;
    this.fingerprinter = fingerprinter;
    this.memoryEnabled = options?.memoryEnabled ?? true;
    this.autoSave = options?.autoSave ?? true;
  }

  /**
   * Initialize the state manager with variables
   */
  async initialize(variables: EnhancedVariable[], template?: string): Promise<void> {
    this.variables.clear();
    this.states.clear();

    variables.forEach(variable => {
      this.variables.set(variable.name, variable);
      this.initializeVariableState(variable);
    });

    // Load remembered values if memory is enabled and template is provided
    if (this.memoryEnabled && this.memoryService && template) {
      await this.loadRememberedValues(template);
    }
  }

  /**
   * Set template fingerprint for memory operations
   */
  setTemplateFingerprint(fingerprint: string): void {
    this.currentTemplateFingerprint = fingerprint;
    memoryLogger.debug('Template fingerprint set in state manager', {
      operation: 'setTemplateFingerprint',
      templateFingerprint: fingerprint
    });
  }

  /**
   * Load remembered values from memory
   */
  private async loadRememberedValues(template: string): Promise<void> {
    if (!this.memoryService || !this.fingerprinter) return;

    try {
      // Generate template fingerprint
      const fingerprint = this.fingerprinter.generateTemplateFingerprint(template);
      this.currentTemplateFingerprint = fingerprint.structureHash;

      // Load remembered values
      const rememberedValues = await this.memoryService.loadVariableValues(template);

      // Apply remembered values to variables
      for (const [name, value] of Object.entries(rememberedValues)) {
        const state = this.states.get(name);
        const variable = this.variables.get(name);

        if (state && variable && state.current === undefined) {
          // Only apply if current value is not already set
          const isValid = this.validateValue(value, variable.type);

          state.current = value;
          state.isValid = isValid;
          state.validationError = isValid ? undefined : this.getValidationError(value, variable.type);
          state.lastModified = new Date();

          // Add to history
          state.history.push({
            value,
            type: variable.type,
            timestamp: new Date(),
            changeReason: 'import' as const
          });

          memoryLogger.debug('Remembered value applied to variable state', {
            operation: 'loadRememberedValues',
            variableName: name,
            templateFingerprint: fingerprint.structureHash,
            isValid
          });
        }
      }

      memoryLogger.info('Remembered values loaded into state manager', {
        operation: 'loadRememberedValues',
        valuesLoaded: Object.keys(rememberedValues).length
      });

    } catch (error) {
      memoryLogger.error('Failed to load remembered values in state manager', error as Error, {
        operation: 'loadRememberedValues'
      });
    }
  }

  /**
   * Initialize state for a single variable
   */
  private initializeVariableState(variable: EnhancedVariable) {
    const defaultValue = this.getDefaultValue(variable);
    const state: VariableState = {
      current: defaultValue,
      type: variable.type,
      history: [{
        value: defaultValue,
        type: variable.type,
        timestamp: new Date(),
        changeReason: 'user-input' as const
      }],
      isValid: this.validateValue(defaultValue, variable.type),
      validationError: this.getValidationError(defaultValue, variable.type),
      lastModified: new Date()
    };

    this.states.set(variable.name, state);
  }

  /**
   * Get default value for a variable
   */
  private getDefaultValue(variable: EnhancedVariable): Jinja2VariableValue {
    if (variable.defaultValue !== undefined) {
      return variable.defaultValue;
    }


    const name = variable.name.toLowerCase();

    switch (variable.type) {
      case 'string':
        if (name.includes('id')) return '1';
        if (name.includes('name')) return 'John Doe';
        if (name.includes('email')) return 'user@example.com';
        if (name.includes('url') || name.includes('link')) return 'https://example.com';
        return 'sample_value';

      case 'integer':
        if (name.includes('id')) return 123;
        if (name.includes('count') || name.includes('total')) return 10;
        if (name.includes('limit')) return 50;
        return 1;

      case 'number':
        if (name.includes('price') || name.includes('rate')) return 99.99;
        if (name.includes('percentage') || name.includes('ratio')) return 0.5;
        return 1.0;

      case 'boolean':
        if (name.startsWith('is_') || name.startsWith('has_')) return true;
        return false;

      case 'date':
        return new Date().toISOString().split('T')[0];

      case 'datetime':
        return new Date().toISOString();

      case 'email':
        return 'user@example.com';

      case 'url':
        return 'https://example.com';

      case 'uuid':
        return '00000000-0000-0000-0000-000000000000';

      case 'json':
        return {};

      case 'null':
        return null;

      default:
        return '';
    }
  }

  /**
   * Get current state of a variable
   */
  getState(variableName: string): VariableState | undefined {
    return this.states.get(variableName);
  }

  /**
   * Get current value of a variable
   */
  getValue(variableName: string): Jinja2VariableValue | undefined {
    return this.states.get(variableName)?.current;
  }

  /**
   * Get all current values as a record
   */
  getAllValues(): Record<string, Jinja2VariableValue> {
    const values: Record<string, Jinja2VariableValue> = {};
    this.states.forEach((state, name) => {
      values[name] = state.current;
    });
    return values;
  }

  /**
   * Update a variable's value
   */
  updateValue(
    variableName: string,
    value: Jinja2VariableValue,
    type: string,
    source: 'user' | 'default' | 'inferred' | 'suggestion' = 'user'
  ): boolean {
    const currentState = this.states.get(variableName);
    const variable = this.variables.get(variableName);

    if (!currentState || !variable) {
      return false;
    }


    const isValid = this.validateValue(value, type);
    const validationError = this.getValidationError(value, type);


    const newState: VariableState = {
      current: value,
      type: type as Jinja2VariableType,
      history: [
        ...currentState.history.slice(-this.maxHistorySize + 1),
        {
          value,
          type: type as Jinja2VariableType,
          timestamp: new Date(),
          changeReason: 'type-change' as const
        }
      ],
      isValid,
      validationError,
      lastModified: new Date()
    };


    const oldState = { ...currentState };


    this.states.set(variableName, newState);

    // Save to memory if enabled and appropriate
    if (this.memoryEnabled && this.autoSave && source === 'user' && isValid && this.memoryService && this.currentTemplateFingerprint) {
      this.saveToMemory(variableName, value, type as Jinja2VariableType).catch(error => {
        memoryLogger.error('Failed to save variable to memory from state manager', error, {
          operation: 'updateValue',
          variableName,
          templateFingerprint: this.currentTemplateFingerprint
        });
      });
    }

    this.notifyListeners({
      variableName,
      oldState,
      newState,
      source
    });

    return true;
  }

  /**
   * Update a variable's type
   */
  updateType(variableName: string, newType: string): boolean {
    const currentState = this.states.get(variableName);
    if (!currentState) return false;


    const convertedValue = this.convertValueToType(currentState.current, newType);

    return this.updateValue(variableName, convertedValue, newType, 'user');
  }

  /**
   * Convert value to a different type
   */
  private convertValueToType(value: Jinja2VariableValue, targetType: string): Jinja2VariableValue {
    if (value === null || value === undefined) {
      return this.getDefaultValueForType(targetType);
    }

    switch (targetType) {
      case 'string':
        return String(value);

      case 'integer':
        const num = Number(value);
        return isNaN(num) ? 0 : Math.floor(num);

      case 'number':
        const numValue = Number(value);
        return isNaN(numValue) ? 0 : numValue;

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          return lower === 'true' || lower === '1' || lower === 'yes';
        }
        if (typeof value === 'number') return value !== 0;
        return Boolean(value);

      case 'date':
        if (value instanceof Date) return value.toISOString().split('T')[0];
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];

      case 'datetime':
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
        }
        return new Date().toISOString();

      case 'json':
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            return {};
          }
        }
        return {};

      case 'email':
        if (typeof value === 'string' && this.isValidEmail(value)) return value;
        return 'user@example.com';

      case 'url':
        if (typeof value === 'string' && this.isValidUrl(value)) return value;
        return 'https://example.com';

      case 'uuid':
        if (typeof value === 'string' && this.isValidUuid(value)) return value;
        return '00000000-0000-0000-0000-000000000000';

      case 'null':
        return null;

      default:
        return value;
    }
  }

  /**
   * Get default value for a type
   */
  private getDefaultValueForType(type: string): Jinja2VariableValue {
    switch (type) {
      case 'string': return '';
      case 'integer': return 0;
      case 'number': return 0.0;
      case 'boolean': return false;
      case 'date': return new Date().toISOString().split('T')[0];
      case 'datetime': return new Date().toISOString();
      case 'json': return {};
      case 'email': return 'user@example.com';
      case 'url': return 'https://example.com';
      case 'uuid': return '00000000-0000-0000-0000-000000000000';
      case 'null': return null;
      default: return '';
    }
  }

  /**
   * Reset a variable to its default value
   */
  resetVariable(variableName: string): boolean {
    const variable = this.variables.get(variableName);
    if (!variable) return false;

    const defaultValue = this.getDefaultValue(variable);
    return this.updateValue(variableName, defaultValue, variable.type, 'default');
  }

  /**
   * Reset all variables to their default values
   */
  resetAll(): void {
    this.variables.forEach((variable, name) => {
      this.resetVariable(name);
    });
  }

  /**
   * Get history for a variable
   */
  getHistory(variableName: string): VariableHistoryEntry[] {
    return this.states.get(variableName)?.history || [];
  }

  /**
   * Restore a variable to a previous value from history
   */
  restoreFromHistory(variableName: string, historyIndex: number): boolean {
    const state = this.states.get(variableName);
    if (!state || historyIndex < 0 || historyIndex >= state.history.length) {
      return false;
    }

    const historyEntry = state.history[historyIndex];
    return this.updateValue(
      variableName,
      historyEntry.value,
      historyEntry.type,
      'user'
    );
  }

  /**
   * Get suggested values for a variable based on history and context
   */
  getSuggestions(variableName: string, limit: number = 5): Jinja2VariableValue[] {
    const state = this.states.get(variableName);
    const variable = this.variables.get(variableName);

    if (!state || !variable) return [];


    const uniqueValues = new Set<Jinja2VariableValue>();
    state.history.forEach(entry => {
      uniqueValues.add(entry.value);
    });


    const suggestions = Array.from(uniqueValues)
      .filter(value => value !== null && value !== undefined && value !== '')
      .slice(0, limit);


    if (suggestions.length < limit) {
      const contextualSuggestions = this.getContextualSuggestions(variable);
      contextualSuggestions.forEach(suggestion => {
        if (suggestions.length < limit && !suggestions.includes(suggestion)) {
          suggestions.push(suggestion);
        }
      });
    }

    return suggestions;
  }

  /**
   * Get contextual suggestions based on variable name and type
   */
  private getContextualSuggestions(variable: EnhancedVariable): Jinja2VariableValue[] {
    const name = variable.name.toLowerCase();

    switch (variable.type) {
      case 'string':
        if (name.includes('email')) {
          return ['admin@example.com', 'test@domain.com', 'user@company.org'];
        }
        if (name.includes('name')) {
          return ['John Doe', 'Jane Smith', 'Admin User'];
        }
        if (name.includes('status')) {
          return ['active', 'inactive', 'pending', 'completed'];
        }
        return ['sample', 'test', 'demo', 'example'];

      case 'integer':
        if (name.includes('limit')) {
          return [10, 25, 50, 100];
        }
        if (name.includes('page')) {
          return [1, 2, 3, 5, 10];
        }
        return [1, 10, 100, 1000];

      case 'boolean':
        return [true, false];

      default:
        return [];
    }
  }

  /**
   * Validate a value against a type
   */
  private validateValue(value: Jinja2VariableValue, type: string): boolean {
    return validateValue(value, type as Jinja2VariableType) === null;
  }

  /**
   * Get validation error for a value
   */
  private getValidationError(value: Jinja2VariableValue, type: string): string | null {
    return validateValue(value, type as Jinja2VariableType);
  }

  /**
   * Check if a string is a valid email
   */
  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Check if a string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUuid(uuid: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
  }

  /**
   * Add a state change listener
   */
  addListener(listener: (event: StateChangeEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a state change listener
   */
  removeListener(listener: (event: StateChangeEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a state change
   */
  private notifyListeners(event: StateChangeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Get statistics about the current state
   */
  getStatistics() {
    const totalVariables = this.states.size;
    const configuredVariables = Array.from(this.states.values()).filter(
      state => state.current !== null && state.current !== undefined && state.current !== ''
    ).length;
    const validVariables = Array.from(this.states.values()).filter(
      state => state.isValid
    ).length;
    const variablesWithHistory = Array.from(this.states.values()).filter(
      state => state.history.length > 1
    ).length;

    return {
      totalVariables,
      configuredVariables,
      validVariables,
      variablesWithHistory,
      configurationPercentage: totalVariables > 0 ? (configuredVariables / totalVariables) * 100 : 0,
      validityPercentage: totalVariables > 0 ? (validVariables / totalVariables) * 100 : 0
    };
  }

  /**
   * Export current state to JSON
   */
  export(): string {
    const data = {
      variables: Array.from(this.variables.entries()).map(([name, variable]) => ({
        name,
        variable,
        state: this.states.get(name)
      })),
      timestamp: new Date().toISOString(),
      version: '2.0'
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import state from JSON
   */
  import(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      if (!data.variables || !Array.isArray(data.variables)) {
        throw new Error('Invalid import data format');
      }

      data.variables.forEach((item: { name: string; state: VariableState }) => {
        if (item.name && item.state) {
          this.states.set(item.name, item.state);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  /**
   * Save variable to memory
   */
  private async saveToMemory(
    variableName: string,
    value: Jinja2VariableValue,
    type: Jinja2VariableType
  ): Promise<void> {
    if (!this.memoryService || !this.currentTemplateFingerprint) {
      return;
    }

    try {
      // Create a minimal template for memory storage
      const template = ''; // Memory service can work with minimal template
      const variables = { [variableName]: value };
      const types = { [variableName]: type };

      await this.memoryService.saveVariableValues(template, variables, types, 'user');

      memoryLogger.debug('Variable saved to memory from state manager', {
        operation: 'saveToMemory',
        variableName,
        type,
        templateFingerprint: this.currentTemplateFingerprint
      });

    } catch (error) {
      memoryLogger.error('Failed to save variable to memory', error as Error, {
        operation: 'saveToMemory',
        variableName,
        type
      });
      throw error;
    }
  }

  /**
   * Get all remembered values for current template
   */
  async getRememberedValues(): Promise<Record<string, Jinja2VariableValue>> {
    if (!this.memoryService || !this.currentTemplateFingerprint) {
      return {};
    }

    try {
      const template = '';
      const rememberedValues = await this.memoryService.loadVariableValues(template);

      memoryLogger.debug('Remembered values retrieved from state manager', {
        operation: 'getRememberedValues',
        valuesCount: Object.keys(rememberedValues).length,
        templateFingerprint: this.currentTemplateFingerprint
      });

      return rememberedValues;

    } catch (error) {
      memoryLogger.error('Failed to get remembered values', error as Error, {
        operation: 'getRememberedValues'
      });
      return {};
    }
  }

  /**
   * Clear remembered values for current template
   */
  async clearRememberedValues(variableName?: string): Promise<boolean> {
    if (!this.memoryService || !this.currentTemplateFingerprint) {
      return false;
    }

    try {
      const result = await this.memoryService.clearMemory(
        this.currentTemplateFingerprint,
        variableName
      );

      memoryLogger.info('Remembered values cleared from state manager', {
        operation: 'clearRememberedValues',
        variableName,
        entriesAffected: result.entriesAffected,
        success: result.success
      });

      return result.success;

    } catch (error) {
      memoryLogger.error('Failed to clear remembered values', error as Error, {
        operation: 'clearRememberedValues',
        variableName
      });
      return false;
    }
  }

  /**
   * Enable or disable memory persistence
   */
  setMemoryEnabled(enabled: boolean): void {
    this.memoryEnabled = enabled;

    memoryLogger.info('Memory persistence setting updated', {
      operation: 'setMemoryEnabled',
      enabled
    });
  }

  /**
   * Enable or disable auto-save to memory
   */
  setAutoSave(autoSave: boolean): void {
    this.autoSave = autoSave;

    memoryLogger.info('Auto-save setting updated', {
      operation: 'setAutoSave',
      autoSave
    });
  }

  /**
   * Get memory statistics
   */
  async getMemoryStatistics(): Promise<{
    isMemoryEnabled: boolean;
    hasCurrentTemplate: boolean;
    templateFingerprint?: string;
    rememberedVariableCount: number;
  }> {
    try {
      const rememberedValues = await this.getRememberedValues();

      return {
        isMemoryEnabled: this.memoryEnabled,
        hasCurrentTemplate: !!this.currentTemplateFingerprint,
        templateFingerprint: this.currentTemplateFingerprint,
        rememberedVariableCount: Object.keys(rememberedValues).length
      };

    } catch (error) {
      memoryLogger.error('Failed to get memory statistics', error as Error, {
        operation: 'getMemoryStatistics'
      });

      return {
        isMemoryEnabled: this.memoryEnabled,
        hasCurrentTemplate: !!this.currentTemplateFingerprint,
        templateFingerprint: this.currentTemplateFingerprint,
        rememberedVariableCount: 0
      };
    }
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.states.clear();
    this.variables.clear();
    this.listeners.clear();
    this.currentTemplateFingerprint = undefined;
  }
}

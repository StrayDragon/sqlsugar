/**
 * Variable memory storage service for persistent variable values
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { ExtensionContext } from 'vscode';
import type {
  TemplateFingerprint,
  VariableMemory,
  VariableMemoryStorage,
  MemoryServiceConfig,
  ValueSuggestion
} from '../types/memory';
import type { Jinja2VariableValue, Jinja2VariableType } from '../types/types';
import { templateFingerprinter } from './template-fingerprinter';
import { variableSerializer } from './variable-serializer';
import { memoryLogger } from '../../../core/logging/memory-logger';

/**
 * Memory storage operation result
 */
export interface MemoryOperationResult {
  success: boolean;
  error?: string;
  entriesAffected?: number;
  storageUsed?: number;
}

/**
 * Memory statistics
 */
export interface MemoryStatistics {
  totalTemplates: number;
  totalVariables: number;
  totalMemoryUsed: number;
  oldestEntry: number;
  newestEntry: number;
  averageConfidence: number;
}

/**
 * Variable memory storage service
 */
export class VariableMemoryService {
  private context: ExtensionContext;
  private config: MemoryServiceConfig;
  private readonly STORAGE_VERSION = '2.0';
  private readonly STORAGE_KEY = 'sqlsugar.variableMemory';
  private readonly GLOBAL_STATE_KEY = 'sqlsugar.variableMemory.global';
  private readonly WORKSPACE_STATE_KEY = 'sqlsugar.variableMemory.workspace';

  constructor(context: ExtensionContext, config?: Partial<MemoryServiceConfig>) {
    this.context = context;
    this.config = {
      storageLocation: 'hybrid',
      maxStorageEntries: 1000,
      retentionDays: 30,
      autoCleanup: true,
      enableAnalytics: true,
      ...config
    };

    // Initialize storage if needed
    this.initializeStorage();
  }

  /**
   * Save variable values for a template
   */
  public async saveVariableValues(
    template: string,
    variables: Record<string, Jinja2VariableValue>,
    types: Record<string, Jinja2VariableType>,
    source: 'user' | 'inferred' | 'default' | 'suggestion' = 'user'
  ): Promise<MemoryOperationResult> {
    const startTime = Date.now();

    try {
      const fingerprint = templateFingerprinter.generateFingerprint(template);
      const storage = this.getStorage();

      // Initialize template entry if it doesn't exist
      if (!storage.templates[fingerprint.structureHash]) {
        storage.templates[fingerprint.structureHash] = {
          fingerprint,
          variables: {},
          lastAccessed: Date.now(),
          accessCount: 0
        };
      }

      const templateEntry = storage.templates[fingerprint.structureHash];
      let entriesAffected = 0;

      // Save each variable
      for (const [name, value] of Object.entries(variables)) {
        const type = types[name] || this.inferType(value);
        const existingMemories = templateEntry.variables[name] || [];

        // Create new memory entry
        const memory: VariableMemory = {
          variableName: name,
          value,
          type,
          timestamp: Date.now(),
          confidence: source === 'user' ? 1.0 : 0.8,
          source,
          templateFingerprint: fingerprint.structureHash,
          usageCount: 0,
          lastUsed: Date.now()
        };

        // Add to memory history (keep most recent entries)
        existingMemories.push(memory);
        if (existingMemories.length > 10) {
          existingMemories.shift(); // Remove oldest
        }

        templateEntry.variables[name] = existingMemories;
        entriesAffected++;

        // Update global patterns
        this.updateGlobalPatterns(name, value, type, source);

        memoryLogger.debug('Variable saved to memory', {
          operation: 'saveVariableValues',
          templateFingerprint: fingerprint.structureHash,
          variableName: name,
          source
        });
      }

      // Update template metadata
      templateEntry.lastAccessed = Date.now();
      templateEntry.accessCount++;

      // Save to storage
      await this.saveStorage(storage);

      const duration = Date.now() - startTime;
      memoryLogger.performance('saveVariableValues', duration, {
        entriesAffected,
        templateFingerprint: fingerprint.structureHash
      });

      return {
        success: true,
        entriesAffected,
        storageUsed: this.calculateStorageSize(storage)
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      memoryLogger.error('Failed to save variable values', error as Error, {
        operation: 'saveVariableValues',
        duration
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Load variable values for a template
   */
  public async loadVariableValues(
    template: string,
    options?: { includeHistory?: boolean; maxAge?: number }
  ): Promise<Record<string, Jinja2VariableValue>> {
    const startTime = Date.now();

    try {
      const fingerprint = templateFingerprinter.generateFingerprint(template);
      const storage = this.getStorage();

      // Try exact match first
      let templateEntry = storage.templates[fingerprint.structureHash];

      // If no exact match, try similar templates
      if (!templateEntry && options?.maxAge !== 0) {
        templateEntry = this.findSimilarTemplateEntry(fingerprint, storage);
      }

      if (!templateEntry) {
        return {};
      }

      const result: Record<string, Jinja2VariableValue> = {};
      const now = Date.now();
      const maxAge = options?.maxAge || (this.config.retentionDays * 24 * 60 * 60 * 1000);

      // Extract most recent values for each variable
      for (const [name, memories] of Object.entries(templateEntry.variables)) {
        // Get the most recent valid memory
        const latestMemory = memories
          .filter(mem => (now - mem.timestamp) <= maxAge)
          .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (latestMemory && latestMemory.confidence >= 0.5) {
          result[name] = latestMemory.value;

          // Update usage statistics
          latestMemory.usageCount++;
          latestMemory.lastUsed = now;

          memoryLogger.debug('Variable loaded from memory', {
            operation: 'loadVariableValues',
            templateFingerprint: fingerprint.structureHash,
            variableName: name,
            confidence: latestMemory.confidence
          });
        }
      }

      // Save updated usage statistics
      if (Object.keys(result).length > 0) {
        templateEntry.lastAccessed = now;
        await this.saveStorage(storage);
      }

      const duration = Date.now() - startTime;
      memoryLogger.performance('loadVariableValues', duration, {
        variablesLoaded: Object.keys(result).length
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      memoryLogger.error('Failed to load variable values', error as Error, {
        operation: 'loadVariableValues',
        duration
      });

      return {};
    }
  }

  /**
   * Get value suggestions for a variable
   */
  public async getValueSuggestions(
    variableName: string,
    type?: Jinja2VariableType,
    limit: number = 5
  ): Promise<ValueSuggestion[]> {
    try {
      const storage = this.getStorage();
      const suggestions: ValueSuggestion[] = [];

      // Check global patterns first
      const globalPattern = storage.globalPatterns[variableName];
      if (globalPattern) {
        for (const commonValue of globalPattern.commonValues) {
          if (type && commonValue.type !== type) continue;

          suggestions.push({
            value: commonValue.value,
            type: commonValue.type,
            confidence: commonValue.confidence,
            source: 'pattern',
            reason: 'Commonly used value',
            frequency: commonValue.frequency
          });

          if (suggestions.length >= limit) break;
        }
      }

      // Search through all templates for this variable
      for (const templateEntry of Object.values(storage.templates)) {
        const memories = templateEntry.variables[variableName];
        if (!memories) continue;

        for (const memory of memories) {
          if (type && memory.type !== type) continue;
          if (memory.confidence < 0.3) continue;

          // Check if we already have this value
          const exists = suggestions.some(s =>
            JSON.stringify(s.value) === JSON.stringify(memory.value)
          );

          if (!exists) {
            suggestions.push({
              value: memory.value,
              type: memory.type,
              confidence: memory.confidence,
              source: 'history',
              reason: 'Previously used value',
              frequency: memory.usageCount
            });

            if (suggestions.length >= limit) break;
          }
        }

        if (suggestions.length >= limit) break;
      }

      // Sort by confidence and frequency
      suggestions.sort((a, b) => {
        const scoreA = a.confidence * (1 + Math.log(a.frequency + 1) / 10);
        const scoreB = b.confidence * (1 + Math.log(b.frequency + 1) / 10);
        return scoreB - scoreA;
      });

      return suggestions.slice(0, limit);

    } catch (error) {
      memoryLogger.error('Failed to get value suggestions', error as Error, {
        operation: 'getValueSuggestions',
        variableName
      });

      return [];
    }
  }

  /**
   * Clear variable memory
   */
  public async clearMemory(
    templateFingerprint?: string,
    variableName?: string
  ): Promise<MemoryOperationResult> {
    try {
      const storage = this.getStorage();
      let entriesAffected = 0;

      if (templateFingerprint) {
        // Clear specific template
        if (storage.templates[templateFingerprint]) {
          if (variableName) {
            // Clear specific variable
            const count = storage.templates[templateFingerprint].variables[variableName]?.length || 0;
            delete storage.templates[templateFingerprint].variables[variableName];
            entriesAffected = count;
          } else {
            // Clear entire template
            entriesAffected = Object.values(storage.templates[templateFingerprint].variables)
              .reduce((sum, vars) => sum + vars.length, 0);
            delete storage.templates[templateFingerprint];
          }
        }
      } else {
        // Clear all memory
        entriesAffected = Object.values(storage.templates)
          .reduce((sum, template) =>
            sum + Object.values(template.variables).reduce((subSum, vars) => subSum + vars.length, 0), 0);
        storage.templates = {};
        storage.globalPatterns = {};
      }

      await this.saveStorage(storage);

      memoryLogger.info('Memory cleared', {
        operation: 'clearMemory',
        templateFingerprint,
        variableName,
        entriesAffected
      });

      return {
        success: true,
        entriesAffected
      };

    } catch (error) {
      memoryLogger.error('Failed to clear memory', error as Error, {
        operation: 'clearMemory',
        templateFingerprint,
        variableName
      });

      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get memory statistics
   */
  public async getStatistics(): Promise<MemoryStatistics> {
    try {
      const storage = this.getStorage();
      let totalVariables = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;

      for (const templateEntry of Object.values(storage.templates)) {
        for (const memories of Object.values(templateEntry.variables)) {
          totalVariables += memories.length;

          for (const memory of memories) {
            totalConfidence += memory.confidence;
            confidenceCount++;
            oldestEntry = Math.min(oldestEntry, memory.timestamp);
            newestEntry = Math.max(newestEntry, memory.timestamp);
          }
        }
      }

      return {
        totalTemplates: Object.keys(storage.templates).length,
        totalVariables,
        totalMemoryUsed: this.calculateStorageSize(storage),
        oldestEntry,
        newestEntry,
        averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0
      };

    } catch (error) {
      memoryLogger.error('Failed to get memory statistics', error as Error, {
        operation: 'getStatistics'
      });

      return {
        totalTemplates: 0,
        totalVariables: 0,
        totalMemoryUsed: 0,
        oldestEntry: 0,
        newestEntry: 0,
        averageConfidence: 0
      };
    }
  }

  /**
   * Initialize storage
   */
  private initializeStorage(): void {
    const existing = this.getStorage();

    if (!existing || existing.version !== this.STORAGE_VERSION) {
      // Initialize new storage
      const newStorage: VariableMemoryStorage = {
        version: this.STORAGE_VERSION,
        lastMigrated: Date.now(),
        templates: {},
        globalPatterns: {},
        settings: {
          autoSaveEnabled: true,
          maxHistoryEntries: 10,
          retentionDays: this.config.retentionDays,
          minConfidenceThreshold: 0.5,
          enableTypeInference: true,
          showConfidenceIndicators: true
        },
        analytics: {
          totalVariablesRemembered: 0,
          totalTemplatesProcessed: 0,
          averageConfidenceScore: 0,
          lastCleanup: Date.now()
        }
      };

      this.saveStorage(newStorage);
      memoryLogger.info('Variable memory storage initialized', {
        operation: 'initializeStorage',
        version: this.STORAGE_VERSION
      });
    }
  }

  /**
   * Get storage from appropriate location
   */
  private getStorage(): VariableMemoryStorage {
    const storage = this.config.storageLocation === 'workspace'
      ? this.context.workspaceState.get(this.WORKSPACE_STATE_KEY)
      : this.context.globalState.get(this.GLOBAL_STATE_KEY);

    return storage || this.getFallbackStorage();
  }

  /**
   * Get fallback storage (global)
   */
  private getFallbackStorage(): VariableMemoryStorage {
    return this.context.globalState.get(this.GLOBAL_STATE_KEY) || {
      version: this.STORAGE_VERSION,
      lastMigrated: Date.now(),
      templates: {},
      globalPatterns: {},
      settings: {
        autoSaveEnabled: true,
        maxHistoryEntries: 10,
        retentionDays: this.config.retentionDays,
        minConfidenceThreshold: 0.5,
        enableTypeInference: true,
        showConfidenceIndicators: true
      },
      analytics: {
        totalVariablesRemembered: 0,
        totalTemplatesProcessed: 0,
        averageConfidenceScore: 0,
        lastCleanup: Date.now()
      }
    };
  }

  /**
   * Save storage to appropriate location
   */
  private async saveStorage(storage: VariableMemoryStorage): Promise<void> {
    try {
      if (this.config.storageLocation === 'workspace') {
        await this.context.workspaceState.update(this.WORKSPACE_STATE_KEY, storage);
      } else {
        await this.context.globalState.update(this.GLOBAL_STATE_KEY, storage);
      }

      // Also save to global if hybrid mode
      if (this.config.storageLocation === 'hybrid') {
        await this.context.globalState.update(this.GLOBAL_STATE_KEY, storage);
      }

    } catch (error) {
      memoryLogger.error('Failed to save storage', error as Error, {
        operation: 'saveStorage',
        storageLocation: this.config.storageLocation
      });
      throw error;
    }
  }

  /**
   * Find similar template entry
   */
  private findSimilarTemplateEntry(
    fingerprint: TemplateFingerprint,
    storage: VariableMemoryStorage
  ) {
    const storedFingerprints = Object.values(storage.templates).map(entry => entry.fingerprint);
    const similar = templateFingerprinter.findSimilarFingerprints(fingerprint, storedFingerprints, 0.8);

    if (similar.length > 0) {
      const similarHash = similar[0].structureHash;
      return storage.templates[similarHash];
    }

    return null;
  }

  /**
   * Update global patterns
   */
  private updateGlobalPatterns(
    variableName: string,
    value: Jinja2VariableValue,
    type: Jinja2VariableType,
    source: 'user' | 'inferred' | 'default' | 'suggestion'
  ): void {
    const storage = this.getStorage();

    if (!storage.globalPatterns[variableName]) {
      storage.globalPatterns[variableName] = {
        commonValues: [],
        lastUpdated: Date.now()
      };
    }

    const pattern = storage.globalPatterns[variableName];

    // Check if value already exists
    const existing = pattern.commonValues.find(cv =>
      JSON.stringify(cv.value) === JSON.stringify(value)
    );

    if (existing) {
      existing.frequency++;
      existing.confidence = Math.min(1.0, existing.confidence + 0.1);
    } else {
      // Add new value
      pattern.commonValues.push({
        value,
        type,
        frequency: 1,
        confidence: source === 'user' ? 0.8 : 0.6
      });

      // Keep only top values
      pattern.commonValues.sort((a, b) => {
        const scoreA = a.confidence * a.frequency;
        const scoreB = b.confidence * b.frequency;
        return scoreB - scoreA;
      });

      if (pattern.commonValues.length > 20) {
        pattern.commonValues = pattern.commonValues.slice(0, 20);
      }
    }

    pattern.lastUpdated = Date.now();
  }

  /**
   * Calculate storage size
   */
  private calculateStorageSize(storage: VariableMemoryStorage): number {
    return JSON.stringify(storage).length;
  }

  /**
   * Infer type from value
   */
  private inferType(value: Jinja2VariableValue): Jinja2VariableType {
    if (value === null) return 'null';
    if (typeof value === 'undefined') return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
    if (value instanceof Date) return 'datetime';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }
}

/**
 * Create memory service instance
 */
export function createMemoryService(context: ExtensionContext, config?: Partial<MemoryServiceConfig>): VariableMemoryService {
  return new VariableMemoryService(context, config);
}
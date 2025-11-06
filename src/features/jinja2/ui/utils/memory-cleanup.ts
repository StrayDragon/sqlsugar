/**
 * Memory cleanup and maintenance utilities
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { VariableMemoryStorage, MemoryCleanupOptions } from '../types/memory';
import type { memoryLogger } from '../../../core/logging/memory-logger';

/**
 * Cleanup operation result
 */
export interface CleanupResult {
  entriesDeleted: number;
  spaceFreed: number;
  templatesAffected: number;
  variablesAffected: number;
  errors: string[];
  duration: number;
}

/**
 * Cleanup statistics
 */
export interface CleanupStatistics {
  totalEntries: number;
  entriesToCleanup: number;
  estimatedSpaceToFree: number;
  oldestEntry: number;
  newestEntry: number;
  averageAge: number;
  retentionDays: number;
}

/**
 * Memory cleanup and maintenance service
 */
export class MemoryCleanupService {
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB VS Code limit
  private readonly CLEANUP_THRESHOLD = 0.9; // Start cleanup at 90% capacity
  private readonly DEFAULT_RETENTION_DAYS = 30;

  /**
   * Perform cleanup based on options
   */
  public async cleanup(
    storage: VariableMemoryStorage,
    options: Partial<MemoryCleanupOptions> = {}
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const opts: Required<MemoryCleanupOptions> = {
      retentionDays: options.retentionDays || this.DEFAULT_RETENTION_DAYS,
      dryRun: options.dryRun || false,
      includeLowConfidence: options.includeLowConfidence || true,
      minConfidenceThreshold: options.minConfidenceThreshold || 0.3
    };

    const result: CleanupResult = {
      entriesDeleted: 0,
      spaceFreed: 0,
      templatesAffected: 0,
      variablesAffected: 0,
      errors: [],
      duration: 0
    };

    const originalSize = JSON.stringify(storage).length;

    try {
      memoryLogger.info('Starting memory cleanup', {
        operation: 'cleanup',
        retentionDays: opts.retentionDays,
        dryRun: opts.dryRun,
        originalSize
      });

      // Calculate statistics
      const stats = this.calculateCleanupStatistics(storage, opts);
      memoryLogger.info('Cleanup statistics calculated', {
        operation: 'cleanup',
        totalEntries: stats.totalEntries,
        entriesToCleanup: stats.entriesToCleanup,
        estimatedSpaceToFree: stats.estimatedSpaceToFree
      });

      // Perform actual cleanup
      await this.performStorageCleanup(storage, opts, result);

      // Update analytics
      if (!opts.dryRun) {
        storage.analytics.lastCleanup = Date.now();
        this.updateStorageAnalytics(storage, result);
      }

      const finalSize = JSON.stringify(storage).length;
      result.duration = Date.now() - startTime;
      result.spaceFreed = originalSize - finalSize;

      memoryLogger.info('Memory cleanup completed', {
        operation: 'cleanup',
        entriesDeleted: result.entriesDeleted,
        spaceFreed: result.spaceFreed,
        templatesAffected: result.templatesAffected,
        variablesAffected: result.variablesAffected,
        duration: result.duration,
        dryRun: opts.dryRun
      });

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push((error as Error).message);

      memoryLogger.error('Memory cleanup failed', error as Error, {
        operation: 'cleanup',
        duration: result.duration
      });
    }

    return result;
  }

  /**
   * Check if cleanup is needed
   */
  public isCleanupNeeded(storage: VariableMemoryStorage): boolean {
    try {
      const currentSize = JSON.stringify(storage).length;
      return currentSize > (this.MAX_STORAGE_SIZE * this.CLEANUP_THRESHOLD);
    } catch (error) {
      memoryLogger.error('Failed to check cleanup necessity', error as Error, {
        operation: 'isCleanupNeeded'
      });
      return false;
    }
  }

  /**
   * Get cleanup statistics
   */
  public getCleanupStatistics(
    storage: VariableMemoryStorage,
    options: Partial<MemoryCleanupOptions> = {}
  ): CleanupStatistics {
    const opts: Required<MemoryCleanupOptions> = {
      retentionDays: options.retentionDays || this.DEFAULT_RETENTION_DAYS,
      dryRun: true,
      includeLowConfidence: options.includeLowConfidence || true,
      minConfidenceThreshold: options.minConfidenceThreshold || 0.3
    };

    return this.calculateCleanupStatistics(storage, opts);
  }

  /**
   * Optimize storage structure
   */
  public optimizeStorage(storage: VariableMemoryStorage): {
    optimized: boolean;
    spaceSaved: number;
    optimizations: string[];
  } {
    const originalSize = JSON.stringify(storage).length;
    const optimizations: string[] = [];
    let optimized = false;

    try {
      // Optimize global patterns
      const patternCountBefore = Object.keys(storage.globalPatterns).length;
      this.optimizeGlobalPatterns(storage);
      const patternCountAfter = Object.keys(storage.globalPatterns).length;

      if (patternCountAfter < patternCountBefore) {
        optimizations.push(`Removed ${patternCountBefore - patternCountAfter} unused global patterns`);
        optimized = true;
      }

      // Optimize template entries
      let variablesOptimized = 0;
      for (const [fingerprint, templateEntry] of Object.entries(storage.templates)) {
        const optimizedCount = this.optimizeTemplateEntry(templateEntry);
        if (optimizedCount > 0) {
          variablesOptimized += optimizedCount;
        }
      }

      if (variablesOptimized > 0) {
        optimizations.push(`Optimized ${variablesOptimized} variable histories`);
        optimized = true;
      }

      // Clean up analytics
      this.cleanupAnalytics(storage);
      optimizations.push('Cleaned up analytics data');
      optimized = true;

      const finalSize = JSON.stringify(storage).length;
      const spaceSaved = originalSize - finalSize;

      memoryLogger.info('Storage optimization completed', {
        operation: 'optimizeStorage',
        optimized,
        spaceSaved,
        optimizations: optimizations.length
      });

      return {
        optimized,
        spaceSaved,
        optimizations
      };

    } catch (error) {
      memoryLogger.error('Storage optimization failed', error as Error, {
        operation: 'optimizeStorage'
      });

      return {
        optimized: false,
        spaceSaved: 0,
        optimizations: [`Error: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Calculate cleanup statistics
   */
  private calculateCleanupStatistics(
    storage: VariableMemoryStorage,
    options: Required<MemoryCleanupOptions>
  ): CleanupStatistics {
    let totalEntries = 0;
    let entriesToCleanup = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    let totalAge = 0;

    const cutoffTime = Date.now() - (options.retentionDays * 24 * 60 * 60 * 1000);

    for (const templateEntry of Object.values(storage.templates)) {
      for (const [variableName, memories] of Object.entries(templateEntry.variables)) {
        for (const memory of memories) {
          totalEntries++;

          oldestEntry = Math.min(oldestEntry, memory.timestamp);
          newestEntry = Math.max(newestEntry, memory.timestamp);
          totalAge += (Date.now() - memory.timestamp);

          const shouldCleanup = this.shouldCleanupMemory(memory, cutoffTime, options);
          if (shouldCleanup) {
            entriesToCleanup++;
          }
        }
      }
    }

    const averageAge = totalEntries > 0 ? totalAge / totalEntries : 0;
    const estimatedSpaceToFree = this.estimateSpaceSavings(totalEntries, entriesToCleanup);

    return {
      totalEntries,
      entriesToCleanup,
      estimatedSpaceToFree,
      oldestEntry,
      newestEntry,
      averageAge,
      retentionDays: options.retentionDays
    };
  }

  /**
   * Perform actual storage cleanup
   */
  private async performStorageCleanup(
    storage: VariableMemoryStorage,
    options: Required<MemoryCleanupOptions>,
    result: CleanupResult
  ): Promise<void> {
    const cutoffTime = Date.now() - (options.retentionDays * 24 * 60 * 60 * 1000);
    const templatesToDelete: string[] = [];

    for (const [fingerprint, templateEntry] of Object.entries(storage.templates)) {
      let templateModified = false;
      const variablesToDelete: string[] = [];

      for (const [variableName, memories] of Object.entries(templateEntry.variables)) {
        const filteredMemories = memories.filter(memory => {
          const shouldKeep = !this.shouldCleanupMemory(memory, cutoffTime, options);
          if (!shouldKeep) {
            result.entriesDeleted++;
          }
          return shouldKeep;
        });

        if (filteredMemories.length === 0) {
          variablesToDelete.push(variableName);
        } else if (filteredMemories.length < memories.length) {
          templateEntry.variables[variableName] = filteredMemories;
          result.variablesAffected++;
          templateModified = true;
        }
      }

      // Remove empty variable entries
      variablesToDelete.forEach(variableName => {
        delete templateEntry.variables[variableName];
        templateModified = true;
      });

      // Mark template for deletion if it has no variables
      if (Object.keys(templateEntry.variables).length === 0) {
        templatesToDelete.push(fingerprint);
      } else if (templateModified) {
        result.templatesAffected++;
      }
    }

    // Delete empty templates
    if (!options.dryRun) {
      templatesToDelete.forEach(fingerprint => {
        delete storage.templates[fingerprint];
        result.templatesAffected++;
      });
    }

    // Cleanup global patterns
    await this.cleanupGlobalPatterns(storage, options, result);
  }

  /**
   * Check if memory entry should be cleaned up
   */
  private shouldCleanupMemory(
    memory: any,
    cutoffTime: number,
    options: Required<MemoryCleanupOptions>
  ): boolean {
    // Check age
    if (memory.timestamp < cutoffTime) {
      return true;
    }

    // Check confidence threshold
    if (options.includeLowConfidence && memory.confidence < options.minConfidenceThreshold) {
      return true;
    }

    // Check usage (never used entries might be candidates)
    if (memory.usageCount === 0 && (Date.now() - memory.timestamp) > (7 * 24 * 60 * 60 * 1000)) {
      return true; // 7 days for unused entries
    }

    return false;
  }

  /**
   * Estimate space savings from cleanup
   */
  private estimateSpaceSavings(totalEntries: number, entriesToCleanup: number): number {
    if (totalEntries === 0) return 0;

    const averageEntrySize = 200; // Estimated average size in bytes
    return entriesToCleanup * averageEntrySize;
  }

  /**
   * Cleanup global patterns
   */
  private async cleanupGlobalPatterns(
    storage: VariableMemoryStorage,
    options: Required<MemoryCleanupOptions>,
    result: CleanupResult
  ): Promise<void> {
    const patternsToDelete: string[] = [];
    const cutoffTime = Date.now() - (options.retentionDays * 24 * 60 * 60 * 1000);

    for (const [patternName, patternData] of Object.entries(storage.globalPatterns)) {
      // Remove patterns that haven't been updated recently
      if (patternData.lastUpdated < cutoffTime) {
        patternsToDelete.push(patternName);
        continue;
      }

      // Clean up old values in pattern
      const originalCount = patternData.commonValues.length;
      patternData.commonValues = patternData.commonValues.filter(value => {
        return value.confidence >= options.minConfidenceThreshold ||
               value.frequency >= 2; // Keep values used at least twice
      });

      if (patternData.commonValues.length === 0) {
        patternsToDelete.push(patternName);
      } else if (patternData.commonValues.length < originalCount) {
        result.entriesDeleted += (originalCount - patternData.commonValues.length);
      }
    }

    // Delete unused patterns
    if (!options.dryRun) {
      patternsToDelete.forEach(patternName => {
        delete storage.globalPatterns[patternName];
      });
    }
  }

  /**
   * Optimize global patterns
   */
  private optimizeGlobalPatterns(storage: VariableMemoryStorage): void {
    for (const [patternName, patternData] of Object.entries(storage.globalPatterns)) {
      // Sort by confidence and frequency
      patternData.commonValues.sort((a, b) => {
        const scoreA = a.confidence * a.frequency;
        const scoreB = b.confidence * b.frequency;
        return scoreB - scoreA;
      });

      // Keep only top values
      if (patternData.commonValues.length > 10) {
        patternData.commonValues = patternData.commonValues.slice(0, 10);
      }

      // Remove duplicates
      const seen = new Set();
      patternData.commonValues = patternData.commonValues.filter(value => {
        const key = JSON.stringify(value.value);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
  }

  /**
   * Optimize template entry
   */
  private optimizeTemplateEntry(templateEntry: any): number {
    let optimizedCount = 0;

    for (const [variableName, memories] of Object.entries(templateEntry.variables)) {
      if (Array.isArray(memories)) {
        // Sort by timestamp (newest first)
        memories.sort((a, b) => b.timestamp - a.timestamp);

        // Keep only recent entries (limit to 5 per variable)
        if (memories.length > 5) {
          const originalLength = memories.length;
          memories.splice(5);
          optimizedCount += (originalLength - memories.length);
        }
      }
    }

    return optimizedCount;
  }

  /**
   * Clean up analytics data
   */
  private cleanupAnalytics(storage: VariableMemoryStorage): void {
    // Ensure analytics fields exist and are valid
    storage.analytics = {
      totalVariablesRemembered: this.calculateTotalVariables(storage),
      totalTemplatesProcessed: Object.keys(storage.templates).length,
      averageConfidenceScore: this.calculateAverageConfidence(storage),
      lastCleanup: storage.analytics?.lastCleanup || Date.now()
    };
  }

  /**
   * Update storage analytics after cleanup
   */
  private updateStorageAnalytics(storage: VariableMemoryStorage, result: CleanupResult): void {
    storage.analytics.totalVariablesRemembered = Math.max(0,
      (storage.analytics.totalVariablesRemembered || 0) - result.entriesDeleted);
  }

  /**
   * Calculate total variables in storage
   */
  private calculateTotalVariables(storage: VariableMemoryStorage): number {
    let total = 0;
    for (const templateEntry of Object.values(storage.templates)) {
      total += Object.values(templateEntry.variables)
        .reduce((sum, memories) => sum + memories.length, 0);
    }
    return total;
  }

  /**
   * Calculate average confidence score
   */
  private calculateAverageConfidence(storage: VariableMemoryStorage): number {
    let totalConfidence = 0;
    let totalCount = 0;

    for (const templateEntry of Object.values(storage.templates)) {
      for (const memories of Object.values(templateEntry.variables)) {
        for (const memory of memories) {
          totalConfidence += memory.confidence;
          totalCount++;
        }
      }
    }

    return totalCount > 0 ? totalConfidence / totalCount : 0;
  }
}

/**
 * Singleton instance for memory cleanup
 */
export const memoryCleanupService = new MemoryCleanupService();

/**
 * Convenience function to check and perform cleanup if needed
 */
export async function cleanupIfNeeded(
  storage: VariableMemoryStorage,
  options?: Partial<MemoryCleanupOptions>
): Promise<CleanupResult> {
  const isNeeded = memoryCleanupService.isCleanupNeeded(storage);

  if (isNeeded) {
    return await memoryCleanupService.cleanup(storage, options);
  }

  return {
    entriesDeleted: 0,
    spaceFreed: 0,
    templatesAffected: 0,
    variablesAffected: 0,
    errors: [],
    duration: 0
  };
}
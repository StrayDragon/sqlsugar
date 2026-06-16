/**
 * Analyzer Pipeline
 *
 * Manages and executes multiple analyzers in priority order.
 * Supports short-circuit execution and parameter deduplication.
 */

import type {
  Analyzer,
  AnalyzerContext,
  AnalyzerResult,
  ExtractedParameter,
  PipelineOptions,
  PipelineResult,
} from './types.js';

/**
 * Default pipeline options
 */
const DEFAULT_OPTIONS: Required<PipelineOptions> = {
  shortCircuit: false,
  enabledAnalyzers: [],
  deduplicate: true,
};

/**
 * Analyzer Pipeline - orchestrates multiple analyzers
 */
export class AnalyzerPipeline {
  private analyzers: Map<string, Analyzer> = new Map();
  private sortedAnalyzers: Analyzer[] = [];
  private dirty = true;

  /**
   * Register an analyzer with the pipeline
   * @param analyzer - Analyzer to register
   * @throws Error if analyzer name already exists
   */
  register(analyzer: Analyzer): void {
    if (this.analyzers.has(analyzer.name)) {
      throw new Error(`Analyzer "${analyzer.name}" is already registered`);
    }
    this.analyzers.set(analyzer.name, analyzer);
    this.dirty = true;
  }

  /**
   * Unregister an analyzer by name
   * @param name - Analyzer name to remove
   * @returns Whether the analyzer was found and removed
   */
  unregister(name: string): boolean {
    const removed = this.analyzers.delete(name);
    if (removed) {
      this.dirty = true;
    }
    return removed;
  }

  /**
   * Get a registered analyzer by name
   * @param name - Analyzer name
   * @returns Analyzer or undefined
   */
  getAnalyzer(name: string): Analyzer | undefined {
    return this.analyzers.get(name);
  }

  /**
   * Get all registered analyzer names
   * @returns Array of analyzer names
   */
  getRegisteredAnalyzers(): string[] {
    return Array.from(this.analyzers.keys());
  }

  /**
   * Get all registered analyzers sorted by priority
   * @returns Sorted array of analyzers
   */
  getSortedAnalyzers(): Analyzer[] {
    if (this.dirty) {
      this.sortedAnalyzers = Array.from(this.analyzers.values()).sort(
        (a, b) => a.priority - b.priority
      );
      this.dirty = false;
    }
    return [...this.sortedAnalyzers];
  }

  /**
   * Check if an analyzer is registered
   * @param name - Analyzer name
   * @returns Whether the analyzer exists
   */
  hasAnalyzer(name: string): boolean {
    return this.analyzers.has(name);
  }

  /**
   * Execute the pipeline on a SQL string
   * @param sql - SQL string to analyze
   * @param options - Pipeline execution options
   * @returns Pipeline execution result
   */
  execute(sql: string, options: PipelineOptions = {}): PipelineResult {
    const startTime = performance.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const sortedAnalyzers = this.getSortedAnalyzers();
    const enabledSet = new Set(
      mergedOptions.enabledAnalyzers.length > 0
        ? mergedOptions.enabledAnalyzers
        : sortedAnalyzers.map((a) => a.name)
    );

    const allParameters: ExtractedParameter[] = [];
    const analyzerResults = new Map<string, AnalyzerResult>();
    const executedAnalyzers: string[] = [];
    let shortCircuited = false;

    for (const analyzer of sortedAnalyzers) {
      // Skip disabled analyzers
      if (!enabledSet.has(analyzer.name)) {
        continue;
      }

      // Build context with existing parameters
      const context: AnalyzerContext = {
        template: sql,
        existingParameters: [...allParameters],
      };

      // Execute analyzer
      const result = analyzer.analyze(sql, context);
      analyzerResults.set(analyzer.name, result);
      executedAnalyzers.push(analyzer.name);

      // Add extracted parameters
      if (result.hasResults) {
        // Offset positions for parameters already extracted
        const offsetParameters = result.parameters.map((param, index) => ({
          ...param,
          position: allParameters.length + index,
        }));
        allParameters.push(...offsetParameters);

        // Short-circuit if enabled and results found
        if (mergedOptions.shortCircuit) {
          shortCircuited = true;
          break;
        }
      }
    }

    // Deduplicate parameters if enabled
    const finalParameters = mergedOptions.deduplicate
      ? this.deduplicateParameters(allParameters)
      : allParameters;

    const endTime = performance.now();

    return {
      parameters: finalParameters,
      analyzerResults,
      metadata: {
        executedAnalyzers,
        executionTime: endTime - startTime,
        shortCircuited,
      },
    };
  }

  /**
   * Deduplicate parameters by name and position
   * @param parameters - Parameters to deduplicate
   * @returns Deduplicated parameters with corrected positions
   */
  private deduplicateParameters(
    parameters: ExtractedParameter[]
  ): ExtractedParameter[] {
    const seen = new Set<string>();
    const deduplicated: ExtractedParameter[] = [];

    for (const param of parameters) {
      // Create a unique key based on name and position
      const key = `${param.name}:${param.startIndex}:${param.endIndex}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push({
          ...param,
          position: deduplicated.length,
        });
      }
    }

    return deduplicated;
  }

  /**
   * Clear all registered analyzers
   */
  clear(): void {
    this.analyzers.clear();
    this.sortedAnalyzers = [];
    this.dirty = true;
  }

  /**
   * Get the number of registered analyzers
   */
  get size(): number {
    return this.analyzers.size;
  }
}

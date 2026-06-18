/**
 * Analyzer Pipeline Type Definitions
 *
 * Defines interfaces for the multi-pass analyzer pipeline architecture
 * supporting multiple SQL parameter placeholder styles.
 */

/**
 * Supported parameter style types
 */
export type ParamStyleType =
  | 'jinja2'
  | 'named'
  | 'numeric'
  | 'pyformat'
  | 'asyncpg'
  | 'qmark'
  | 'format';

/**
 * Extracted parameter information
 */
export interface ExtractedParameter {
  /** Parameter name or identifier */
  name: string;
  /** Position in the extracted parameters list (0-based) */
  position: number;
  /** Source parameter style type */
  type: ParamStyleType;
  /** Start index in the SQL string */
  startIndex: number;
  /** End index in the SQL string */
  endIndex: number;
  /** Original matched text (including delimiters) */
  originalText: string;
}

/**
 * Result from a single analyzer execution
 */
export interface AnalyzerResult {
  /** Parameters extracted by this analyzer */
  parameters: ExtractedParameter[];
  /** Analyzer-specific metadata */
  metadata: Record<string, unknown>;
  /** Whether this analyzer found any parameters */
  hasResults: boolean;
}

/**
 * Context passed to analyzers during execution
 */
export interface AnalyzerContext {
  /** Original SQL template string */
  template: string;
  /** Previously extracted parameters (for deduplication) */
  existingParameters: ExtractedParameter[];
}

/**
 * Analyzer interface - each parameter style implements this
 */
export interface Analyzer {
  /** Unique analyzer name */
  readonly name: string;
  /** Execution priority (lower = higher priority, executed first) */
  readonly priority: number;
  /** Human-readable display name */
  readonly displayName: string;
  /** Parameter style this analyzer handles */
  readonly paramStyle: ParamStyleType;

  /**
   * Analyze SQL string and extract parameters
   * @param sql - SQL string to analyze
   * @param context - Analysis context with existing parameters
   * @returns Analysis result with extracted parameters
   */
  analyze(sql: string, context: AnalyzerContext): AnalyzerResult;
}

/**
 * Pipeline execution options
 */
export interface PipelineOptions {
  /** Enable short-circuit mode (stop after first analyzer finds results) */
  shortCircuit?: boolean;
  /** Specific analyzer names to execute (if empty, execute all registered) */
  enabledAnalyzers?: string[];
  /** Whether to deduplicate parameters across analyzers */
  deduplicate?: boolean;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  /** Combined parameters from all analyzers */
  parameters: ExtractedParameter[];
  /** Results per analyzer (keyed by analyzer name) */
  analyzerResults: Map<string, AnalyzerResult>;
  /** Execution metadata */
  metadata: {
    /** Analyzers that were executed */
    executedAnalyzers: string[];
    /** Total execution time in milliseconds */
    executionTime: number;
    /** Whether short-circuit was triggered */
    shortCircuited: boolean;
  };
}

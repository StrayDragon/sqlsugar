/**
 * Logging infrastructure for memory and inference operations
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { OutputChannel } from 'vscode';

/**
 * Log levels for memory and inference operations
 */
export enum MemoryLogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

/**
 * Memory operation context for logging
 */
export interface MemoryLogContext {
  operation: string;
  templateFingerprint?: string;
  variableName?: string;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Type inference context for logging
 */
export interface InferenceLogContext {
  variableName: string;
  template: string;
  inferredType: string;
  confidence: number;
  reasoning: string[];
  alternatives?: string[];
  duration?: number;
}

/**
 * Specialized logger for memory and inference operations
 */
export class MemoryLogger {
  private static instance: MemoryLogger;
  private outputChannel: OutputChannel;
  private logLevel: MemoryLogLevel;

  private constructor(outputChannel: OutputChannel, logLevel: MemoryLogLevel = MemoryLogLevel.ERROR) {
    this.outputChannel = outputChannel;
    this.logLevel = logLevel;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(outputChannel?: OutputChannel, logLevel?: MemoryLogLevel): MemoryLogger {
    if (!MemoryLogger.instance) {
      if (!outputChannel) {
        throw new Error('OutputChannel required for first initialization');
      }
      MemoryLogger.instance = new MemoryLogger(outputChannel, logLevel);
    }
    return MemoryLogger.instance;
  }

  /**
   * Update log level
   */
  public setLogLevel(level: MemoryLogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log memory operations
   */
  public logMemory(level: MemoryLogLevel, message: string, context?: MemoryLogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [MEMORY] [${level.toUpperCase()}] ${message}`;

    if (context) {
      const contextStr = this.formatMemoryContext(context);
      this.outputChannel.appendLine(`${logMessage}\n  Context: ${contextStr}`);
    } else {
      this.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log type inference operations
   */
  public logInference(level: MemoryLogLevel, message: string, context?: InferenceLogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [INFERENCE] [${level.toUpperCase()}] ${message}`;

    if (context) {
      const contextStr = this.formatInferenceContext(context);
      this.outputChannel.appendLine(`${logMessage}\n  Context: ${contextStr}`);
    } else {
      this.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log template fingerprinting operations
   */
  public logFingerprinting(level: MemoryLogLevel, message: string, fingerprint?: string, duration?: number): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [FINGERPRINT] [${level.toUpperCase()}] ${message}`;

    if (fingerprint || duration !== undefined) {
      const details = [];
      if (fingerprint) details.push(`fingerprint: ${fingerprint.substring(0, 16)}...`);
      if (duration !== undefined) details.push(`duration: ${duration}ms`);
      this.outputChannel.appendLine(`${logMessage}\n  Details: ${details.join(', ')}`);
    } else {
      this.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log storage operations
   */
  public logStorage(level: MemoryLogLevel, message: string, operation: string, dataSize?: number): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [STORAGE] [${level.toUpperCase()}] ${message}`;

    const details = [`operation: ${operation}`];
    if (dataSize !== undefined) details.push(`size: ${dataSize} bytes`);

    this.outputChannel.appendLine(`${logMessage}\n  Details: ${details.join(', ')}`);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [PERF] [INFO] ${operation} completed in ${duration}ms`;

    if (metadata && Object.keys(metadata).length > 0) {
      const metaStr = Object.entries(metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      this.outputChannel.appendLine(`${logMessage}\n  Metadata: ${metaStr}`);
    } else {
      this.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log user interaction events
   */
  public logUserInteraction(action: string, variableName?: string, details?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [USER] [INFO] ${action}`;

    const contextParts = [];
    if (variableName) contextParts.push(`variable: ${variableName}`);
    if (details) {
      const detailsStr = Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      contextParts.push(`details: ${detailsStr}`);
    }

    if (contextParts.length > 0) {
      this.outputChannel.appendLine(`${logMessage}\n  Context: ${contextParts.join(', ')}`);
    } else {
      this.outputChannel.appendLine(logMessage);
    }
  }

  /**
   * Log error with stack trace
   */
  public logError(message: string, error: Error, context?: Partial<MemoryLogContext>): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ERROR] ${message}`;

    this.outputChannel.appendLine(logMessage);
    this.outputChannel.appendLine(`  Error: ${error.message}`);

    if (error.stack) {
      this.outputChannel.appendLine(`  Stack: ${error.stack}`);
    }

    if (context) {
      const contextStr = this.formatMemoryContext(context as MemoryLogContext);
      this.outputChannel.appendLine(`  Context: ${contextStr}`);
    }
  }

  /**
   * Clear output channel
   */
  public clear(): void {
    this.outputChannel.clear();
  }

  /**
   * Check if message should be logged based on current log level
   */
  private shouldLog(level: MemoryLogLevel): boolean {
    const levels = [MemoryLogLevel.ERROR, MemoryLogLevel.WARN, MemoryLogLevel.INFO, MemoryLogLevel.DEBUG, MemoryLogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex <= currentLevelIndex;
  }

  /**
   * Format memory context for logging
   */
  private formatMemoryContext(context: MemoryLogContext): string {
    const parts = [`operation: ${context.operation}`];

    if (context.templateFingerprint) {
      parts.push(`fingerprint: ${context.templateFingerprint.substring(0, 16)}...`);
    }

    if (context.variableName) {
      parts.push(`variable: ${context.variableName}`);
    }

    if (context.duration !== undefined) {
      parts.push(`duration: ${context.duration}ms`);
    }

    if (context.success !== undefined) {
      parts.push(`success: ${context.success}`);
    }

    if (context.error) {
      parts.push(`error: ${context.error}`);
    }

    if (context.metadata) {
      const metadataStr = Object.entries(context.metadata)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      parts.push(`metadata: {${metadataStr}}`);
    }

    return parts.join(', ');
  }

  /**
   * Format inference context for logging
   */
  private formatInferenceContext(context: InferenceLogContext): string {
    const parts = [
      `variable: ${context.variableName}`,
      `inferredType: ${context.inferredType}`,
      `confidence: ${(context.confidence * 100).toFixed(1)}%`
    ];

    if (context.reasoning.length > 0) {
      parts.push(`reasoning: [${context.reasoning.join(', ')}]`);
    }

    if (context.alternatives && context.alternatives.length > 0) {
      parts.push(`alternatives: [${context.alternatives.join(', ')}]`);
    }

    if (context.duration !== undefined) {
      parts.push(`duration: ${context.duration}ms`);
    }

    return parts.join(', ');
  }
}

/**
 * Convenience functions for logging
 */
export const memoryLogger = {
  /**
   * Initialize the memory logger
   */
  initialize: (outputChannel: OutputChannel, logLevel: MemoryLogLevel = MemoryLogLevel.ERROR): MemoryLogger => {
    return MemoryLogger.getInstance(outputChannel, logLevel);
  },

  /**
   * Get the logger instance
   */
  getInstance: (): MemoryLogger => {
    return MemoryLogger.getInstance();
  },

  /**
   * Quick log methods
   */
  error: (message: string, context?: MemoryLogContext) => {
    MemoryLogger.getInstance().logMemory(MemoryLogLevel.ERROR, message, context);
  },

  warn: (message: string, context?: MemoryLogContext) => {
    MemoryLogger.getInstance().logMemory(MemoryLogLevel.WARN, message, context);
  },

  info: (message: string, context?: MemoryLogContext) => {
    MemoryLogger.getInstance().logMemory(MemoryLogLevel.INFO, message, context);
  },

  debug: (message: string, context?: MemoryLogContext) => {
    MemoryLogger.getInstance().logMemory(MemoryLogLevel.DEBUG, message, context);
  },

  inference: (level: MemoryLogLevel, message: string, context?: InferenceLogContext) => {
    MemoryLogger.getInstance().logInference(level, message, context);
  },

  fingerprint: (level: MemoryLogLevel, message: string, fingerprint?: string, duration?: number) => {
    MemoryLogger.getInstance().logFingerprinting(level, message, fingerprint, duration);
  },

  storage: (level: MemoryLogLevel, message: string, operation: string, dataSize?: number) => {
    MemoryLogger.getInstance().logStorage(level, message, operation, dataSize);
  },

  performance: (operation: string, duration: number, metadata?: Record<string, unknown>) => {
    MemoryLogger.getInstance().logPerformance(operation, duration, metadata);
  },

  userInteraction: (action: string, variableName?: string, details?: Record<string, unknown>) => {
    MemoryLogger.getInstance().logUserInteraction(action, variableName, details);
  }
};
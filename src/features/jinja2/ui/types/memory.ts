/**
 * TypeScript interfaces for variable memory persistence
 * SQLSugar Jinja2 V2 Editor UX Optimization
 */

import type { Jinja2VariableType, Jinja2VariableValue } from './types';

/**
 * Template fingerprint for unique template identification
 */
export interface TemplateFingerprint {
  /** Primary identification */
  structureHash: string;        // SHA-256 of template structure
  variableNames: string[];      // Sorted list of variable names
  variableCount: number;        // Number of variables

  /** Secondary identification */
  contentHash?: string;         // Full content hash
  templateLength: number;       // Template character count

  /** Metadata */
  created: number;              // Creation timestamp
  lastSeen: number;             // Last access timestamp
  filePath?: string;            // Optional source file path
}

/**
 * Variable memory entry for storing remembered values
 */
export interface VariableMemory {
  variableName: string;
  value: Jinja2VariableValue;
  type: Jinja2VariableType;
  timestamp: number;            // When value was remembered
  confidence: number;           // 0-1 confidence score
  source: 'user' | 'inferred' | 'default' | 'suggestion';
  templateFingerprint: string;  // Associated template fingerprint
  usageCount: number;           // How many times this value has been used
  lastUsed: number;             // Last usage timestamp
}

/**
 * Storage schema for persistent variable memory
 */
export interface VariableMemoryStorage {
  version: string;
  lastMigrated: number;

  /** Template fingerprints and associated data */
  templates: {
    [fingerprint: string]: {
      fingerprint: TemplateFingerprint;
      variables: {
        [name: string]: VariableMemory[];
      };
      lastAccessed: number;
      accessCount: number;
    };
  };

  /** Global variable memory (cross-template patterns) */
  globalPatterns: {
    [variablePattern: string]: {
      commonValues: Array<{
        value: Jinja2VariableValue;
        type: Jinja2VariableType;
        frequency: number;
        confidence: number;
      }>;
      lastUpdated: number;
    };
  };

  /** Settings and metadata */
  settings: {
    autoSaveEnabled: boolean;
    maxHistoryEntries: number;
    retentionDays: number;
    minConfidenceThreshold: number;
    enableTypeInference: boolean;
    showConfidenceIndicators: boolean;
  };

  /** Usage analytics */
  analytics: {
    totalVariablesRemembered: number;
    totalTemplatesProcessed: number;
    averageConfidenceScore: number;
    lastCleanup: number;
  };
}

/**
 * Memory service configuration
 */
export interface MemoryServiceConfig {
  storageLocation: 'global' | 'workspace' | 'hybrid';
  maxStorageEntries: number;
  retentionDays: number;
  autoCleanup: boolean;
  enableAnalytics: boolean;
}

/**
 * Value suggestion from memory
 */
export interface ValueSuggestion {
  value: Jinja2VariableValue;
  type: Jinja2VariableType;
  confidence: number;
  source: 'history' | 'pattern' | 'inference' | 'default';
  reason: string;
  frequency: number;
}

/**
 * Memory cleanup options
 */
export interface MemoryCleanupOptions {
  retentionDays: number;
  dryRun: boolean;
  includeLowConfidence: boolean;
  minConfidenceThreshold: number;
}
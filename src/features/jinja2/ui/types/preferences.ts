/**
 * User preference types for enhanced Jinja2 editor
 * Manages user settings and configuration persistence
 */

import type { InferenceRule } from './inference';

/**
 * Complete user preferences configuration
 */
export interface UserPreferences {
  // Variable inference settings
  inference: InferencePreferences;

  // Scroll synchronization
  scrollSync: ScrollSyncPreferences;

  // UI behavior
  ui: UIPreferences;

  // Performance settings
  performance: PerformancePreferences;
}

/**
 * Variable inference preferences
 */
export interface InferencePreferences {
  enabled: boolean;
  confidenceThreshold: number; // Minimum confidence to auto-accept
  useContextualDefaults: boolean;
  crossTemplateAnalysis: boolean;
  customRules: InferenceRule[];
  typeMapping: Record<string, string>; // Custom type mappings
}

/**
 * Scroll synchronization preferences
 */
export interface ScrollSyncPreferences {
  enabled: boolean;
  sensitivity: number; // 0.1 - 1.0
  rememberPosition: boolean;
  autoEnable: boolean; // Enable on new sessions
  debounceMs: number; // Scroll debounce timing
}

/**
 * UI preferences for editor behavior
 */
export interface UIPreferences {
  showTypeBadges: boolean;
  showConfidenceIndicators: boolean;
  variableHighlightStyle: 'background' | 'border' | 'underline';
  animateTransitions: boolean;
  keyboardShortcuts: Record<string, string>;
  compactMode: boolean;
  themeIntegration: boolean;
}

/**
 * Performance optimization preferences
 */
export interface PerformancePreferences {
  enableCaching: boolean;
  maxCacheSize: number;
  debounceMs: number; // For inference updates
  maxTemplateSize: number; // Size limit for real-time processing
  progressiveLoading: boolean;
  memoryOptimization: boolean;
}

/**
 * Enhanced editor configuration with new features
 */
export interface CompleteEditorV2Config {
  // Existing configuration (backward compatible)
  popoverPlacement: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  highlightStyle: 'background' | 'border' | 'underline';
  autoPreview: boolean;
  keyboardNavigation: boolean;
  animationsEnabled: boolean;
  showSuggestions: boolean;
  autoFocusFirst: boolean;

  // Enhanced configuration
  inference: {
    enabled: boolean;
    confidenceThreshold: number;
    contextualDefaults: boolean;
    customRules: InferenceRule[];
  };

  scrollSync: {
    enabled: boolean;
    sensitivity: number;
    autoEnable: boolean;
    rememberSettings: boolean;
  };

  ui: {
    showTypeIndicators: boolean;
    showConfidenceLevel: boolean;
    compactMode: boolean;
    themeIntegration: boolean;
  };
}

/**
 * Migration data for configuration updates
 */
export interface MigrationData {
  version: string;
  timestamp: Date;
  oldConfiguration: any; // Previous configuration format
  newConfiguration: CompleteEditorV2Config;

  // Migration results
  success: boolean;
  warnings: string[];
  errors: string[];
  userActionRequired: string[];
}

/**
 * Legacy configuration format for backward compatibility
 */
export interface LegacyConfiguration {
  // Old configuration formats that need to be supported
  tempFileCleanup?: boolean;
  cleanupOnClose?: boolean;
  showSQLPreview?: boolean;
  sqlSyntaxHighlightTheme?: string;
  sqlSyntaxHighlightFontSize?: number;
  v2Editor?: {
    popoverPlacement?: string;
    highlightStyle?: string;
    autoPreview?: boolean;
    [key: string]: any;
  };
}

/**
 * Preference validation result
 */
export interface PreferenceValidation {
  valid: boolean;
  errors: PreferenceError[];
  warnings: PreferenceWarning[];
  suggestions: PreferenceSuggestion[];
}

/**
 * Preference validation error
 */
export interface PreferenceError {
  field: string;
  message: string;
  currentValue: any;
  expectedType: string;
  severity: 'error';
}

/**
 * Preference validation warning
 */
export interface PreferenceWarning {
  field: string;
  message: string;
  currentValue: any;
  recommendation: string;
  severity: 'warning';
}

/**
 * Preference improvement suggestion
 */
export interface PreferenceSuggestion {
  field: string;
  message: string;
  suggestedValue: any;
  reason: string;
  benefit: string;
}

/**
 * User preference change event
 */
export interface PreferenceChangeEvent {
  key: string;
  oldValue: any;
  newValue: any;
  source: 'user' | 'migration' | 'default';
  timestamp: Date;
}

/**
 * Preference persistence state
 */
export interface PreferenceState {
  loaded: boolean;
  lastSaved: Date;
  version: string;
  pendingChanges: boolean;
  syncStatus: 'synced' | 'pending' | 'error';
}
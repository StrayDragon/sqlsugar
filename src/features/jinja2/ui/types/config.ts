/**
 * Templated SQL Editor Configuration Types
 *
 * Extended configuration types for better type safety and validation
 */

import type { TemplatedSqlEditorConfig } from '../types.js';

/**
 * Log level options for WebView debugging
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'none';

/**
 * Popover placement strategies with auto-detection
 */
export type PopoverPlacement = 'auto' | 'top' | 'bottom' | 'left' | 'right';

/**
 * Variable highlighting styles
 */
export type HighlightStyle = 'background' | 'border' | 'underline';

/**
 * Complete Templated SQL Editor configuration with all options
 */
export interface CompleteTemplatedSqlEditorConfig extends TemplatedSqlEditorConfig {
  /** Log level for WebView console output */
  logLevel: LogLevel;
}

/**
 * Default configuration values
 */
export const DEFAULT_EDITOR_CONFIG: CompleteTemplatedSqlEditorConfig = {
  enabled: false,
  popoverPlacement: 'auto',
  highlightStyle: 'background',
  autoPreview: true,
  keyboardNavigation: true,
  animationsEnabled: true,
  showSuggestions: true,
  autoFocusFirst: false,
  logLevel: 'error'
};

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedConfig?: CompleteTemplatedSqlEditorConfig;
}

/**
 * Configuration updater for safe config modifications
 */
export interface ConfigUpdater {
  updateConfig<K extends keyof CompleteTemplatedSqlEditorConfig>(
    key: K,
    value: CompleteTemplatedSqlEditorConfig[K]
  ): void;
  getConfig(): CompleteTemplatedSqlEditorConfig;
  resetToDefaults(): void;
}

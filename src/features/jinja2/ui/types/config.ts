/**
 * V2 Editor Configuration Types
 *
 * Extended configuration types for better type safety and validation
 */

import type { EditorV2Config } from '../types.js';

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
 * Complete V2 Editor configuration with all options
 */
export interface CompleteEditorV2Config extends EditorV2Config {
  /** Log level for WebView console output */
  logLevel: LogLevel;
}

/**
 * Default configuration values
 */
export const DEFAULT_EDITOR_CONFIG: CompleteEditorV2Config = {
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
  normalizedConfig?: CompleteEditorV2Config;
}

/**
 * Configuration updater for safe config modifications
 */
export interface ConfigUpdater {
  updateConfig<K extends keyof CompleteEditorV2Config>(
    key: K,
    value: CompleteEditorV2Config[K]
  ): void;
  getConfig(): CompleteEditorV2Config;
  resetToDefaults(): void;
}

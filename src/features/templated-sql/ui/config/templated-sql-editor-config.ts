/**
 * Templated SQL Editor Configuration - Browser Compatible Version
 *
 * Manages configuration for the Templated SQL Editor in browser environment.
 * Configuration is passed from the extension side via initialization messages.
 */

import type { TemplatedSqlEditorConfig } from '../types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: TemplatedSqlEditorConfig = {
  enabled: false,
  popoverPlacement: 'auto',
  highlightStyle: 'background',
  autoPreview: true,
  keyboardNavigation: true,
  animationsEnabled: true,
  showSuggestions: true,
  autoFocusFirst: false
};

/**
 * Templated SQL Editor Configuration Manager - Browser Compatible
 */
export class TemplatedSqlEditorConfigManager {
  private static instance: TemplatedSqlEditorConfigManager;
  private config: TemplatedSqlEditorConfig;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TemplatedSqlEditorConfigManager {
    if (!TemplatedSqlEditorConfigManager.instance) {
      TemplatedSqlEditorConfigManager.instance = new TemplatedSqlEditorConfigManager();
    }
    return TemplatedSqlEditorConfigManager.instance;
  }

  /**
   * Get the complete Templated SQL editor configuration
   */
  static getConfig(): TemplatedSqlEditorConfig {
    const instance = TemplatedSqlEditorConfigManager.getInstance();
    return { ...instance.config };
  }

  /**
   * Get a specific configuration value
   */
  static get<K extends keyof TemplatedSqlEditorConfig>(key: K): TemplatedSqlEditorConfig[K] {
    const config = this.getConfig();
    return config[key];
  }

  /**
   * Update configuration from extension side
   */
  static updateConfig(newConfig: Partial<TemplatedSqlEditorConfig>): void {
    const instance = TemplatedSqlEditorConfigManager.getInstance();
    instance.config = {
      ...instance.config,
      ...newConfig
    };
    }

  /**
   * Check if Templated SQL editor is enabled
   */
  static isEnabled(): boolean {
    return this.get('enabled');
  }

  /**
   * Check if animations are enabled
   */
  static isAnimationsEnabled(): boolean {
    return this.get('animationsEnabled');
  }

  /**
   * Check if auto preview is enabled
   */
  static isAutoPreviewEnabled(): boolean {
    return this.get('autoPreview');
  }

  /**
   * Check if keyboard navigation is enabled
   */
  static isKeyboardNavigationEnabled(): boolean {
    return this.get('keyboardNavigation');
  }

  /**
   * Check if suggestions are shown
   */
  static areSuggestionsEnabled(): boolean {
    return this.get('showSuggestions');
  }

  /**
   * Get popover placement
   */
  static getPopoverPlacement(): TemplatedSqlEditorConfig['popoverPlacement'] {
    return this.get('popoverPlacement');
  }

  /**
   * Get highlight style
   */
  static getHighlightStyle(): TemplatedSqlEditorConfig['highlightStyle'] {
    return this.get('highlightStyle');
  }

  /**
   * Should auto focus first input
   */
  static shouldAutoFocusFirst(): boolean {
    return this.get('autoFocusFirst');
  }

  /**
   * Reset configuration to defaults
   */
  static resetToDefaults(): void {
    const instance = TemplatedSqlEditorConfigManager.getInstance();
    instance.config = { ...DEFAULT_CONFIG };
      }

  /**
   * Validate configuration values
   */
  static validateConfig(config: Partial<TemplatedSqlEditorConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.popoverPlacement && !['auto', 'top', 'bottom', 'left', 'right'].includes(config.popoverPlacement)) {
      errors.push(`Invalid popover placement: ${config.popoverPlacement}`);
    }

    if (config.highlightStyle && !['background', 'border', 'underline'].includes(config.highlightStyle)) {
      errors.push(`Invalid highlight style: ${config.highlightStyle}`);
    }

    if (config.autoPreview !== undefined && typeof config.autoPreview !== 'boolean') {
      errors.push('autoPreview must be a boolean');
    }

    if (config.keyboardNavigation !== undefined && typeof config.keyboardNavigation !== 'boolean') {
      errors.push('keyboardNavigation must be a boolean');
    }

    if (config.animationsEnabled !== undefined && typeof config.animationsEnabled !== 'boolean') {
      errors.push('animationsEnabled must be a boolean');
    }

    if (config.showSuggestions !== undefined && typeof config.showSuggestions !== 'boolean') {
      errors.push('showSuggestions must be a boolean');
    }

    if (config.autoFocusFirst !== undefined && typeof config.autoFocusFirst !== 'boolean') {
      errors.push('autoFocusFirst must be a boolean');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export current configuration
   */
  static exportConfig(): string {
    const config = this.getConfig();
    return JSON.stringify({
      version: '2.0',
      timestamp: new Date().toISOString(),
      config
    }, null, 2);
  }

  /**
   * Get configuration description for help/documentation
   */
  static getConfigDescriptions(): Record<keyof TemplatedSqlEditorConfig, string> {
    return {
      enabled: 'Enable the new Templated SQL Editor with direct template interaction',
      popoverPlacement: 'Default placement for variable editing popovers in Templated SQL editor',
      highlightStyle: 'Visual style for highlighting variables in the template',
      autoPreview: 'Automatically preview SQL when variables change in Templated SQL editor',
      keyboardNavigation: 'Enable keyboard navigation (Tab, Enter, Escape) in Templated SQL editor',
      animationsEnabled: 'Enable animations and transitions in Templated SQL editor',
      showSuggestions: 'Show intelligent value suggestions based on variable names',
      autoFocusFirst: 'Automatically focus the first variable when opening the Templated SQL editor'
    };
  }
}

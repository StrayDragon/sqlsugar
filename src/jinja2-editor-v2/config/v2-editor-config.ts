/**
 * V2 Editor Configuration - Browser Compatible Version
 *
 * Manages configuration for the V2 Jinja2 Visual Editor in browser environment.
 * Configuration is passed from the extension side via initialization messages.
 */

import type { EditorV2Config } from '../types.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: EditorV2Config = {
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
 * V2 Editor Configuration Manager - Browser Compatible
 */
export class V2EditorConfig {
  private static instance: V2EditorConfig;
  private config: EditorV2Config;

  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): V2EditorConfig {
    if (!V2EditorConfig.instance) {
      V2EditorConfig.instance = new V2EditorConfig();
    }
    return V2EditorConfig.instance;
  }

  /**
   * Get the complete V2 editor configuration
   */
  static getConfig(): EditorV2Config {
    const instance = V2EditorConfig.getInstance();
    return { ...instance.config };
  }

  /**
   * Get a specific configuration value
   */
  static get<K extends keyof EditorV2Config>(key: K): EditorV2Config[K] {
    const config = this.getConfig();
    return config[key];
  }

  /**
   * Update configuration from extension side
   */
  static updateConfig(newConfig: Partial<EditorV2Config>): void {
    const instance = V2EditorConfig.getInstance();
    instance.config = {
      ...instance.config,
      ...newConfig
    };
    }

  /**
   * Check if V2 editor is enabled
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
  static getPopoverPlacement(): EditorV2Config['popoverPlacement'] {
    return this.get('popoverPlacement');
  }

  /**
   * Get highlight style
   */
  static getHighlightStyle(): EditorV2Config['highlightStyle'] {
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
    const instance = V2EditorConfig.getInstance();
    instance.config = { ...DEFAULT_CONFIG };
      }

  /**
   * Validate configuration values
   */
  static validateConfig(config: Partial<EditorV2Config>): { valid: boolean; errors: string[] } {
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
  static getConfigDescriptions(): Record<keyof EditorV2Config, string> {
    return {
      enabled: 'Enable the new V2 Jinja2 Visual Editor with direct template interaction',
      popoverPlacement: 'Default placement for variable editing popovers in V2 editor',
      highlightStyle: 'Visual style for highlighting variables in the template',
      autoPreview: 'Automatically preview SQL when variables change in V2 editor',
      keyboardNavigation: 'Enable keyboard navigation (Tab, Enter, Escape) in V2 editor',
      animationsEnabled: 'Enable animations and transitions in V2 editor',
      showSuggestions: 'Show intelligent value suggestions based on variable names',
      autoFocusFirst: 'Automatically focus the first variable when opening the V2 editor'
    };
  }
}

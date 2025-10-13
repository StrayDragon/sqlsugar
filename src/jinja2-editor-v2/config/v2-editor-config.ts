/**
 * V2 Editor Configuration Manager
 *
 * Manages configuration for the V2 Jinja2 Visual Editor
 */

import * as vscode from 'vscode';
import type { EditorV2Config } from '../types.js';

export class V2EditorConfig {
  private static readonly CONFIG_SECTION = 'sqlsugar.v2Editor';
  private static readonly MAIN_CONFIG_SECTION = 'sqlsugar';

  /**
   * Get the complete V2 editor configuration
   */
  static getConfig(): EditorV2Config {
    const config = vscode.workspace.getConfiguration(this.MAIN_CONFIG_SECTION);
    const v2Config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);

    return {
      enabled: config.get<boolean>('enableV2Editor', false),
      popoverPlacement: v2Config.get<'auto' | 'top' | 'bottom' | 'left' | 'right'>('popoverPlacement', 'auto'),
      highlightStyle: v2Config.get<'background' | 'border' | 'underline'>('highlightStyle', 'background'),
      autoPreview: v2Config.get<boolean>('autoPreview', true),
      keyboardNavigation: v2Config.get<boolean>('keyboardNavigation', true),
      animationsEnabled: v2Config.get<boolean>('animationsEnabled', true),
      showSuggestions: v2Config.get<boolean>('showSuggestions', true),
      autoFocusFirst: v2Config.get<boolean>('autoFocusFirst', false)
    };
  }

  /**
   * Get a specific configuration value
   */
  static get<K extends keyof EditorV2Config>(key: K): EditorV2Config[K] {
    const config = this.getConfig();
    return config[key];
  }

  /**
   * Update a specific configuration value
   */
  static async update<K extends keyof EditorV2Config>(
    key: K,
    value: EditorV2Config[K],
    target?: vscode.ConfigurationTarget
  ): Promise<void> {
    const configSection = key === 'enabled' ? this.MAIN_CONFIG_SECTION : this.CONFIG_SECTION;
    const configKey = key === 'enabled' ? 'enableV2Editor' : key;

    const config = vscode.workspace.getConfiguration(configSection);
    await config.update(configKey, value, target);
  }

  /**
   * Check if V2 editor is enabled
   */
  static isEnabled(): boolean {
    return this.get('enabled');
  }

  /**
   * Enable/disable V2 editor
   */
  static async setEnabled(enabled: boolean, target?: vscode.ConfigurationTarget): Promise<void> {
    await this.update('enabled', enabled, target);
  }

  /**
   * Get configuration for VSCode settings UI
   */
  static getSettingsConfig(): any {
    return {
      'sqlsugar.enableV2Editor': {
        type: 'boolean',
        default: false,
        description: 'Enable the new V2 Jinja2 Visual Editor with direct template interaction',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.popoverPlacement': {
        type: 'string',
        enum: ['auto', 'top', 'bottom', 'left', 'right'],
        default: 'auto',
        description: 'Default placement for variable editing popovers in V2 editor',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.highlightStyle': {
        type: 'string',
        enum: ['background', 'border', 'underline'],
        default: 'background',
        description: 'Visual style for highlighting variables in the template',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.autoPreview': {
        type: 'boolean',
        default: true,
        description: 'Automatically preview SQL when variables change in V2 editor',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.keyboardNavigation': {
        type: 'boolean',
        default: true,
        description: 'Enable keyboard navigation (Tab, Enter, Escape) in V2 editor',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.animationsEnabled': {
        type: 'boolean',
        default: true,
        description: 'Enable animations and transitions in V2 editor',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.showSuggestions': {
        type: 'boolean',
        default: true,
        description: 'Show intelligent value suggestions based on variable names',
        scope: 'resource'
      },
      'sqlsugar.v2Editor.autoFocusFirst': {
        type: 'boolean',
        default: false,
        description: 'Automatically focus the first variable when opening the V2 editor',
        scope: 'resource'
      }
    };
  }

  /**
   * Register configuration change listeners
   */
  static registerChangeListeners(callback: (config: EditorV2Config) => void): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];

    // Listen for main config changes
    const mainConfigWatcher = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(`${this.MAIN_CONFIG_SECTION}.enableV2Editor`)) {
        callback(this.getConfig());
      }
      if (event.affectsConfiguration(this.CONFIG_SECTION)) {
        callback(this.getConfig());
      }
    });

    disposables.push(mainConfigWatcher);

    return vscode.Disposable.from(...disposables);
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
   * Reset configuration to defaults
   */
  static async reset(target?: vscode.ConfigurationTarget): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    const keys = [
      'popoverPlacement',
      'highlightStyle',
      'autoPreview',
      'keyboardNavigation',
      'animationsEnabled',
      'showSuggestions',
      'autoFocusFirst'
    ];

    for (const key of keys) {
      await config.update(key, undefined, target);
    }

    // Reset main config
    const mainConfig = vscode.workspace.getConfiguration(this.MAIN_CONFIG_SECTION);
    await mainConfig.update('enableV2Editor', undefined, target);
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
   * Import configuration from JSON
   */
  static async importConfig(configJson: string, target?: vscode.ConfigurationTarget): Promise<{ success: boolean; errors: string[] }> {
    try {
      const data = JSON.parse(configJson);

      if (!data.config || typeof data.config !== 'object') {
        return {
          success: false,
          errors: ['Invalid configuration format']
        };
      }

      const validation = this.validateConfig(data.config);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Apply configuration
      for (const [key, value] of Object.entries(data.config)) {
        if (key === 'enabled') {
          await this.update('enabled', value as any, target);
        } else if (key in this.getConfig()) {
          await this.update(key as any, value as any, target);
        }
      }

      return {
        success: true,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse configuration: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
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

  /**
   * Create a quick pick menu for changing configuration
   */
  static async createQuickPick(): Promise<void> {
    const config = this.getConfig();
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(toggle) Enable V2 Editor',
        description: config.enabled ? 'Enabled' : 'Disabled',
        picked: config.enabled
      },
      {
        label: '$(layout) Popover Placement',
        description: config.popoverPlacement,
        detail: 'Where variable editing popovers appear'
      },
      {
        label: '$(paintcan) Highlight Style',
        description: config.highlightStyle,
        detail: 'How variables are highlighted in the template'
      },
      {
        label: '$(eye) Auto Preview',
        description: config.autoPreview ? 'Enabled' : 'Disabled',
        detail: 'Automatically preview SQL when variables change'
      },
      {
        label: '$(keyboard) Keyboard Navigation',
        description: config.keyboardNavigation ? 'Enabled' : 'Disabled',
        detail: 'Enable Tab, Enter, Escape navigation'
      },
      {
        label: '$(zap) Animations',
        description: config.animationsEnabled ? 'Enabled' : 'Disabled',
        detail: 'Enable animations and transitions'
      },
      {
        label: '$(light-bulb) Show Suggestions',
        description: config.showSuggestions ? 'Enabled' : 'Disabled',
        detail: 'Show intelligent value suggestions'
      },
      {
        label: '$(target) Auto Focus First',
        description: config.autoFocusFirst ? 'Enabled' : 'Disabled',
        detail: 'Automatically focus first variable'
      }
    ];

    const chosen = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a V2 Editor setting to change',
      title: 'V2 Editor Configuration'
    });

    if (!chosen) return;

    const label = chosen.label.replace(/^.*\s/, ''); // Remove icon
    await this.handleQuickPickChoice(label);
  }

  private static async handleQuickPickChoice(choice: string): Promise<void> {
    switch (choice) {
      case 'Enable V2 Editor':
        await this.toggleEnabled();
        break;

      case 'Popover Placement':
        await this.choosePopoverPlacement();
        break;

      case 'Highlight Style':
        await this.chooseHighlightStyle();
        break;

      case 'Auto Preview':
      case 'Keyboard Navigation':
      case 'Animations':
      case 'Show Suggestions':
      case 'Auto Focus First':
        await this.toggleBooleanSetting(choice);
        break;
    }
  }

  private static async toggleEnabled(): Promise<void> {
    const current = this.isEnabled();
    await this.setEnabled(!current);
    vscode.window.showInformationMessage(
      `V2 Editor ${!current ? 'enabled' : 'disabled'}. Restart VS Code to apply changes.`
    );
  }

  private static async choosePopoverPlacement(): Promise<void> {
    const options: vscode.QuickPickItem[] = [
      { label: 'Auto', description: 'Automatically choose best position' },
      { label: 'Top', description: 'Show popovers above variables' },
      { label: 'Bottom', description: 'Show popovers below variables' },
      { label: 'Left', description: 'Show popovers to the left of variables' },
      { label: 'Right', description: 'Show popovers to the right of variables' }
    ];

    const chosen = await vscode.window.showQuickPick(options, {
      placeHolder: 'Choose popover placement'
    });

    if (chosen) {
      const placement = chosen.label.toLowerCase() as any;
      await this.update('popoverPlacement', placement);
    }
  }

  private static async chooseHighlightStyle(): Promise<void> {
    const options: vscode.QuickPickItem[] = [
      { label: 'Background', description: 'Highlight variables with background color' },
      { label: 'Border', description: 'Highlight variables with border' },
      { label: 'Underline', description: 'Highlight variables with underline' }
    ];

    const chosen = await vscode.window.showQuickPick(options, {
      placeHolder: 'Choose highlight style'
    });

    if (chosen) {
      const style = chosen.label.toLowerCase() as any;
      await this.update('highlightStyle', style);
    }
  }

  private static async toggleBooleanSetting(setting: string): Promise<void> {
    const configKey = setting.replace(/\s+/g, '');
    const key = configKey.charAt(0).toLowerCase() + configKey.slice(1) as keyof EditorV2Config;
    const current = this.get(key);
    await this.update(key, !current);
  }
}

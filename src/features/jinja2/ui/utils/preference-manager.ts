/**
 * User preference manager for enhanced Jinja2 editor
 * Handles configuration persistence and migration
 */

import * as vscode from 'vscode';
import type { UserPreferences, LegacyConfiguration, MigrationData } from '../types/preferences.js';

export class PreferenceManager {
  private static readonly CONFIG_SECTION = 'sqlsugar';
  private static readonly V2_CONFIG_SECTION = 'sqlsugar.v2Editor';
  private static readonly PREFERENCES_VERSION = '2.0.0';

  private _preferences: UserPreferences | null = null;
  private _loaded = false;

  /**
   * Load user preferences from VSCode configuration
   */
  async loadPreferences(): Promise<UserPreferences> {
    if (this._loaded && this._preferences) {
      return this._preferences;
    }

    const config = vscode.workspace.getConfiguration(PreferenceManager.CONFIG_SECTION);
    const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);

    // Load with migration for backward compatibility
    this._preferences = await this.migrateConfiguration(config, v2Config);
    this._loaded = true;

    return this._preferences;
  }

  /**
   * Save user preferences to VSCode configuration
   */
  async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const currentPrefs = await this.loadPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };

    // Save inference preferences
    if (preferences.inference) {
      const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);
      await v2Config.update('inference', preferences.inference, vscode.ConfigurationTarget.Global);
    }

    // Save scroll sync preferences
    if (preferences.scrollSync) {
      const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);
      await v2Config.update('scrollSync', preferences.scrollSync, vscode.ConfigurationTarget.Global);
    }

    // Save UI preferences
    if (preferences.ui) {
      const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);
      await v2Config.update('ui', preferences.ui, vscode.ConfigurationTarget.Global);
    }

    // Save performance preferences
    if (preferences.performance) {
      const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);
      await v2Config.update('performance', preferences.performance, vscode.ConfigurationTarget.Global);
    }

    this._preferences = updatedPrefs;
  }

  /**
   * Get a specific preference value
   */
  async getPreference<K extends keyof UserPreferences>(
    key: K
  ): Promise<UserPreferences[K]> {
    const preferences = await this.loadPreferences();
    return preferences[key];
  }

  /**
   * Set a specific preference value
   */
  async setPreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    await this.savePreferences({ [key]: value } as Partial<UserPreferences>);
  }

  /**
   * Reset all preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    const config = vscode.workspace.getConfiguration(PreferenceManager.CONFIG_SECTION);
    const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);

    // Reset basic settings
    await Promise.all([
      config.update('tempFileCleanup', undefined, vscode.ConfigurationTarget.Global),
      config.update('cleanupOnClose', undefined, vscode.ConfigurationTarget.Global),
      config.update('showSQLPreview', undefined, vscode.ConfigurationTarget.Global),
      config.update('sqlSyntaxHighlightTheme', undefined, vscode.ConfigurationTarget.Global),
      config.update('sqlSyntaxHighlightFontSize', undefined, vscode.ConfigurationTarget.Global),
    ]);

    // Reset V2 settings
    await Promise.all([
      v2Config.update('popoverPlacement', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('highlightStyle', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('autoPreview', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('keyboardNavigation', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('animationsEnabled', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('showSuggestions', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('autoFocusFirst', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('inference', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('scrollSync', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('ui', undefined, vscode.ConfigurationTarget.Global),
      v2Config.update('performance', undefined, vscode.ConfigurationTarget.Global),
    ]);

    this._preferences = null;
    this._loaded = false;
  }

  /**
   * Migrate legacy configuration to new format
   */
  private async migrateConfiguration(
    config: vscode.WorkspaceConfiguration,
    v2Config: vscode.WorkspaceConfiguration
  ): Promise<UserPreferences> {
    const legacy = this.extractLegacyConfiguration(config, v2Config);
    await this.performMigration(legacy);

    // Load actual configuration from VSCode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v2ConfigData: any = v2Config.get('inference') || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrollSyncData: any = v2Config.get('scrollSync') || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uiData: any = v2Config.get('ui') || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const performanceData: any = v2Config.get('performance') || {};

    return {
      inference: {
        enabled: v2ConfigData.enabled ?? true,
        confidenceThreshold: v2ConfigData.confidenceThreshold ?? 0.7,
        useContextualDefaults: v2ConfigData.contextualDefaults ?? true,
        crossTemplateAnalysis: v2ConfigData.crossTemplateAnalysis ?? false,
        customRules: v2ConfigData.customRules || [],
        typeMapping: {}
      },
      scrollSync: {
        enabled: scrollSyncData.enabled ?? true,
        sensitivity: scrollSyncData.sensitivity ?? 0.8,
        rememberPosition: scrollSyncData.rememberPosition ?? true,
        autoEnable: scrollSyncData.autoEnable ?? true,
        debounceMs: scrollSyncData.debounceMs ?? 50
      },
      ui: {
        showTypeBadges: uiData.showTypeIndicators ?? true,
        showConfidenceIndicators: uiData.showConfidenceLevel ?? true,
        variableHighlightStyle: uiData.highlightStyle || 'background',
        animateTransitions: uiData.animateTransitions ?? true,
        keyboardShortcuts: {
          'toggleScrollSync': 'ctrl+alt+s',
          'nextVariable': 'tab',
          'previousVariable': 'shift+tab',
          'editVariable': 'enter'
        },
        compactMode: uiData.compactMode ?? false,
        themeIntegration: uiData.themeIntegration ?? true
      },
      performance: {
        enableCaching: performanceData.enableCaching ?? true,
        maxCacheSize: performanceData.maxCacheSize ?? 100,
        debounceMs: performanceData.debounceMs ?? 300,
        maxTemplateSize: performanceData.maxTemplateSize ?? 50000,
        progressiveLoading: performanceData.progressiveLoading ?? true,
        memoryOptimization: performanceData.memoryOptimization ?? true
      }
    };
  }

  /**
   * Extract legacy configuration from current settings
   */
  private extractLegacyConfiguration(
    config: vscode.WorkspaceConfiguration,
    v2Config: vscode.WorkspaceConfiguration
  ): LegacyConfiguration {
    return {
      tempFileCleanup: config.get('tempFileCleanup', true),
      cleanupOnClose: config.get('cleanupOnClose', true),
      showSQLPreview: config.get('showSQLPreview', false),
      sqlSyntaxHighlightTheme: config.get('sqlSyntaxHighlightTheme', 'vscode-dark'),
      sqlSyntaxHighlightFontSize: config.get('sqlSyntaxHighlightFontSize', 14),
      v2Editor: {
        popoverPlacement: v2Config.get('popoverPlacement', 'auto'),
        highlightStyle: v2Config.get('highlightStyle', 'background'),
        autoPreview: v2Config.get('autoPreview', true),
      }
    };
  }

  /**
   * Perform configuration migration
   */
  private async performMigration(legacy: LegacyConfiguration): Promise<MigrationData> {
    const migrationData: MigrationData = {
      version: PreferenceManager.PREFERENCES_VERSION,
      timestamp: new Date(),
      oldConfiguration: legacy,
      newConfiguration: this.createDefaultConfiguration(),
      success: true,
      warnings: [],
      errors: [],
      userActionRequired: []
    };

    try {
      // Migrate basic V2 settings
      if (legacy.v2Editor) {
        const v2Config = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);

        if (!v2Config.get('popoverPlacement')) {
          await v2Config.update('popoverPlacement', legacy.v2Editor.popoverPlacement, vscode.ConfigurationTarget.Global);
        }
        if (!v2Config.get('highlightStyle')) {
          await v2Config.update('highlightStyle', legacy.v2Editor.highlightStyle, vscode.ConfigurationTarget.Global);
        }
        if (!v2Config.get('autoPreview')) {
          await v2Config.update('autoPreview', legacy.v2Editor.autoPreview, vscode.ConfigurationTarget.Global);
        }
      }

      // Set new defaults for enhanced features
      const enhancedConfig = vscode.workspace.getConfiguration(PreferenceManager.V2_CONFIG_SECTION);

      // Enable advanced inference by default
      if (!enhancedConfig.get('inference')) {
        await enhancedConfig.update('inference', {
          enabled: true,
          confidenceThreshold: 0.7,
          contextualDefaults: true,
          crossTemplateAnalysis: false,
          customRules: []
        }, vscode.ConfigurationTarget.Global);
      }

      // Enable scroll sync by default (key user requirement)
      if (!enhancedConfig.get('scrollSync')) {
        await enhancedConfig.update('scrollSync', {
          enabled: true,
          sensitivity: 0.8,
          rememberPosition: true,
          autoEnable: true,
          debounceMs: 50
        }, vscode.ConfigurationTarget.Global);
      }

      // Enable enhanced UI features
      if (!enhancedConfig.get('ui')) {
        await enhancedConfig.update('ui', {
          showTypeIndicators: true,
          showConfidenceLevel: true,
          compactMode: false,
          themeIntegration: true
        }, vscode.ConfigurationTarget.Global);
      }

      // Set performance defaults
      if (!enhancedConfig.get('performance')) {
        await enhancedConfig.update('performance', {
          enableCaching: true,
          maxCacheSize: 100,
          debounceMs: 300,
          maxTemplateSize: 50000,
          progressiveLoading: true,
          memoryOptimization: true
        }, vscode.ConfigurationTarget.Global);
      }

    } catch (error) {
      migrationData.success = false;
      migrationData.errors.push(`Migration failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return migrationData;
  }

  /**
   * Create default user preferences
   */
  private createDefaultConfiguration(): UserPreferences {
    return {
      inference: {
        enabled: true,
        confidenceThreshold: 0.7,
        useContextualDefaults: true,
        crossTemplateAnalysis: false,
        customRules: [],
        typeMapping: {}
      },
      scrollSync: {
        enabled: true,
        sensitivity: 0.8,
        rememberPosition: true,
        autoEnable: true,
        debounceMs: 50
      },
      ui: {
        showTypeBadges: true,
        showConfidenceIndicators: true,
        variableHighlightStyle: 'background',
        animateTransitions: true,
        keyboardShortcuts: {
          'toggleScrollSync': 'ctrl+alt+s',
          'nextVariable': 'tab',
          'previousVariable': 'shift+tab',
          'editVariable': 'enter'
        },
        compactMode: false,
        themeIntegration: true
      },
      performance: {
        enableCaching: true,
        maxCacheSize: 100,
        debounceMs: 300,
        maxTemplateSize: 50000,
        progressiveLoading: true,
        memoryOptimization: true
      }
    };
  }

  /**
   * Listen for configuration changes
   */
  onConfigurationChanged(callback: (event: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(PreferenceManager.CONFIG_SECTION) ||
          event.affectsConfiguration(PreferenceManager.V2_CONFIG_SECTION)) {
        callback(event);
      }
    });
  }
}

// Singleton instance
export const preferenceManager = new PreferenceManager();

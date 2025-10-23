/**
 * Keyboard Navigation Manager for V2 Editor
 *
 * Handles all keyboard navigation and shortcuts
 */

import type {
  EnhancedVariable,
  KeyboardNavigationEvent,
  EditorV2Config
} from '../types.js';

// Type aliases for VSCode types (to avoid direct dependency)
type QuickPickItem = {
  label: string;
  description?: string;
  kind?: 'separator' | 'item';
};

type QuickPickItemKind = 'separator' | 'item';

export interface KeyboardNavigationState {
  focusedVariable: string | null;
  navigationHistory: string[];
  currentIndex: number;
  isActive: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
  category: 'navigation' | 'editing' | 'view' | 'file';
}

export class KeyboardNavigationManager {
  private state: KeyboardNavigationState = {
    focusedVariable: null,
    navigationHistory: [],
    currentIndex: -1,
    isActive: false
  };

  private variables: EnhancedVariable[] = [];
  private config: EditorV2Config;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private listeners: Set<(event: KeyboardNavigationEvent) => void> = new Set();

  constructor(config: EditorV2Config) {
    this.config = config;
    this.setupDefaultShortcuts();
  }

  /**
   * Initialize with variables
   */
  initialize(variables: EnhancedVariable[]) {
    this.variables = variables;
    this.resetNavigation();
  }

  /**
   * Setup default keyboard shortcuts
   */
  private setupDefaultShortcuts() {
    const shortcuts: KeyboardShortcut[] = [
      // Navigation
      {
        key: 'Tab',
        description: 'Navigate to next variable',
        action: () => this.navigateNext(),
        category: 'navigation'
      },
      {
        key: 'Tab',
        shiftKey: true,
        description: 'Navigate to previous variable',
        action: () => this.navigatePrevious(),
        category: 'navigation'
      },
      {
        key: 'Home',
        ctrlKey: true,
        description: 'Go to first variable',
        action: () => this.navigateFirst(),
        category: 'navigation'
      },
      {
        key: 'End',
        ctrlKey: true,
        description: 'Go to last variable',
        action: () => this.navigateLast(),
        category: 'navigation'
      },
      {
        key: 'ArrowRight',
        description: 'Navigate to next variable',
        action: () => this.navigateNext(),
        category: 'navigation'
      },
      {
        key: 'ArrowLeft',
        description: 'Navigate to previous variable',
        action: () => this.navigatePrevious(),
        category: 'navigation'
      },
      {
        key: 'ArrowDown',
        description: 'Navigate to next variable (line aware)',
        action: () => this.navigateNext(true),
        category: 'navigation'
      },
      {
        key: 'ArrowUp',
        description: 'Navigate to previous variable (line aware)',
        action: () => this.navigatePrevious(true),
        category: 'navigation'
      },

      // Editing
      {
        key: 'Enter',
        description: 'Edit focused variable',
        action: () => this.editFocusedVariable(),
        category: 'editing'
      },
      {
        key: ' ',
        description: 'Edit focused variable',
        action: () => this.editFocusedVariable(),
        category: 'editing'
      },
      {
        key: 'F2',
        description: 'Edit focused variable',
        action: () => this.editFocusedVariable(),
        category: 'editing'
      },
      {
        key: 'Escape',
        description: 'Exit edit mode / Clear focus',
        action: () => this.clearFocus(),
        category: 'editing'
      },

      // View
      {
        key: 'f',
        ctrlKey: true,
        description: 'Focus search box',
        action: () => this.focusSearch(),
        category: 'view'
      },
      {
        key: '/',
        description: 'Focus search box',
        action: () => this.focusSearch(),
        category: 'view'
      },
      {
        key: 'l',
        ctrlKey: true,
        description: 'Toggle line numbers',
        action: () => this.toggleLineNumbers(),
        category: 'view'
      },
      {
        key: 'w',
        ctrlKey: true,
        description: 'Toggle word wrap',
        action: () => this.toggleWordWrap(),
        category: 'view'
      },
      {
        key: '1',
        ctrlKey: true,
        description: 'Switch to split view',
        action: () => this.switchViewMode('split'),
        category: 'view'
      },
      {
        key: '2',
        ctrlKey: true,
        description: 'Switch to rendered view',
        action: () => this.switchViewMode('rendered'),
        category: 'view'
      },
      {
        key: '3',
        ctrlKey: true,
        description: 'Switch to diff view',
        action: () => this.switchViewMode('diff'),
        category: 'view'
      },

      // File operations
      {
        key: 's',
        ctrlKey: true,
        description: 'Save/Submit',
        action: () => this.saveOrSubmit(),
        category: 'file'
      },
      {
        key: 'c',
        ctrlKey: true,
        description: 'Copy result',
        action: () => this.copyResult(),
        category: 'file'
      },
      {
        key: 'r',
        ctrlKey: true,
        description: 'Refresh preview',
        action: () => this.refreshPreview(),
        category: 'file'
      },

      // Help
      {
        key: '?',
        ctrlKey: true,
        description: 'Show keyboard shortcuts',
        action: () => this.showHelp(),
        category: 'view'
      },
      {
        key: 'F1',
        description: 'Show keyboard shortcuts',
        action: () => this.showHelp(),
        category: 'view'
      }
    ];

    shortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
  }

  /**
   * Get unique key for shortcut
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('ctrl');
    if (shortcut.altKey) parts.push('alt');
    if (shortcut.shiftKey) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Handle keyboard event
   */
  handleKeyEvent(event: KeyboardEvent, context?: 'editor' | 'popover' | 'search'): boolean {
    if (!this.config.keyboardNavigation && !this.isHelpShortcut(event)) {
      return false;
    }

    const key = this.getEventKey(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      // Check if the shortcut is allowed in current context
      if (this.isShortcutAllowed(shortcut, context)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return true;
      }
    }

    return false;
  }

  /**
   * Check if this is the help shortcut (always allowed)
   */
  private isHelpShortcut(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && event.key === '?';
  }

  /**
   * Get key string from event
   */
  private getEventKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Check if shortcut is allowed in current context
   */
  private isShortcutAllowed(shortcut: KeyboardShortcut, context?: string): boolean {
    // Some shortcuts should only work in specific contexts
    switch (context) {
      case 'popover':
        // In popover, only allow editing-related shortcuts
        return ['editing', 'navigation'].includes(shortcut.category);
      case 'search':
        // In search, allow all shortcuts except file operations
        return shortcut.category !== 'file';
      case 'editor':
      default:
        return true;
    }
  }

  /**
   * Navigate to next variable
   */
  private navigateNext(lineAware: boolean = false) {
    if (this.variables.length === 0) return;

    const currentIndex = this.getCurrentIndex();
    let nextIndex = currentIndex + 1;

    if (lineAware) {
      nextIndex = this.findNextVariableOnDifferentLine(currentIndex);
    }

    if (nextIndex >= this.variables.length) {
      nextIndex = 0; // Wrap around
    }

    this.focusVariable(this.variables[nextIndex]);
  }

  /**
   * Navigate to previous variable
   */
  private navigatePrevious(lineAware: boolean = false) {
    if (this.variables.length === 0) return;

    const currentIndex = this.getCurrentIndex();
    let prevIndex = currentIndex - 1;

    if (lineAware) {
      prevIndex = this.findPreviousVariableOnDifferentLine(currentIndex);
    }

    if (prevIndex < 0) {
      prevIndex = this.variables.length - 1; // Wrap around
    }

    this.focusVariable(this.variables[prevIndex]);
  }

  /**
   * Navigate to first variable
   */
  private navigateFirst() {
    if (this.variables.length === 0) return;
    this.focusVariable(this.variables[0]);
  }

  /**
   * Navigate to last variable
   */
  private navigateLast() {
    if (this.variables.length === 0) return;
    this.focusVariable(this.variables[this.variables.length - 1]);
  }

  /**
   * Find next variable on different line
   */
  private findNextVariableOnDifferentLine(currentIndex: number): number {
    const currentLine = this.variables[currentIndex]?.position.line;

    for (let i = currentIndex + 1; i < this.variables.length; i++) {
      if (this.variables[i].position.line !== currentLine) {
        return i;
      }
    }

    return 0; // Wrap to first if no different line found
  }

  /**
   * Find previous variable on different line
   */
  private findPreviousVariableOnDifferentLine(currentIndex: number): number {
    const currentLine = this.variables[currentIndex]?.position.line;

    for (let i = currentIndex - 1; i >= 0; i--) {
      if (this.variables[i].position.line !== currentLine) {
        return i;
      }
    }

    return this.variables.length - 1; // Wrap to last if no different line found
  }

  /**
   * Focus on a specific variable
   */
  focusVariable(variable: EnhancedVariable) {
    this.state.focusedVariable = variable.name;
    this.state.currentIndex = this.variables.findIndex(v => v.name === variable.name);
    this.state.isActive = true;

    // Update navigation history
    if (this.state.navigationHistory[this.state.navigationHistory.length - 1] !== variable.name) {
      this.state.navigationHistory.push(variable.name);
      // Keep history size manageable
      if (this.state.navigationHistory.length > 100) {
        this.state.navigationHistory.shift();
      }
    }

    this.notifyListeners({
      action: 'edit',
      variableName: variable.name,
      fromKeyboard: true
    });
  }

  /**
   * Edit focused variable
   */
  private editFocusedVariable() {
    if (this.state.focusedVariable) {
      this.notifyListeners({
        action: 'edit',
        variableName: this.state.focusedVariable,
        fromKeyboard: true
      });
    }
  }

  /**
   * Clear focus
   */
  private clearFocus() {
    this.state.focusedVariable = null;
    this.state.isActive = false;
    this.state.currentIndex = -1;

    this.notifyListeners({
      action: 'close',
      fromKeyboard: true
    });
  }

  /**
   * Focus search box
   */
  private focusSearch() {
    this.notifyListeners({
      action: 'next', // Reuse as a generic action
      fromKeyboard: true
    });
  }

  /**
   * Toggle line numbers
   */
  private toggleLineNumbers() {
    // This would be handled by the parent component
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Toggle word wrap
   */
  private toggleWordWrap() {
    // This would be handled by the parent component
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Switch view mode
   */
  private switchViewMode(_mode: 'split' | 'rendered' | 'diff') {
    // This would be handled by the parent component
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Save or submit
   */
  private saveOrSubmit() {
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Copy result
   */
  private copyResult() {
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Refresh preview
   */
  private refreshPreview() {
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Show help
   */
  private showHelp() {
    this.notifyListeners({
      action: 'next', // Generic action
      fromKeyboard: true
    });
  }

  /**
   * Get current index in variables array
   */
  private getCurrentIndex(): number {
    if (this.state.focusedVariable) {
      const index = this.variables.findIndex(v => v.name === this.state.focusedVariable);
      return index >= 0 ? index : 0;
    }
    return 0;
  }

  /**
   * Reset navigation state
   */
  resetNavigation() {
    this.state = {
      focusedVariable: null,
      navigationHistory: [],
      currentIndex: -1,
      isActive: false
    };
  }

  /**
   * Add navigation event listener
   */
  addListener(listener: (event: KeyboardNavigationEvent) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove navigation event listener
   */
  removeListener(listener: (event: KeyboardNavigationEvent) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(event: KeyboardNavigationEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in keyboard navigation listener:', error);
      }
    });
  }

  /**
   * Get current navigation state
   */
  getState(): KeyboardNavigationState {
    return { ...this.state };
  }

  /**
   * Get all keyboard shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  /**
   * Update configuration
   */
  updateConfig(config: EditorV2Config): void {
    this.config = config;
    if (!config.keyboardNavigation) {
      this.resetNavigation();
    }
  }

  /**
   * Check if keyboard navigation is active
   */
  isActive(): boolean {
    return this.config.keyboardNavigation && this.state.isActive;
  }

  /**
   * Get shortcut display text
   */
  getShortcutDisplayText(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key);
    return parts.join(' + ');
  }

  /**
   * Generate help text
   */
  generateHelpText(): string {
    const categories: Record<KeyboardShortcut['category'], string> = {
      navigation: 'Navigation',
      editing: 'Editing',
      view: 'View Controls',
      file: 'File Operations'
    };

    let helpText = 'Keyboard Shortcuts:\n\n';

    Object.entries(categories).forEach(([category, title]) => {
      const shortcuts = this.getShortcutsByCategory(category as KeyboardShortcut['category']);
      if (shortcuts.length > 0) {
        helpText += `${title}:\n`;
        shortcuts.forEach(shortcut => {
          const key = this.getShortcutDisplayText(shortcut);
          helpText += `  ${key.padEnd(15)} - ${shortcut.description}\n`;
        });
        helpText += '\n';
      }
    });

    return helpText;
  }

  /**
   * Create quick pick items for shortcuts
   */
  createQuickPickItems(): QuickPickItem[] {
    const categories: Record<KeyboardShortcut['category'], string> = {
      navigation: '🧭 Navigation',
      editing: '✏️ Editing',
      view: '👁️ View Controls',
      file: '💾 File Operations'
    };

    const items: QuickPickItem[] = [];

    Object.entries(categories).forEach(([category, title]) => {
      const shortcuts = this.getShortcutsByCategory(category as KeyboardShortcut['category']);
      if (shortcuts.length > 0) {
        items.push({
          label: title,
          kind: 'separator' as QuickPickItemKind
        });
        shortcuts.forEach(shortcut => {
          items.push({
            label: this.getShortcutDisplayText(shortcut),
            description: shortcut.description
          });
        });
      }
    });

    return items;
  }
}

/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { testUtils } from './test-setup';

// Create a simplified test class that only contains the validation functions
class TestCommandManager {
  private context: any;

  constructor(context: any) {
    this.context = context;
  }

  /**
   * 验证基本的前置条件
   */
  validateCommandPrerequisites(): { valid: boolean; editor?: any; error?: string } {
    const vscode = (global as any).vscode;
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { valid: false, error: 'No active editor found' };
    }

    if (editor.document.isClosed) {
      return { valid: false, error: 'Active editor document is closed' };
    }

    return { valid: true, editor };
  }

  /**
   * 验证选中的文本
   */
  validateSelection(editor: any): { valid: boolean; selection?: any; selectedText?: string; error?: string } {
    const selection = editor.selection;
    if (!selection) {
      return { valid: false, error: 'No selection found' };
    }

    if (selection.isEmpty) {
      return { valid: false, error: 'No text selected' };
    }

    const selectedText = editor.document.getText(selection);
    if (!selectedText || selectedText.trim().length === 0) {
      return { valid: false, error: 'Selected text is empty' };
    }

    return { valid: true, selection, selectedText };
  }

  /**
   * 验证命令配置
   */
  validateCommandConfiguration(commands: any): { valid: boolean; error?: string } {
    if (!Array.isArray(commands)) {
      return { valid: false, error: 'Commands must be an array' };
    }

    if (commands.length === 0) {
      return { valid: false, error: 'No commands to register' };
    }

    const commandNames = new Set<string>();
    for (const command of commands) {
      if (!command.name || typeof command.name !== 'string') {
        return { valid: false, error: 'Command name must be a non-empty string' };
      }

      if (commandNames.has(command.name)) {
        return { valid: false, error: `Duplicate command name: ${command.name}` };
      }

      if (!command.callback || typeof command.callback !== 'function') {
        return { valid: false, error: `Command callback must be a function for: ${command.name}` };
      }

      commandNames.add(command.name);
    }

    return { valid: true };
  }

  /**
   * 注册单个命令
   */
  registerSingleCommand(name: string, callback: () => void): void {
    const vscode = (global as any).vscode;
    try {
      this.context.subscriptions.push(
        vscode.commands.registerCommand(`sqlsugar.${name}`, callback)
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        // Silently handle duplicate commands
      } else {
        throw error;
      }
    }
  }
}

describe('CommandManager Validation Utils', () => {
  let vscode: any;
  let mockContext: any;
  let commandManager: TestCommandManager;

  beforeEach(() => {
    // Get vscode mock from global
    vscode = (global as any).vscode;

    // Clear all mocks
    vi.clearAllMocks();

    // Create mock context
    mockContext = {
      subscriptions: [],
    };

    // Create test instance
    commandManager = new TestCommandManager(mockContext);
  });

  describe('validateCommandPrerequisites', () => {
    it('should return error when no active editor', () => {
      vscode.window.activeTextEditor = null;

      const result = commandManager.validateCommandPrerequisites();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No active editor found');
      expect(result.editor).toBeUndefined();
    });

    it('should return error when editor document is closed', () => {
      const mockEditor = {
        document: {
          isClosed: true,
        },
      };
      vscode.window.activeTextEditor = mockEditor;

      const result = commandManager.validateCommandPrerequisites();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Active editor document is closed');
    });

    it('should return valid when editor exists and is open', () => {
      const mockEditor = {
        document: {
          isClosed: false,
        },
      };
      vscode.window.activeTextEditor = mockEditor;

      const result = commandManager.validateCommandPrerequisites();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.editor).toBe(mockEditor);
    });
  });

  describe('validateSelection', () => {
    let mockEditor: any;

    beforeEach(() => {
      mockEditor = {
        document: {
          isClosed: false,
          getText: vi.fn(),
        },
        selection: null,
      };
      vscode.window.activeTextEditor = mockEditor;
    });

    it('should return error when no selection exists', () => {
      mockEditor.selection = null;

      const result = commandManager.validateSelection(mockEditor);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No selection found');
    });

    it('should return error when selection is empty', () => {
      const mockSelection = {
        isEmpty: true,
      };
      mockEditor.selection = mockSelection;

      const result = commandManager.validateSelection(mockEditor);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No text selected');
    });

    it('should return error when selected text is empty', () => {
      const mockSelection = {
        isEmpty: false,
      };
      mockEditor.selection = mockSelection;
      mockEditor.document.getText.mockReturnValue('');

      const result = commandManager.validateSelection(mockEditor);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Selected text is empty');
    });

    it('should return error when selected text is only whitespace', () => {
      const mockSelection = {
        isEmpty: false,
      };
      mockEditor.selection = mockSelection;
      mockEditor.document.getText.mockReturnValue('   ');

      const result = commandManager.validateSelection(mockEditor);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Selected text is empty');
    });

    it('should return valid when text is selected', () => {
      const mockSelection = {
        isEmpty: false,
      };
      mockEditor.selection = mockSelection;
      mockEditor.document.getText.mockReturnValue('SELECT * FROM users');

      const result = commandManager.validateSelection(mockEditor);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.selection).toBe(mockSelection);
      expect(result.selectedText).toBe('SELECT * FROM users');
    });
  });

  describe('validateCommandConfiguration', () => {
    it('should return error when commands is not an array', () => {
      const result = commandManager.validateCommandConfiguration(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Commands must be an array');
    });

    it('should return error when commands array is empty', () => {
      const result = commandManager.validateCommandConfiguration([]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No commands to register');
    });

    it('should return error when command name is missing', () => {
      const commands = [{ name: '', callback: vi.fn() }];
      const result = commandManager.validateCommandConfiguration(commands);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Command name must be a non-empty string');
    });

    it('should return error when command name is not a string', () => {
      const commands = [{ name: 123, callback: vi.fn() }];
      const result = commandManager.validateCommandConfiguration(commands);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Command name must be a non-empty string');
    });

    it('should return error when callback is missing', () => {
      const commands = [{ name: 'testCommand', callback: null }];
      const result = commandManager.validateCommandConfiguration(commands);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Command callback must be a function for: testCommand');
    });

    it('should return error when callback is not a function', () => {
      const commands = [{ name: 'testCommand', callback: 'not-a-function' }];
      const result = commandManager.validateCommandConfiguration(commands);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Command callback must be a function for: testCommand');
    });

    it('should return error when command names are duplicated', () => {
      const commands = [
        { name: 'testCommand', callback: vi.fn() },
        { name: 'testCommand', callback: vi.fn() },
      ];
      const result = commandManager.validateCommandConfiguration(commands);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Duplicate command name: testCommand');
    });

    it('should return valid for proper command configuration', () => {
      const commands = [
        { name: 'command1', callback: vi.fn() },
        { name: 'command2', callback: vi.fn() },
      ];
      const result = commandManager.validateCommandConfiguration(commands);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('registerSingleCommand', () => {
    it('should register command successfully', () => {
      const callback = vi.fn();
      vscode.commands.registerCommand.mockReturnValue({ dispose: vi.fn() });

      commandManager.registerSingleCommand('testCommand', callback);

      expect(vscode.commands.registerCommand).toHaveBeenCalledWith('sqlsugar.testCommand', callback);
      expect(mockContext.subscriptions.length).toBe(1);
    });

    it('should handle command registration error for duplicate commands', () => {
      const callback = vi.fn();
      const error = new Error('command sqlsugar.testCommand already exists');
      vscode.commands.registerCommand.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        commandManager.registerSingleCommand('testCommand', callback);
      }).not.toThrow();

      expect(mockContext.subscriptions.length).toBe(0);
    });

    it('should rethrow non-duplicate command registration errors', () => {
      const callback = vi.fn();
      const error = new Error('Some other error');
      vscode.commands.registerCommand.mockImplementation(() => {
        throw error;
      });

      expect(() => {
        commandManager.registerSingleCommand('testCommand', callback);
      }).toThrow('Some other error');
    });
  });
});

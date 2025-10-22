/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../core/logger';
import { testUtils } from './test-setup';

// Mock console interface
interface MockConsole {
  log: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
}

// VSCode mock interface for testing
interface MockVSCodeForLogger {
  workspace: {
    getConfiguration: ReturnType<typeof vi.fn>;
  };
  env: {
    appName: string;
  };
}

// Extend global interface for proper typing
declare global {
  var vscode: any;
}

describe('Logger', () => {
  let originalVscode: MockVSCodeForLogger;
  let originalConsole: typeof console;
  let mockConsole: MockConsole;

  beforeEach(() => {
    // Store original modules
    originalVscode = global.vscode as MockVSCodeForLogger;
    originalConsole = global.console;

    // Mock console
    mockConsole = testUtils.mockConsole();
  });

  afterEach(() => {
    // Restore original modules
    global.vscode = originalVscode;
    testUtils.resetConsole();
  });

  describe('log level configuration', () => {
    it('should use default log level when configuration fails', () => {
      const vscode = global.vscode as MockVSCodeForLogger;
      vscode.workspace.getConfiguration.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      Logger.refreshLevel();

      // Should default to 'error' level
      Logger.debug('Debug message');
      Logger.info('Info message');
      Logger.warn('Warning message');
      Logger.error('Error message');

      expect(mockConsole.error).toHaveBeenCalledWith('[SQLSugar]', 'Error message');
      // Warning is called for configuration error
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should use configured log level', () => {
      const vscode = global.vscode as MockVSCodeForLogger;
      const mockConfig = {
        get: vi.fn().mockReturnValue('debug'),
      };
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      Logger.refreshLevel();

      Logger.debug('Debug message');
      Logger.info('Info message');
      Logger.warn('Warning message');
      Logger.error('Error message');

      expect(mockConsole.debug).toHaveBeenCalledWith('[SQLSugar]', 'Debug message');
      expect(mockConsole.info).toHaveBeenCalledWith('[SQLSugar]', 'Info message');
      expect(mockConsole.warn).toHaveBeenCalledWith('[SQLSugar]', 'Warning message');
      expect(mockConsole.error).toHaveBeenCalledWith('[SQLSugar]', 'Error message');
    });

    it('should handle invalid log level gracefully', () => {
      const vscode = global.vscode as MockVSCodeForLogger;
      const mockConfig = {
        get: vi.fn().mockReturnValue('invalid-level'),
      };
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig);

      Logger.refreshLevel();

      Logger.debug('Debug message');
      Logger.info('Info message');
      Logger.warn('Warning message');
      Logger.error('Error message');

      expect(mockConsole.error).toHaveBeenCalledWith('[SQLSugar]', 'Error message');
      // Warning is called for invalid configuration
      expect(mockConsole.warn).toHaveBeenCalledTimes(1);
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('log filtering', () => {
    beforeEach(() => {
      const vscode = global.vscode as MockVSCodeForLogger;
      const mockConfig = {
        get: vi.fn().mockReturnValue('warn'),
      };
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
      Logger.refreshLevel();
    });

    it('should log error messages at warn level', () => {
      Logger.error('Error message');
      expect(mockConsole.error).toHaveBeenCalledWith('[SQLSugar]', 'Error message');
    });

    it('should log warning messages at warn level', () => {
      Logger.warn('Warning message');
      expect(mockConsole.warn).toHaveBeenCalledWith('[SQLSugar]', 'Warning message');
    });

    it('should not log info messages at warn level', () => {
      Logger.info('Info message');
      expect(mockConsole.info).not.toHaveBeenCalled();
    });

    it('should not log debug messages at warn level', () => {
      Logger.debug('Debug message');
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments', () => {
      Logger.error('Error:', new Error('Test error'), { context: 'test' });
      expect(mockConsole.error).toHaveBeenCalledWith('[SQLSugar]', 'Error:', new Error('Test error'), { context: 'test' });
    });
  });

  describe('none log level', () => {
    beforeEach(() => {
      const vscode = global.vscode as MockVSCodeForLogger;
      const mockConfig = {
        get: vi.fn().mockReturnValue('none'),
      };
      vscode.workspace.getConfiguration.mockReturnValue(mockConfig);
      Logger.refreshLevel();
    });

    it('should not log any messages at none level', () => {
      Logger.error('Error message');
      Logger.warn('Warning message');
      Logger.info('Info message');
      Logger.debug('Debug message');

      expect(mockConsole.error).not.toHaveBeenCalled();
      expect(mockConsole.warn).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });
});

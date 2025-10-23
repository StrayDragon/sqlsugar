import { vi, beforeEach, afterEach } from 'vitest';
import type { GlobalVSCode } from './types/vscode-test-types';

// Mock types for test setup
interface MockPosition {
  line: number;
  character: number;
}

interface _MockRange {
  start: MockPosition;
  end: MockPosition;
}

interface MockSelection {
  anchor: MockPosition;
  active: MockPosition;
}

type ConfigValue = string | number | boolean | object | null;

// Mock console interface with all required methods
interface MockConsole extends Partial<Console> {
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  log: ReturnType<typeof vi.fn>;
}

// Extend global interface for proper typing
declare global {
  var vscode: GlobalVSCode;
  var console: Console;
}

interface MockTextRange {
  start: number;
  end: number;
}

interface MockEditor {
  document: {
    getText: ReturnType<typeof vi.fn>;
    getTextAt: ReturnType<typeof vi.fn>;
    positionAt: ReturnType<typeof vi.fn>;
    offsetAt: ReturnType<typeof vi.fn>;
    uri: { fsPath: string };
    isClosed: boolean;
    fileName: string;
    languageId: string;
    lineCount: number;
  };
  selection: MockSelection;
  edit: ReturnType<typeof vi.fn>;
  selections: MockSelection[];
  revealRange: ReturnType<typeof vi.fn>;
}

interface MockTextDocument {
  getText: ReturnType<typeof vi.fn>;
  getTextAt: ReturnType<typeof vi.fn>;
  positionAt: ReturnType<typeof vi.fn>;
  offsetAt: ReturnType<typeof vi.fn>;
  uri: { fsPath: string };
  isClosed: boolean;
  fileName: string;
  languageId: string;
  lineCount: number;
}

// Mock vscode module
const mockVscode = {
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((section: string, defaultValue: ConfigValue) => defaultValue),
      update: vi.fn(),
    })),
    onDidChangeConfiguration: vi.fn(),
    openTextDocument: vi.fn(),
    fs: {
      writeFile: vi.fn(),
      delete: vi.fn(),
    },
  },
  window: {
    activeTextEditor: null,
    showErrorMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showTextDocument: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
    executeCommand: vi.fn(),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path })),
    parse: vi.fn(),
  },
  Position: vi.fn((line: number, character: number) => ({ line, character })),
  Range: vi.fn((start: MockPosition, end: MockPosition) => ({ start, end })),
  Selection: vi.fn((anchor: MockPosition, active: MockPosition) => ({ anchor, active })),
  ViewColumn: {
    Active: 1,
    Beside: 2,
  },
  TextDocument: vi.fn(),
  TextEditor: vi.fn(),
  TextEditorSelectionChangeEvent: vi.fn(),
  TextDocumentChangeEvent: vi.fn(),
  ConfigurationChangeEvent: vi.fn(),
  Disposable: vi.fn(),
  EventEmitter: vi.fn(() => ({
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  })),
  Event: {
    None: vi.fn(),
  },
  ExtensionContext: vi.fn(),
  workspaceFolders: [
    {
      uri: { fsPath: '/test/workspace' },
      name: 'test-workspace',
      index: 0,
    },
  ],
};

// Set up globals before test modules are loaded
global.vscode = mockVscode;

// Mock vscode module for import resolution
vi.mock('vscode', () => mockVscode);

// Mock console methods for testing
const originalConsole = { ...console };

// Setup test utilities
export const testUtils = {
  resetConsole: () => {
    global.console = originalConsole;
  },

  mockConsole: () => {
    const mockConsole: MockConsole = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    };
    global.console = mockConsole as Console;
    return mockConsole;
  },

  createMockEditor: (text: string, selection?: MockSelection): MockEditor => ({
    document: {
      getText: vi.fn((range?: MockTextRange) => range ? text.substring(range.start, range.end) : text),
      getTextAt: vi.fn((range: MockTextRange) => text.substring(range.start, range.end)),
      positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
      offsetAt: vi.fn((position: MockPosition) => position.character),
      uri: { fsPath: '/test/file.ts' },
      isClosed: false,
      fileName: '/test/file.ts',
      languageId: 'typescript',
      lineCount: text.split('\n').length,
    },
    selection: selection || new mockVscode.Selection(
      new mockVscode.Position(0, 0),
      new mockVscode.Position(0, text.length)
    ),
    edit: vi.fn(),
    selections: [],
    revealRange: vi.fn(),
  }),

  createMockTextDocument: (text: string): MockTextDocument => ({
    getText: vi.fn(() => text),
    getTextAt: vi.fn((range: MockTextRange) => text.substring(range.start, range.end)),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    offsetAt: vi.fn((position: MockPosition) => position.character),
    uri: { fsPath: '/test/file.ts' },
    isClosed: false,
    fileName: '/test/file.ts',
    languageId: 'typescript',
    lineCount: text.split('\n').length,
  }),
};

// Global setup for all tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.resetAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

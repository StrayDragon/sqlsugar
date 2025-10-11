import { vi } from 'vitest';

// Mock vscode module
const mockVscode = {
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((section: string, defaultValue: any) => defaultValue),
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
  Range: vi.fn((start: any, end: any) => ({ start, end })),
  Selection: vi.fn((anchor: any, active: any) => ({ anchor, active })),
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
(global as any).vscode = mockVscode;

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
    const mockConsole = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    };
    global.console = mockConsole as any;
    return mockConsole;
  },

  createMockEditor: (text: string, selection?: any) => ({
    document: {
      getText: vi.fn((range?: any) => range ? text.substring(range.start, range.end) : text),
      getTextAt: vi.fn((range: any) => text.substring(range.start, range.end)),
      positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
      offsetAt: vi.fn((position: any) => position.character),
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

  createMockTextDocument: (text: string) => ({
    getText: vi.fn(() => text),
    getTextAt: vi.fn((range: any) => text.substring(range.start, range.end)),
    positionAt: vi.fn((offset: number) => ({ line: 0, character: offset })),
    offsetAt: vi.fn((position: any) => position.character),
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
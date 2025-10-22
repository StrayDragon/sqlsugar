import { vi } from 'vitest';

// VS Code mock types
interface MockPosition {
  line: number;
  character: number;
}

interface MockRange {
  start: MockPosition;
  end: MockPosition;
}

interface MockSelection {
  anchor: MockPosition;
  active: MockPosition;
}

// Configuration value types
type ConfigValue = string | number | boolean | object | null;

// Mock vscode module
export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn((section: string, defaultValue: ConfigValue) => defaultValue),
    update: vi.fn(),
  })),
  onDidChangeConfiguration: vi.fn(),
  onDidCloseTextDocument: vi.fn(),
  onDidSaveTextDocument: vi.fn(),
  openTextDocument: vi.fn(),
  fs: {
    writeFile: vi.fn(),
    delete: vi.fn(),
  },
};

export const window = {
  activeTextEditor: null,
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showTextDocument: vi.fn(),
};

export const commands = {
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(),
};

export const Uri = {
  file: vi.fn((path: string) => ({ fsPath: path })),
  parse: vi.fn(),
};

export const Position = vi.fn((line: number, character: number) => ({ line, character }));

export const Range = vi.fn((start: MockPosition, end: MockPosition) => ({ start, end }));

export const Selection = vi.fn((anchor: MockPosition, active: MockPosition) => ({ anchor, active }));

export const ViewColumn = {
  Active: 1,
  Beside: 2,
};

export const TextDocument = vi.fn();

export const TextEditor = vi.fn();

export const TextEditorSelectionChangeEvent = vi.fn();

export const TextDocumentChangeEvent = vi.fn();

export const ConfigurationChangeEvent = vi.fn();

export const Disposable = vi.fn();

export const EventEmitter = vi.fn(() => ({
  event: vi.fn(),
  fire: vi.fn(),
  dispose: vi.fn(),
}));

export const Event = {
  None: vi.fn(),
};

export const ExtensionContext = vi.fn();

export const workspaceFolders = [
  {
    uri: { fsPath: '/test/workspace' },
    name: 'test-workspace',
    index: 0,
  },
];

// Default export for ES modules
export default {
  workspace,
  window,
  commands,
  Uri,
  Position,
  Range,
  Selection,
  ViewColumn,
  TextDocument,
  TextEditor,
  TextEditorSelectionChangeEvent,
  TextDocumentChangeEvent,
  ConfigurationChangeEvent,
  Disposable,
  EventEmitter,
  Event,
  ExtensionContext,
  workspaceFolders,
};

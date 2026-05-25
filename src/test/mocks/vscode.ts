import { vi } from 'vitest';

type Listener = (...args: unknown[]) => unknown;

class MockEventEmitter {
  private listeners: Listener[] = [];
  event = (listener: Listener) => {
    this.listeners.push(listener);
    return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
  };
  fire(...args: unknown[]) {
    this.listeners.forEach(l => l(...args));
  }
}

class MockDisposable {
  dispose = vi.fn();
}

class MockUri {
  constructor(
    public readonly scheme: string,
    public readonly fsPath: string,
    public readonly path: string = fsPath,
  ) {}

  static file(path: string) { return new MockUri('file', path, path); }
  static parse(uri: string) { return new MockUri('file', uri, uri); }
  static joinPath(base: MockUri, ...segments: string[]) {
    return MockUri.file([base.fsPath, ...segments].join('/'));
  }
  toString() { return `${this.scheme}://${this.path}`; }
  with(change: { scheme?: string; path?: string }) {
    return new MockUri(change.scheme ?? this.scheme, change.path ?? this.fsPath);
  }
}

class MockPosition {
  constructor(public readonly line: number, public readonly character: number) {}
  translate(lineDelta = 0, charDelta = 0) {
    return new MockPosition(this.line + lineDelta, this.character + charDelta);
  }
  isEqual(other: MockPosition) { return this.line === other.line && this.character === other.character; }
  isBefore(other: MockPosition) { return this.line < other.line || (this.line === other.line && this.character < other.character); }
}

class MockRange {
  constructor(
    public readonly start: MockPosition,
    public readonly end: MockPosition,
  ) {}
  get isEmpty() { return this.start.isEqual(this.end); }
  contains(pos: MockPosition) { return !pos.isBefore(this.start) && pos.isBefore(this.end); }
}

class MockSelection extends MockRange {
  constructor(
    public readonly anchor: MockPosition,
    public readonly active: MockPosition,
  ) {
    super(anchor, active);
  }
}

class MockTextDocument {
  constructor(
    public uri: MockUri,
    public languageId: string = 'plaintext',
    private content: string = '',
    public fileName: string = uri.fsPath,
  ) {}
  getText(range?: MockRange) {
    if (!range) return this.content;
    const lines = this.content.split('\n');
    const startLine = Math.min(range.start.line, lines.length - 1);
    const endLine = Math.min(range.end.line, lines.length - 1);
    if (startLine === endLine) {
      return lines[startLine].substring(range.start.character, range.end.character);
    }
    const result = [lines[startLine].substring(range.start.character)];
    for (let i = startLine + 1; i < endLine; i++) result.push(lines[i]);
    result.push(lines[endLine].substring(0, range.end.character));
    return result.join('\n');
  }
  get lineCount() { return this.content.split('\n').length; }
  lineAt(line: number) {
    const text = this.content.split('\n')[line] || '';
    return { text, range: new MockRange(new MockPosition(line, 0), new MockPosition(line, text.length)) };
  }
  positionAt(offset: number) {
    const lines = this.content.substring(0, offset).split('\n');
    return new MockPosition(lines.length - 1, lines[lines.length - 1].length);
  }
}

const onDidSaveEmitter = new MockEventEmitter();
const onDidCloseEmitter = new MockEventEmitter();
const onDidChangeEmitter = new MockEventEmitter();
const onDidChangeVisibleEmitter = new MockEventEmitter();

export const mockVSCode = {
  Uri: MockUri,
  Position: MockPosition,
  Range: MockRange,
  Selection: MockSelection,
  Disposable: MockDisposable,

  workspace: {
    getConfiguration: vi.fn((section?: string) => ({
      get: vi.fn((key: string, defaultValue?: unknown) => defaultValue),
      update: vi.fn(() => Promise.resolve()),
      has: vi.fn(() => false),
      inspect: vi.fn(() => undefined),
      section,
    })),
    onDidSaveTextDocument: onDidSaveEmitter.event,
    onDidCloseTextDocument: onDidCloseEmitter.event,
    onDidChangeTextDocument: onDidChangeEmitter.event,
    openTextDocument: vi.fn((uriOrOptions: unknown) => {
      if (typeof uriOrOptions === 'string' || uriOrOptions instanceof MockUri) {
        return Promise.resolve(new MockTextDocument(
          typeof uriOrOptions === 'string' ? MockUri.file(uriOrOptions) : uriOrOptions as unknown as MockUri
        ));
      }
      const opts = uriOrOptions as { content?: string; language?: string };
      return Promise.resolve(new MockTextDocument(
        MockUri.file('/tmp/test.txt'),
        opts?.language || 'plaintext',
        opts?.content || '',
      ));
    }),
    fs: {
      writeFile: vi.fn(() => Promise.resolve()),
      readFile: vi.fn(() => Promise.resolve(new Uint8Array())),
      delete: vi.fn(() => Promise.resolve()),
      stat: vi.fn(() => Promise.resolve({ type: 1, size: 0, ctime: 0, mtime: 0 })),
      createDirectory: vi.fn(() => Promise.resolve()),
    },
    asRelativePath: vi.fn((path: string) => path),
    workspaceFolders: [{ uri: MockUri.file('/workspace'), name: 'workspace', index: 0 }],
  },

  window: {
    createWebviewPanel: vi.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: vi.fn(() => new MockDisposable()),
        postMessage: vi.fn(() => Promise.resolve(true)),
        asWebviewUri: vi.fn((uri: MockUri) => uri),
        cspSource: 'test-csp',
      },
      onDidChangeViewState: vi.fn(() => new MockDisposable()),
      onDidDispose: vi.fn(() => new MockDisposable()),
      reveal: vi.fn(),
      dispose: vi.fn(),
      visible: true,
      active: true,
    })),
    showTextDocument: vi.fn((doc: unknown) => Promise.resolve({
      document: doc,
      selection: new MockSelection(new MockPosition(0, 0), new MockPosition(0, 0)),
      edit: vi.fn(() => Promise.resolve(true)),
    })),
    showInformationMessage: vi.fn(() => Promise.resolve(undefined)),
    showErrorMessage: vi.fn(() => Promise.resolve(undefined)),
    showWarningMessage: vi.fn(() => Promise.resolve(undefined)),
    activeTextEditor: undefined,
    onDidChangeVisibleTextEditors: onDidChangeVisibleEmitter.event,
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
  },

  commands: {
    executeCommand: vi.fn(() => Promise.resolve(undefined)),
    registerCommand: vi.fn((_id: string, _handler: Listener) => new MockDisposable()),
  },

  env: {
    machineId: 'test-machine-id',
    clipboard: {
      readText: vi.fn(() => Promise.resolve('')),
      writeText: vi.fn(() => Promise.resolve()),
    },
  },

  ExtensionMode: { Production: 1, Development: 2, Test: 3 },
  ViewColumn: { One: 1, Two: 2, Beside: -2, Active: -1 },
  StatusBarAlignment: { Left: 1, Right: 2 },
  DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },

  // Helpers for tests to fire events
  __test__: {
    fireDidSave: (doc: MockTextDocument) => onDidSaveEmitter.fire(doc),
    fireDidClose: (doc: MockTextDocument) => onDidCloseEmitter.fire(doc),
    fireDidChange: (event: unknown) => onDidChangeEmitter.fire(event),
    createDocument: (content: string, lang = 'plaintext', path = '/tmp/test.txt') =>
      new MockTextDocument(MockUri.file(path), lang, content, path),
  },
};

// Re-export properties as named exports so `import * as vscode from 'vscode'` works
export const Uri = MockUri;
export const Position = MockPosition;
export const Range = MockRange;
export const Selection = MockSelection;
export const Disposable = MockDisposable;
export const workspace = mockVSCode.workspace;
export const window = mockVSCode.window;
export const commands = mockVSCode.commands;
export const env = mockVSCode.env;
export const ExtensionMode = mockVSCode.ExtensionMode;
export const ViewColumn = mockVSCode.ViewColumn;
export const StatusBarAlignment = mockVSCode.StatusBarAlignment;
export const DiagnosticSeverity = mockVSCode.DiagnosticSeverity;

export default mockVSCode;
export { MockUri, MockPosition, MockRange, MockSelection, MockTextDocument, MockEventEmitter, MockDisposable };

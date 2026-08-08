/**
 * Minimal vscode stub for harness prepare bundle (no vitest).
 */
export class Uri {
  constructor(fsPath) {
    this.fsPath = fsPath;
    this.scheme = 'file';
    this.path = fsPath;
  }
  static file(fsPath) {
    return new Uri(fsPath);
  }
  static joinPath(base, ...parts) {
    const path = [base.fsPath || base.path, ...parts].join('/').replace(/\/+/g, '/');
    return Uri.file(path);
  }
  toString() {
    return `file://${this.fsPath}`;
  }
}

export const workspace = {
  workspaceFolders: [{ uri: Uri.file('/workspace'), name: 'workspace', index: 0 }],
  getConfiguration() {
    return {
      get: (_key, defaultValue) => defaultValue,
      update: async () => undefined,
      has: () => false,
      inspect: () => undefined,
    };
  },
  onDidSaveTextDocument: () => ({ dispose() {} }),
  onDidCloseTextDocument: () => ({ dispose() {} }),
  fs: {
    writeFile: async () => undefined,
    readFile: async () => new Uint8Array(),
  },
};

export const window = {
  showInformationMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  createOutputChannel: () => ({
    appendLine() {},
    show() {},
    dispose() {},
  }),
};

export const env = {
  clipboard: {
    writeText: async () => undefined,
  },
};

export default {
  Uri,
  workspace,
  window,
  env,
};

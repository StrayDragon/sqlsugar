/**
 * Mock VSCode API for testing
 */

export const mockVSCode = {
  workspace: {
    getConfiguration: () => ({
      get: () => undefined,
      update: () => Promise.resolve(),
    }),
    asRelativePath: (path: string) => path,
  },
  window: {
    createWebviewPanel: () => ({
      webview: {
        html: '',
        onDidReceiveMessage: () => ({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          dispose: () => {},
        }),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        postMessage: () => {},
      },
      onDidChangeViewState: () => ({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        dispose: () => {},
      }),
      onDidDispose: () => ({
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        dispose: () => {},
      }),
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      reveal: () => {},
    }),
    showInformationMessage: () => Promise.resolve(undefined),
    showErrorMessage: () => Promise.resolve(undefined),
  },
  commands: {
    executeCommand: () => Promise.resolve(undefined),
    registerCommand: () => ({
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      dispose: () => {},
    }),
  },
  env: {
    machineId: 'test-machine-id',
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    parse: (uri: string) => ({ fsPath: uri }),
  },
  ExtensionMode: {
    Production: 1,
    Development: 2,
    Test: 3,
  },
};

// Default export for require()
export default mockVSCode;

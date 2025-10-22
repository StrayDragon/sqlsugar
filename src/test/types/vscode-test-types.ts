/**
 * VS Code Test Types
 *
 * Common type definitions for VS Code API testing
 * to avoid using 'any' in global declarations
 */

// Base VS Code API interfaces for testing
export interface TestVSCodeCore {
  workspace: {
    getConfiguration: (...args: unknown[]) => unknown;
  };
  window: {
    activeTextEditor: unknown;
  };
}

export interface TestVSCodeCommands {
  commands: {
    registerCommand: (...args: unknown[]) => unknown;
    executeCommand: (...args: unknown[]) => unknown;
  };
}

export interface TestVSCodeExtended extends TestVSCodeCore, TestVSCodeCommands {
  env: {
    appName: string;
  };
}

// Union type for all VS Code test configurations
export type VSCodeTestType = TestVSCodeCore | TestVSCodeCommands | TestVSCodeExtended | Record<string, unknown>;

// Safe global vscode declaration
export type GlobalVSCode = unknown;

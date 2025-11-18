/**
 * Test setup for Vitest testing framework
 * Configures global test environment and mocks
 */

import { vi } from 'vitest';

// Mock VS Code API - use the module import
const mockVSCode = {
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    asRelativePath: vi.fn(),
  },
  window: {
    createWebviewPanel: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  commands: {
    executeCommand: vi.fn(),
    registerCommand: vi.fn(),
  },
  env: {
    machineId: 'test-machine-id',
  },
};

// Global setup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).vscode = mockVSCode;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
};

// Performance monitoring for tests
if (typeof performance === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).performance = {
    now: vi.fn(() => Date.now()),
  };
}

// DOM setup for jsdom environment
if (typeof document === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).document = {
    createElement: vi.fn(),
    getElementById: vi.fn(),
    querySelector: vi.fn(),
    addEventListener: vi.fn(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    requestAnimationFrame: vi.fn(),
  };
}

// Web Components polyfill for testing
if (typeof customElements === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).customElements = {
    define: vi.fn(),
    get: vi.fn(),
    upgrade: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    whenDefined: vi.fn(() => Promise.resolve() as any),
  };
}

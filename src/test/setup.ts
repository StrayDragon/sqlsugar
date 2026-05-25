import { vi } from 'vitest';

if (typeof performance === 'undefined') {
  (global as Record<string, unknown>).performance = {
    now: vi.fn(() => Date.now()),
  };
}

if (typeof customElements === 'undefined') {
  (global as Record<string, unknown>).customElements = {
    define: vi.fn(),
    get: vi.fn(),
    upgrade: vi.fn(),
    whenDefined: vi.fn(() => Promise.resolve()),
  };
}

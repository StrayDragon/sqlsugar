import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'out/',
        'src/features/templated-sql/ui/**',
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50,
        },
        './src/features/templated-sql/processor.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
    include: [
      'src/test/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/',
      'dist/',
      'out/',
      '**/*.config.*',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@test': resolve(__dirname, 'src/test'),
      '@features': resolve(__dirname, 'src/features'),
      '@templated-sql': resolve(__dirname, 'src/features/templated-sql'),
      vscode: resolve(__dirname, 'src/test/mocks/vscode.ts'),
    },
  },
  define: {
    'process.env': '{}',
  },
  esbuild: {
    target: 'ES2022',
  },
});
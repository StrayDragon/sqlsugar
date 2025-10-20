import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/test-setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [
      'node_modules/**/*',
      '.vscode-test/**/*',
      'dist/**/*',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
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
export default {
  coverage: true,
  coverageConfig: {
    exclude: [
      '**/*.test.ts',
      '**/test/**',
      '**/node_modules/**',
      '**/dist/**'
    ],
    reportDir: 'coverage/components',
    threshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  },
  nodeResolve: true,
  preserveSymlinks: true,
  files: [
    'src/jinja2-editor/components/**/*.test.ts',
    'src/jinja2-editor/**/*.test.js'
  ],
  testFramework: {
    config: {
      ui: 'bdd',
      timeout: 10000
    }
  },
  plugins: [
    {
      name: '@es-pack/esbuild-plugin',
      options: {
        target: 'es2020',
        format: 'esm'
      }
    }
  ],
  esbuild: {
    target: 'es2020',
    format: 'esm'
  },
  mocha: {
    ui: 'bdd',
    timeout: 10000
  },
  browsers: [
    'playwright:chromium'
  ],
  browserStartTimeout: 30000,
  concurrency: 2
};
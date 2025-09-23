export default {
  coverage: false,
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
  esbuild: {
    target: 'es2020',
    format: 'esm'
  },
  mocha: {
    ui: 'bdd',
    timeout: 10000
  },
  browsers: [
    'chromium'
  ],
  browserStartTimeout: 30000,
  concurrency: 2,
  reporters: ['dot'],
  reportDir: 'coverage/components'
};
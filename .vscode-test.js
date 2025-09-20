import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'src/test/**/*.test.ts',
    mocha: {
        ui: 'tdd',
        timeout: 600000,
    },
    vscode: {
        version: 'stable',
    },
    extensions: [],
});
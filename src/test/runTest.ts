import { runTests } from '@vscode/test-electron';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log('🚀 Starting VS Code extension tests...');

    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');

    // The path to the extension test runner script
    const extensionTestsPath = path.resolve(__dirname, './suite/index.js');

    console.log(`Extension development path: ${extensionDevelopmentPath}`);
    console.log(`Extension tests path: ${extensionTestsPath}`);

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: ['--disable-extensions'],
      version: 'stable'
    });

    console.log('✅ All tests completed successfully!');
  } catch (err) {
    console.error('❌ Failed to run tests:', err);
    process.exit(1);
  }
}

main();

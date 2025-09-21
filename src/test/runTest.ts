import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
	try {
		console.log('🚀 Starting VS Code extension tests...');

		// The folder containing the Extension Manifest package.json
		const extensionDevelopmentPath = path.resolve(__dirname, '../..');

		// The path to the extension test runner script
		const extensionTestsPath = path.resolve(__dirname, './suite/index');

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
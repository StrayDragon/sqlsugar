import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	launchArgs: [
		'--disable-extensions',
		'--disable-telemetry',
		'--disable-workspace-trust',
		'--disable-updates',
		'--disable-crash-reporter'
	]
});

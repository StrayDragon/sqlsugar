/**
 * @type {import('@vscode/test-electron').Config}
 */
module.exports = {
	// Folder containing the extension package.json
	extensionDevelopmentPath: __dirname,

	// Path to the extension tests - use mocha to run all test files
	extensionTestsPath: './out/test/',

	// Launch configuration
	launchArgs: ['--disable-extensions'],

	// Mocha configuration
	mocha: {
		timeout: 600000,
		ui: 'tdd',
		require: []
	},

	// Environment variables
	env: {
		VSCODE_TEST: 'true',
		NODE_ENV: 'test'
	}
};
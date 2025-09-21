import * as path from 'path';
import * as fs from 'fs';
import Mocha from 'mocha';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 60000 // Increase timeout for extension tests
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		try {
			// Find all test files recursively
			const findTestFiles = (dir: string): string[] => {
				const files: string[] = [];
				const entries = fs.readdirSync(dir, { withFileTypes: true });

				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						files.push(...findTestFiles(fullPath));
					} else if (entry.isFile() && entry.name.endsWith('.test.js')) {
						const relativePath = path.relative(testsRoot, fullPath);
						files.push(relativePath);
					}
				}
				return files;
			};

			// Get all test files
			const files = findTestFiles(testsRoot);

			// Filter out excluded test files (removed functionality)
			const filteredFiles = files.filter((file: string) => {
				return !file.includes('sql-log-parser') &&
				       !file.includes('sqlalchemy-generator-patterns');
			});

			console.log(`Found ${filteredFiles.length} test files to run:`);
			filteredFiles.forEach((file: string) => console.log(`  - ${file}`));

			// Add files to the test suite
			filteredFiles.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

			// Run the mocha test
			mocha.run((failures: number) => {
				if (failures > 0) {
					reject(new Error(`${failures} tests failed.`));
				} else {
					resolve();
				}
			});
		} catch (err) {
			console.error(err);
			reject(err);
		}
	});
}
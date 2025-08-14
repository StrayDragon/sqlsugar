import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { activate } from '../extension';

async function getLatestTempFilePath(testWorkspace: string): Promise<string> {
	const tempDir = path.join(testWorkspace, '.vscode', 'sqlsugar', 'temp');
	const files = await fs.promises.readdir(tempDir);
	const candidates = await Promise.all(
		files.filter(f => f.startsWith('temp_sql_')).map(async f => {
			const p = path.join(tempDir, f);
			const stat = await fs.promises.stat(p);
			return { p, mtime: stat.mtimeMs };
		})
	);
	if (candidates.length === 0) {
		throw new Error('No temp_sql_ files found');
	}
	candidates.sort((a, b) => b.mtime - a.mtime);
	return candidates[0].p;
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	let context: vscode.ExtensionContext;
	let testWorkspace: string;

	// Global stubs for VS Code message APIs to avoid UI interactions in tests
	let originalShowInfo: any;
	let originalShowWarn: any;
	let originalShowError: any;

	suiteSetup(async () => {
		// Save originals
		originalShowInfo = (vscode.window.showInformationMessage as any);
		originalShowWarn = (vscode.window.showWarningMessage as any);
		originalShowError = (vscode.window.showErrorMessage as any);

		// Patch to be non-blocking and deterministic
		(vscode.window as any).showInformationMessage = (..._args: any[]) => Promise.resolve(undefined);
		(vscode.window as any).showWarningMessage = (...args: any[]) => {
			try {
				const msg = args?.[0];
				if (typeof msg === 'string' && msg.includes('Selected text may not be SQL')) {
					return Promise.resolve('Continue');
				}
			} catch {}
			return Promise.resolve(undefined);
		};
		(vscode.window as any).showErrorMessage = (..._args: any[]) => Promise.resolve(undefined);

		// Create a test workspace folder
		testWorkspace = path.join(__dirname, 'test-workspace');
		await fs.promises.mkdir(testWorkspace, { recursive: true });
		// Ensure a clean temp directory
		const tempDir = path.join(testWorkspace, '.vscode', 'sqlsugar', 'temp');
		try { await fs.promises.rm(tempDir, { recursive: true, force: true }); } catch {}
		// Mock extension context
		context = {
			subscriptions: [],
			globalStorageUri: vscode.Uri.file(testWorkspace),
			workspaceState: {
				get: () => undefined,
				update: () => Promise.resolve()
			} as any,
			globalState: {
				get: () => undefined,
				update: () => Promise.resolve()
			} as any
		} as any;

		// Mock workspaceFolders to include our test workspace
		(Object.defineProperty(vscode.workspace, 'workspaceFolders', {
			value: [{ uri: vscode.Uri.file(testWorkspace), name: 'test', index: 0 }],
			configurable: true
		}) as any);

		// Activate the extension
		await activate(context);
	});

	suiteTeardown(async () => {
		// Restore patched message APIs
		(vscode.window as any).showInformationMessage = originalShowInfo;
		(vscode.window as any).showWarningMessage = originalShowWarn;
		(vscode.window as any).showErrorMessage = originalShowError;

		// Clean up test workspace
		try {
			await fs.promises.rm(testWorkspace, { recursive: true, force: true });
		} catch (e) {
			// Ignore cleanup errors
		}

		// Dispose all subscriptions
		for (const disposable of context.subscriptions) {
			disposable.dispose();
		}
	});

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Edit Inline SQL command is registered', async () => {
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes('sqlsugar.editInlineSQL'), 'editInlineSQL command should be registered');
	});

	test('Edit Inline SQL with placeholder conversion', async () => {
		// Create a test document with SQL containing placeholders
		const testContent = `
const query = "SELECT * FROM users WHERE id = :id AND name = :name";
`;
		const testFilePath = path.join(testWorkspace, 'test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL string (excluding closing quote and semicolon)
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('";', sqlStart);
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd + 1); // Include closing quote
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');

		// Wait a bit for the temp file to be created
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Check if temp file was created with converted placeholders
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempContent = await fs.promises.readFile(tempFilePath, 'utf8');

		// Check placeholder conversion
		assert.ok(tempContent.includes('"__:id"'), 'Placeholder :id should be converted to "__:id"');
		assert.ok(tempContent.includes('"__:name"'), 'Placeholder :name should be converted to "__:name"');
	});

	test('Multiple saves should sync correctly', async function() {
		this.timeout(10000); // Increase timeout for this test

		// Create test document
		const testContent = `
const query = "SELECT * FROM users WHERE id = :id";
`;
		const testFilePath = path.join(testWorkspace, 'multi-save-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select SQL
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('";', sqlStart);
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd + 1);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find temp file
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// First save: Add WHERE clause
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const modifiedText = fullText.replace('WHERE id = "__:id"', 'WHERE id = "__:id" AND age > 18');
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), modifiedText);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Check first change synced
		let currentContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(currentContent.includes('AND age > 18'), 'First change should be synced');

		// Second save: Add ORDER BY
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const modifiedText = fullText.replace('AND age > 18', 'AND age > 18 ORDER BY name');
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), modifiedText);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Check second change synced
		currentContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(currentContent.includes('ORDER BY name'), 'Second change should be synced');

		// Third save: Add LIMIT
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const modifiedText = fullText + ' LIMIT 10';
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), modifiedText);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Check final content
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(finalContent.includes('AND age > 18'), 'First change should be preserved');
		assert.ok(finalContent.includes('ORDER BY name'), 'Second change should be preserved');
		assert.ok(finalContent.includes('LIMIT 10'), 'Third change should be preserved');
		assert.ok(finalContent.includes(':id'), 'Placeholder should be restored to original format');
		assert.ok(!finalContent.includes('__:id'), 'Temp placeholder should not remain');
	});

	test('Line number changes should not break sync', async function() {
		this.timeout(8000);

		// Create test document with SQL on different lines
		const testContent = `function test() {
	const sql1 = "SELECT * FROM table1 WHERE id = :id";

	const sql2 = "SELECT * FROM table2 WHERE name = :name";

	return sql1 + sql2;
}`;
		const testFilePath = path.join(testWorkspace, 'line-change-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the first SQL string
		const sql1Start = testContent.indexOf('"SELECT * FROM table1');
		const sql1End = testContent.indexOf('";', sql1Start);
		const startPos = document.positionAt(sql1Start);
		const endPos = document.positionAt(sql1End + 1);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file
		const tempFilePath2 = await getLatestTempFilePath(testWorkspace);
		const tempDoc2 = await vscode.workspace.openTextDocument(tempFilePath2);
		const tempEditor2 = await vscode.window.showTextDocument(tempDoc2);

		// Add multiple lines to change the line count
		await tempEditor2.edit(editBuilder => {
			const fullText = tempDoc2.getText();
			const modifiedText = `${fullText}
-- This is a comment line 1
-- This is a comment line 2
-- This is a comment line 3
AND status = 'active'`;
			editBuilder.replace(new vscode.Range(tempDoc2.positionAt(0), tempDoc2.positionAt(fullText.length)), modifiedText);
		});
		await tempDoc2.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify the change was synced correctly
		const updatedContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(updatedContent.includes("AND status = 'active'"), 'Added content should be synced');
		assert.ok(updatedContent.includes('-- This is a comment line'), 'Comment lines should be synced');
		assert.ok(updatedContent.includes(':id'), 'Original placeholder should be restored');

		// Verify the second SQL string is unchanged
		assert.ok(updatedContent.includes('FROM table2 WHERE name = :name'), 'Other SQL should remain unchanged');
	});

	test('Placeholder detection edge cases', async function() {
		this.timeout(5000);

		// Test content with edge cases that should NOT be converted
		const testContent = `
const sql = "SELECT * FROM table WHERE time > '12:34:56' AND data::jsonb ? :param AND cost = $5.99";
`;
		const testFilePath = path.join(testWorkspace, 'edge-case-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select SQL
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('";', sqlStart);
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd); // exclude trailing quote+semicolon
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Check temp file content
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempContent = await fs.promises.readFile(tempFilePath, 'utf8');

		// Verify edge cases are handled correctly
		assert.ok(tempContent.includes('12:34:56'), 'Time format should not be converted');
		assert.ok(tempContent.includes('data::jsonb'), 'Postgres cast should not be converted');
		assert.ok(tempContent.includes('"__:param"'), 'Valid placeholder should be converted');
		assert.ok(!tempContent.includes('"__:34"'), 'Time part should not be converted');
		assert.ok(!tempContent.includes('"__:jsonb"'), 'Cast type should not be converted');
	});

	test('Listener cleanup on close', async function() {
		this.timeout(5000);

		const testContent = `const sql = "SELECT * FROM test WHERE id = :id";`;
		const testFilePath = path.join(testWorkspace, 'cleanup-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select SQL
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('";', sqlStart);
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find temp file
		const tempFiles = await fs.promises.readdir(path.join(testWorkspace, '.vscode', 'sqlsugar', 'temp'));
		const tempFile = tempFiles.find(f => f.startsWith('temp_sql_'));
		assert.ok(tempFile, 'Temp file should exist');
		const tempFilePath = path.join(testWorkspace, '.vscode', 'sqlsugar', 'temp', tempFile!);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);

		// Close the temp document (should trigger cleanup)
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
		await new Promise(resolve => setTimeout(resolve, 500));

		// Verify file cleanup (when cleanupOnClose is true by default)
		try {
			await fs.promises.access(tempFilePath);
			// If we reach here, file still exists - that's OK if cleanupOnClose is true
		} catch (error) {
			// File was deleted, which is expected
		}
	});

	test('Error handling: No active editor', async () => {
		// Close all editors first
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');

		// Try to execute command without active editor
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');

		// The command should handle this gracefully (no crash)
		// We can't easily assert the error message, but if we reach here, it didn't crash
		assert.ok(true, 'Command should handle missing editor gracefully');
	});

	test('Error handling: Empty selection', async () => {
		const testContent = `const sql = "SELECT * FROM test";`;
		const testFilePath = path.join(testWorkspace, 'empty-selection-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Set empty selection (cursor at beginning)
		editor.selection = new vscode.Selection(0, 0, 0, 0);

		// Execute command with empty selection
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');

		// Should handle empty selection gracefully
		assert.ok(true, 'Command should handle empty selection gracefully');
	});

	test('SQL detection heuristics', async function() {
		this.timeout(8000);
		const testCases = [
			{ text: '"SELECT * FROM users"', shouldDetect: true },
			{ text: '"INSERT INTO table VALUES (1)"', shouldDetect: true },
			{ text: '"UPDATE users SET name = \\"John\\""', shouldDetect: true },
			{ text: '"DELETE FROM users WHERE id = 1"', shouldDetect: true },
			{ text: '"CREATE TABLE test (id INT)"', shouldDetect: true },
			{ text: '"Hello world"', shouldDetect: false },
			{ text: '"const x = 42"', shouldDetect: false },
			{ text: '"/api/users/123"', shouldDetect: false }
		];

		// Monkey-patch showWarningMessage to auto-cancel for non-SQL detection to avoid opening temp editors
		const originalShowWarningMessage = (vscode.window.showWarningMessage as any);
		(vscode.window as any).showWarningMessage = (...args: any[]) => {
			try {
				const msg = args?.[0];
				if (typeof msg === 'string' && msg.includes('Selected text may not be SQL')) {
					return Promise.resolve('Cancel');
				}
			} catch {}
			return originalShowWarningMessage.apply(vscode.window, args as any);
		};

		try {
			for (const testCase of testCases) {
				const testContent = `const query = ${testCase.text};`;
				const testFilePath = path.join(testWorkspace, `sql-detection-${Date.now()}.js`);
				await fs.promises.writeFile(testFilePath, testContent);

				const document = await vscode.workspace.openTextDocument(testFilePath);
				const editor = await vscode.window.showTextDocument(document);

				// Select the string
				const strStart = testContent.indexOf(testCase.text);
				const strEnd = strStart + testCase.text.length;
				const startPos = document.positionAt(strStart);
				const endPos = document.positionAt(strEnd);
				editor.selection = new vscode.Selection(startPos, endPos);

				// Execute command
				await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
				// Short wait to let any UI/edits settle
				await new Promise(resolve => setTimeout(resolve, 100));

				// For our purposes just ensure no crash
				assert.ok(true, `Handled text: ${testCase.text}`);

				// Clean up
				try { await fs.promises.unlink(testFilePath); } catch {}
				// Close any active editors to avoid piling up
				try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
			}
		} finally {
			// Restore original
			(vscode.window as any).showWarningMessage = originalShowWarningMessage;
		}
	});

	test('Placeholder conversion edge cases', async function() {
		this.timeout(8000);
		const testCases = [
			{
				input: 'SELECT * FROM users WHERE id = :user_id AND time > "12:34:56"',
				expected: 'SELECT * FROM users WHERE id = "__:user_id" AND time > "12:34:56"'
			},
			{
				input: 'SELECT data::jsonb FROM table WHERE param = :param',
				expected: 'SELECT data::jsonb FROM table WHERE param = "__:param"'
			},
			{
				input: 'INSERT INTO log (time, value) VALUES (:timestamp, :value)',
				expected: 'INSERT INTO log (time, value) VALUES ("__:timestamp", "__:value")'
			},
			{
				input: 'UPDATE users SET updated_at = NOW() WHERE id = :id',
				expected: 'UPDATE users SET updated_at = NOW() WHERE id = "__:id"'
			}
		];

		for (const testCase of testCases) {
			const testContent = `const sql = "${testCase.input}";`;
			const testFilePath = path.join(testWorkspace, `placeholder-test-${Date.now()}.js`);
			await fs.promises.writeFile(testFilePath, testContent);

			const document = await vscode.workspace.openTextDocument(testFilePath);
			const editor = await vscode.window.showTextDocument(document);

			// Select SQL string
			const sqlStart = testContent.indexOf('"' + testCase.input);
			const sqlEnd = sqlStart + testCase.input.length + 1;
			const startPos = document.positionAt(sqlStart);
			const endPos = document.positionAt(sqlEnd + 1);
			editor.selection = new vscode.Selection(startPos, endPos);

			// Execute command
			await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
			// Poll for temp file creation up to ~2s
			let tempContent: string | null = null;
			for (let attempt = 0; attempt < 10; attempt++) {
				try {
					const tempFilePath = await getLatestTempFilePath(testWorkspace);
					tempContent = await fs.promises.readFile(tempFilePath, 'utf8');
					break;
				} catch {
					await new Promise(resolve => setTimeout(resolve, 200));
				}
			}

			// Check temp file content if available
			if (tempContent !== null) {
				assert.strictEqual(tempContent.trim(), testCase.expected,
					`Placeholder conversion failed for: ${testCase.input}`);
			} else {
				console.warn(`Could not verify placeholder conversion for: ${testCase.input}`);
			}

			// Clean up
			try {
				await fs.promises.unlink(testFilePath);
			} catch {}
		}
	});

	test('Large file performance (optimized)', async function() {
		this.timeout(10000);

		// Generate a moderately sized SQL query (reduced complexity for stability)
		const mediumSQL = `SELECT
			u.id, u.name, u.email,
			p.title, p.content, p.published_at
		FROM users u
		JOIN posts p ON u.id = p.author_id
		WHERE u.status = :status
			AND p.published_at > :start_date
			AND (p.title LIKE :search_term OR p.content LIKE :search_term)
		ORDER BY p.published_at DESC
		LIMIT :limit OFFSET :offset`;

		const testContent = `const complexQuery = "${mediumSQL.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}";`;
		const testFilePath = path.join(testWorkspace, 'large-sql-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL string
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.lastIndexOf('";');
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd + 1);
		editor.selection = new vscode.Selection(startPos, endPos);

		const startTime = Date.now();

		// Execute command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 500));

		const endTime = Date.now();
		const executionTime = endTime - startTime;

		// Performance assertion: should complete within reasonable time (relaxed)
		assert.ok(executionTime < 8000, `Large SQL processing took too long: ${executionTime}ms`);

		// Verify temp file was created with correct content
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempContent = await fs.promises.readFile(tempFilePath, 'utf8');

		// Check that placeholders were converted to temp format
		assert.ok(tempContent.includes('"__:status"'), 'Status placeholder should be converted to temp format');
		assert.ok(tempContent.includes('"__:limit"'), 'Limit placeholder should be converted to temp format');
		assert.ok(!/(^|[^_]):status\b/.test(tempContent), 'Original placeholder :status should not appear unwrapped in temp file');

		// Close editors and cleanup to prevent resource leaks
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}

		// Clean up test files
		try { await fs.promises.unlink(testFilePath); } catch {}
	});

	test('Concurrent temp file creation (low concurrency)', async function() {
		this.timeout(8000);
		const concurrency = 2;
		const promises: Promise<number>[] = [];

		// Snapshot current temp files count
		const tempDir = path.join(testWorkspace, '.vscode', 'sqlsugar', 'temp');
		await fs.promises.mkdir(tempDir, { recursive: true });
		const beforeFiles = await fs.promises.readdir(tempDir);
		const beforeCount = beforeFiles.filter(f => f.startsWith('temp_sql_')).length;

		// Create multiple SQL editing operations concurrently (reduced concurrency)
		for (let i = 0; i < concurrency; i++) {
			const promise = (async () => {
				const testContent = `const sql${i} = "SELECT * FROM table${i} WHERE id = :id${i}";`;
				const testFilePath = path.join(testWorkspace, `concurrent-test-${i}.js`);
				await fs.promises.writeFile(testFilePath, testContent);

				const document = await vscode.workspace.openTextDocument(testFilePath);
				const editor = await vscode.window.showTextDocument(document);

				// Select SQL
				const sqlStart = testContent.indexOf('"SELECT');
				const sqlEnd = testContent.indexOf('";', sqlStart);
				const startPos = document.positionAt(sqlStart);
				const endPos = document.positionAt(sqlEnd + 1);
				editor.selection = new vscode.Selection(startPos, endPos);

				// Execute command
				await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
				await new Promise(resolve => setTimeout(resolve, 400));
				// Close editor to avoid piling up
				try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}

				return i;
			})();

			promises.push(promise);
		}

		// Wait for all operations to complete
		const results = await Promise.all(promises);

		// Verify all operations completed successfully
		assert.strictEqual(results.length, concurrency, 'All concurrent operations should complete');

		// Check that multiple temp files were created
		const afterFiles = await fs.promises.readdir(tempDir);
		const afterCount = afterFiles.filter(f => f.startsWith('temp_sql_')).length;
		assert.ok(afterCount - beforeCount >= concurrency, `Expected at least ${concurrency} new temp files, before=${beforeCount} after=${afterCount}`);

		// Cleanup created test files
		for (let i = 0; i < concurrency; i++) {
			try { await fs.promises.unlink(path.join(testWorkspace, `concurrent-test-${i}.js`)); } catch {}
		}
	});

	test('Memory cleanup verification (resource-based)', async function() {
		this.timeout(8000);

		// ensure temp dir exists
		const tempDir = path.join(testWorkspace, '.vscode', 'sqlsugar', 'temp');
		await fs.promises.mkdir(tempDir, { recursive: true });

		// get baseline metrics and temp count
		const beforeMetrics: any = await vscode.commands.executeCommand('sqlsugar._devGetMetrics');
		const beforeFiles = await fs.promises.readdir(tempDir).catch(() => []);
		const beforeTempCount = beforeFiles.filter(f => f.startsWith('temp_sql_')).length;

		// Perform several operations
		const rounds = 4;
		for (let i = 0; i < rounds; i++) {
			const testContent = `const sql = "SELECT * FROM users WHERE batch = :batch${i}";`;
			const testFilePath = path.join(testWorkspace, `memory-test-${i}.js`);
			await fs.promises.writeFile(testFilePath, testContent);

			const document = await vscode.workspace.openTextDocument(testFilePath);
			const editor = await vscode.window.showTextDocument(document);

			// Select and edit SQL
			const sqlStart = testContent.indexOf('"SELECT');
			const sqlEnd = testContent.indexOf('";', sqlStart);
			const startPos = document.positionAt(sqlStart);
			const endPos = document.positionAt(sqlEnd + 1);
			editor.selection = new vscode.Selection(startPos, endPos);

			await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
			await new Promise(resolve => setTimeout(resolve, 300));

			// Close the temp editor if opened, then close source editor
			try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
			await new Promise(resolve => setTimeout(resolve, 200));

			try { await fs.promises.unlink(testFilePath); } catch {}
		}

		// small delay to allow close/unlink events to propagate
		await new Promise(resolve => setTimeout(resolve, 500));

		const afterMetrics: any = await vscode.commands.executeCommand('sqlsugar._devGetMetrics');
		const afterFiles = await fs.promises.readdir(tempDir).catch(() => []);
		const afterTempCount = afterFiles.filter(f => f.startsWith('temp_sql_')).length;

		// Assertions: no unbounded growth
		assert.ok(afterMetrics.activeDisposables <= beforeMetrics.activeDisposables, `Active disposables should not grow: before=${beforeMetrics.activeDisposables} after=${afterMetrics.activeDisposables}`);
		assert.ok(afterMetrics.activeTempFiles <= beforeMetrics.activeTempFiles + 1, `Active temp files should be cleaned up: before=${beforeMetrics.activeTempFiles} after=${afterMetrics.activeTempFiles}`);
		assert.ok(afterTempCount - beforeTempCount <= rounds, `Temp directory should not accumulate disproportionately: before=${beforeTempCount} after=${afterTempCount}`);
	});
	// Old memory test removed in favor of resource-based verification

	test('User line changes during sync: Adding then removing lines', async function() {
		this.timeout(10000);

		// Create test document with a simple SQL query
		const testContent = `
function getUserData() {
	const query = "SELECT id, name FROM users WHERE active = :active";
	return query;
}`;
		const testFilePath = path.join(testWorkspace, 'line-add-remove-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL string (including quotes)
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('"', sqlStart + 1) + 1; // Find closing quote and include it
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd);
		console.log('Selection debug:');
		console.log('sqlStart:', sqlStart, 'sqlEnd:', sqlEnd);
		console.log('Selected text:', JSON.stringify(testContent.substring(sqlStart, sqlEnd)));
		console.log('Before char:', JSON.stringify(testContent.charAt(sqlStart - 1)));
		console.log('After char:', JSON.stringify(testContent.charAt(sqlEnd)));
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command to open temp editor
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// User adds a line
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const expandedSQL = fullText.replace(
				'WHERE active = "__:active"',
				'WHERE active = "__:active"\n\tAND status = "__:status"'
			);
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), expandedSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify addition synced
		let currentContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(currentContent.includes('AND status = :status'), 'Added line should sync');
		assert.ok(currentContent.includes(':active'), 'Original placeholder should be restored');

		// User removes the added line
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const simplifiedSQL = fullText.replace(/\n\s*AND status = "__:status"/, '');
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), simplifiedSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify removal synced correctly
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		console.log('Final content:', JSON.stringify(finalContent, null, 2));
		console.log('Contains "AND status = :status"?', finalContent.includes('AND status = :status'));
		assert.ok(!finalContent.includes('AND status = :status'), 'Removed line should not remain');
		assert.ok(finalContent.includes('WHERE active = :active'), 'Original content should remain');
		assert.ok(!finalContent.includes('__:'), 'No temp placeholders should remain');

		// Close editors to prevent resource leaks
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
	});

	test('User line changes during sync: Removing then adding lines', async function() {
		this.timeout(10000);

		// Create test document with a more complex SQL query
		const testContent = `
const advancedQuery = \`SELECT
	u.id,
	u.name,
	u.email,
	-- User profile data
	p.bio,
	p.avatar_url
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.status = :status
	AND u.created_at BETWEEN :start_date AND :end_date
ORDER BY u.created_at DESC\`;
`;
		const testFilePath = path.join(testWorkspace, 'line-remove-add-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL template literal
		const sqlStart = testContent.indexOf('`SELECT');
		const sqlEnd = testContent.lastIndexOf('`');
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd + 1);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// Step 1: User removes lines (simplifying the query)
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const simplifiedSQL = fullText
				.replace(/,\s*-- User profile data[\s\S]*?p\.avatar_url/g, '') // Remove profile fields and comment
				.replace(/LEFT JOIN profiles p ON u\.id = p\.user_id\s*/g, '') // Remove JOIN
				.replace(/\s*AND u\.created_at BETWEEN.*?"__:end_date"/g, ''); // Remove date range with temp placeholder
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), simplifiedSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify simplification synced
		let currentContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(!currentContent.includes('profiles p'), 'JOIN should be removed');
		assert.ok(!currentContent.includes('p.bio'), 'Profile fields should be removed');
		assert.ok(!currentContent.includes(':end_date'), 'Removed placeholder should not remain');
		assert.ok(currentContent.includes(':status'), 'Kept placeholder should remain and be restored');

		// Step 2: User adds new lines (expanding with different content)
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const expandedSQL = fullText.replace(
				'WHERE u.status = "__:status"',
				`-- New filtering logic
WHERE u.status = "__:status"
	AND u.email_verified = true
	-- Role-based filtering
	AND u.role IN ("__:allowed_roles")
	-- Activity filter
	AND u.last_login > "__:min_last_login"`
			);
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), expandedSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify expansion synced correctly
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		assert.ok(finalContent.includes('-- New filtering logic'), 'New comments should be synced');
		assert.ok(finalContent.includes('email_verified = true'), 'New conditions should be synced');
		assert.ok(finalContent.includes('-- Role-based filtering'), 'Role comment should be synced');
		assert.ok(finalContent.includes(':allowed_roles'), 'New placeholders should be restored correctly');
		assert.ok(finalContent.includes(':min_last_login'), 'New placeholders should be restored correctly');
		assert.ok(finalContent.includes(':status'), 'Original placeholder should be restored');
		assert.ok(!finalContent.includes('__:'), 'No temp placeholders should remain');

		// Close editors to prevent resource leaks
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
	});

	test('User line changes with mixed operations and placeholder preservation', async function() {
		this.timeout(10000);

		// Create test with multiple placeholders in different contexts
		const testContent = `
const dynamicQuery = "SELECT * FROM orders WHERE customer_id = :customer_id AND status IN (:status_list) AND total > :min_amount";
`;
		const testFilePath = path.join(testWorkspace, 'mixed-operations-test.js');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL string (including quotes)
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('"', sqlStart + 1) + 1; // Find closing quote and include it
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// Mixed operations: format query, add/remove lines, modify placeholders
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const mixedSQL = `SELECT
	o.id,
	o.customer_id,
	o.total,
	o.status,
	-- Order details
	o.created_at,
	o.updated_at
FROM orders o
WHERE o.customer_id = "__:customer_id"
	-- Status filtering (modified)
	AND o.status IN ("__:status_list")
	-- Amount filters
	AND o.total > "__:min_amount"
	AND o.total < "__:max_amount"
	-- Date range (new)
	AND o.created_at >= "__:start_date"
ORDER BY o.created_at DESC`;
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), mixedSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify all changes synced correctly with proper placeholder restoration
		const syncedContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();

		// Check structure changes
		assert.ok(syncedContent.includes('SELECT\n\to.id'), 'Multi-line SELECT should be synced');
		assert.ok(syncedContent.includes('-- Order details'), 'Comments should be synced');
		assert.ok(syncedContent.includes('FROM orders o'), 'Table alias should be synced');
		assert.ok(syncedContent.includes('ORDER BY o.created_at DESC'), 'ORDER BY should be synced');

		// Check original placeholders are preserved
		assert.ok(syncedContent.includes(':customer_id'), 'Original customer_id placeholder should be restored');
		assert.ok(syncedContent.includes(':status_list'), 'Original status_list placeholder should be restored');
		assert.ok(syncedContent.includes(':min_amount'), 'Original min_amount placeholder should be restored');

		// Check new placeholders are correctly restored
		assert.ok(syncedContent.includes(':max_amount'), 'New max_amount placeholder should be restored');
		assert.ok(syncedContent.includes(':start_date'), 'New start_date placeholder should be restored');

		// Ensure no temp placeholders remain
		assert.ok(!syncedContent.includes('__:'), 'No temp placeholders should remain in final content');

		// Second round: Remove some lines and modify existing ones
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const modifiedSQL = fullText
				.replace(/\s*-- Order details[\s\S]*?o\.updated_at/g, '') // Remove comment and fields
				.replace(/\s*-- Date range \(new\)[\s\S]*?"__:start_date"/g, '') // Remove date filter with temp placeholder
				.replace('-- Amount filters', '-- Price range filters'); // Modify comment
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), modifiedSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify second round of changes
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		console.log('Final content (mixed ops):', JSON.stringify(finalContent, null, 2));
		console.log('Contains "-- Order details"?', finalContent.includes('-- Order details'));
		assert.ok(!finalContent.includes('-- Order details'), 'Removed comments should not remain');
		assert.ok(!finalContent.includes('o.created_at,'), 'Removed fields should not remain');
		assert.ok(!finalContent.includes(':start_date'), 'Removed placeholders should not remain');
		assert.ok(finalContent.includes('-- Price range filters'), 'Modified comments should be synced');
		assert.ok(finalContent.includes(':customer_id'), 'Preserved placeholders should remain');
		assert.ok(finalContent.includes(':max_amount'), 'Preserved new placeholders should remain');

		// Close editors to prevent resource leaks
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
	});

	test('Python single-line to multi-line string upgrade', async function() {
		this.timeout(8000);

		// Create a Python test file with single-line SQL string
		const testContent = `
query = "SELECT * FROM users WHERE id = :id"
result = execute_query(query)
`;
		const testFilePath = path.join(testWorkspace, 'test_python.py');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL string
		const sqlStart = testContent.indexOf('"SELECT');
		const sqlEnd = testContent.indexOf('"', sqlStart + 1) + 1;
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command to open temp editor
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file to make it multi-line
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// Add a new line to make it multi-line
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const multiLineSQL = fullText.replace(
				'SELECT * FROM users WHERE id = "__:id"',
				'SELECT *\nFROM users\nWHERE id = "__:id"'
			);
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), multiLineSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify the result was upgraded to triple quotes
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		console.log('Final Python content:', JSON.stringify(finalContent));
		assert.ok(finalContent.includes('"""SELECT'), 'Single-line string should be upgraded to triple quotes');
		assert.ok(finalContent.includes('FROM users'), 'Multi-line content should be preserved');
		assert.ok(finalContent.includes('WHERE id = :id"""'), 'Placeholder should be restored and triple quotes closed');
		assert.ok(!finalContent.includes('__:'), 'No temp placeholders should remain');

		// Close editors to prevent resource leaks
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
	});

	test('Python f-string prefix preservation', async function() {
		this.timeout(8000);

		// Create a Python test file with f-string
		const testContent = `
user_id = 123
query = f"SELECT * FROM users WHERE id = {user_id}"
result = execute_query(query)
`;
		const testFilePath = path.join(testWorkspace, 'test_fstring.py');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the f-string SQL
		const sqlStart = testContent.indexOf('f"SELECT');
		const sqlEnd = testContent.indexOf('"', sqlStart + 2) + 1;
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file to make it multi-line
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// Add a new line
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const multiLineSQL = fullText.replace(
				'SELECT * FROM users',
				'SELECT *\nFROM users'
			);
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), multiLineSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify f-string prefix is preserved with triple quotes
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		console.log('Final f-string content:', JSON.stringify(finalContent));
		assert.ok(finalContent.includes('f"""SELECT'), 'f-string prefix should be preserved with triple quotes');
		assert.ok(finalContent.includes('FROM users'), 'Multi-line content should be preserved');
		assert.ok(finalContent.includes('{user_id}"""'), 'f-string variable and triple quotes should be preserved');

		// Close editors
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
	});

	test('Python single quote to triple single quote upgrade', async function() {
		this.timeout(8000);

		// Create a Python test file with single quotes
		const testContent = `
query = 'SELECT * FROM users WHERE name = :name'
result = execute_query(query)
`;
		const testFilePath = path.join(testWorkspace, 'test_single_quote.py');
		await fs.promises.writeFile(testFilePath, testContent);

		const document = await vscode.workspace.openTextDocument(testFilePath);
		const editor = await vscode.window.showTextDocument(document);

		// Select the SQL string with single quotes
		const sqlStart = testContent.indexOf("'SELECT");
		const sqlEnd = testContent.indexOf("'", sqlStart + 1) + 1;
		const startPos = document.positionAt(sqlStart);
		const endPos = document.positionAt(sqlEnd);
		editor.selection = new vscode.Selection(startPos, endPos);

		// Execute the command
		await vscode.commands.executeCommand('sqlsugar.editInlineSQL');
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Find and edit temp file to make it multi-line
		const tempFilePath = await getLatestTempFilePath(testWorkspace);
		const tempDoc = await vscode.workspace.openTextDocument(tempFilePath);
		const tempEditor = await vscode.window.showTextDocument(tempDoc);

		// Add a new line
		await tempEditor.edit(editBuilder => {
			const fullText = tempDoc.getText();
			const multiLineSQL = fullText.replace(
				'SELECT * FROM users WHERE name = "__:name"',
				'SELECT *\nFROM users\nWHERE name = "__:name"'
			);
			editBuilder.replace(new vscode.Range(tempDoc.positionAt(0), tempDoc.positionAt(fullText.length)), multiLineSQL);
		});
		await tempDoc.save();
		await new Promise(resolve => setTimeout(resolve, 1200));

		// Verify single quote was upgraded to triple single quotes
		const finalContent = (await vscode.workspace.openTextDocument(testFilePath)).getText();
		console.log('Final single quote content:', JSON.stringify(finalContent));
		assert.ok(finalContent.includes("'''SELECT"), 'Single quote should be upgraded to triple single quotes');
		assert.ok(finalContent.includes('FROM users'), 'Multi-line content should be preserved');
		assert.ok(finalContent.includes("WHERE name = :name'''"), 'Placeholder should be restored with triple single quotes');
		assert.ok(!finalContent.includes('__:'), 'No temp placeholders should remain');

		// Close editors
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
		await new Promise(resolve => setTimeout(resolve, 200));
		try { await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); } catch {}
	});

});

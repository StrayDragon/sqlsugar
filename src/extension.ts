// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LanguageClient, LanguageClientOptions, Executable, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

// Metrics for test environment resource tracking
interface DevMetrics {
	activeDisposables: number;
	activeTempFiles: number;
	totalCommandInvocations: number;
}

let devMetrics: DevMetrics = {
	activeDisposables: 0,
	activeTempFiles: 0,
	totalCommandInvocations: 0
};

const isTestEnvironment = process.env.VSCODE_TEST === 'true';

export function activate(context: vscode.ExtensionContext) {
	console.log('sqlsugar activated');

	const disposables: vscode.Disposable[] = [];

	// Core command: Edit Inline SQL
	const editInlineSQL = vscode.commands.registerCommand('sqlsugar.editInlineSQL', async () => {
		if (isTestEnvironment) { devMetrics.totalCommandInvocations++; }
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showErrorMessage('No active editor');
			return;
		}

		const document = editor.document;
		const selection = editor.selection;
		if (selection.isEmpty) {
			vscode.window.showErrorMessage('Please select a SQL string to edit.');
			return;
		}

		const selectedText = document.getText(selection);
		// Heuristic detection: strip quotes and check SQL keywords
		const raw = selectedText.trim();
		const unquoted = stripQuotes(raw);
		if (!looksLikeSQL(unquoted)) {
			const confirm = await vscode.window.showWarningMessage(
				'Selected text may not be SQL. Continue?',
				{ modal: true },
				'Continue',
				'Cancel'
			);
			if (confirm !== 'Continue') { return; }
		}

		// Check for ORM placeholders and convert them for sqls compatibility
		const { hasPlaceholders, convertedSQL } = convertPlaceholdersToTemp(unquoted);
		if (hasPlaceholders) {
			vscode.window.showInformationMessage('Detected ORM placeholders - converted for editing compatibility.');
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const baseDir = workspaceFolder?.uri.fsPath ?? context.globalStorageUri.fsPath;
		const tempRoot = path.join(baseDir, '.vscode', 'sqlsugar', 'temp');
		await fs.promises.mkdir(tempRoot, { recursive: true });

		const timestamp = Date.now();
		const hash = simpleHash(convertedSQL).toString(16);
		const tempFileName = `temp_sql_${timestamp}_${hash}.sql`;
		const tempFilePath = path.join(tempRoot, tempFileName);

		await fs.promises.writeFile(tempFilePath, convertedSQL, 'utf8');
		if (isTestEnvironment) { devMetrics.activeTempFiles++; }

		const tempDocPath = tempFilePath;
		let tempDoc = await vscode.workspace.openTextDocument(tempDocPath);
		if (tempDoc.languageId !== 'sql') {
			try {
				tempDoc = await vscode.languages.setTextDocumentLanguage(tempDoc, 'sql');
			} catch { }
		}
		await vscode.window.showTextDocument(tempDoc, {
			preview: false,
			viewColumn: vscode.ViewColumn.Beside
		});

		// Create disposable listeners for this specific temp file
		const tempDisposables: vscode.Disposable[] = [];

		// State for tracking the current SQL position across multiple syncs
		let currentRaw = raw;
		let currentSelection = selection;

		// On save of temp file, write back to original
		const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (doc) => {
			if (doc.uri.fsPath !== tempFilePath) { return; }
			
			const newSQL = doc.getText();

			// Convert temp placeholders back to original format before writing back
			const restoredSQL = convertPlaceholdersFromTemp(newSQL);
			const wrappedSQL = wrapLike(currentRaw, restoredSQL);
			console.log('Sync debug:');
			console.log('Current raw:', JSON.stringify(currentRaw));
			console.log('New SQL from temp:', JSON.stringify(newSQL));
			console.log('Restored SQL:', JSON.stringify(restoredSQL));
			console.log('Wrapped SQL:', JSON.stringify(wrappedSQL));
			
			// Replace using current selection
			await replaceSelection(editor, currentSelection, wrappedSQL);
			
			// Update state for next sync: the new wrapped SQL becomes the new "raw" and
			// we need to calculate the new selection range
			currentRaw = wrappedSQL;
			const endPos = new vscode.Position(
				currentSelection.start.line + wrappedSQL.split('\n').length - 1,
				wrappedSQL.split('\n').length === 1 
					? currentSelection.start.character + wrappedSQL.length
					: wrappedSQL.split('\n')[wrappedSQL.split('\n').length - 1].length
			);
			currentSelection = new vscode.Selection(currentSelection.start, endPos);

			vscode.window.showInformationMessage('Inline SQL updated.');

			// cleanup behavior: delete on save only when cleanupOnClose is false
			const shouldCleanup = getConfig('sqlsugar.tempFileCleanup', true);
			const cleanupOnClose = getConfig('sqlsugar.cleanupOnClose', true);
			if (shouldCleanup && !cleanupOnClose) {
				try { await fs.promises.unlink(tempFilePath); } catch { }
				if (isTestEnvironment) { devMetrics.activeTempFiles = Math.max(0, devMetrics.activeTempFiles - 1); }
				// Only clean up listeners when file is actually deleted
				cleanupTempListeners(tempDisposables);
			}
		});

		// when configured, cleanup temp file on editor close instead of save
		const closeDisposable = vscode.workspace.onDidCloseTextDocument(async (doc) => {
			if (doc.uri.fsPath !== tempFilePath) { return; }
			const shouldCleanup = getConfig('sqlsugar.tempFileCleanup', true);
			const cleanupOnClose = getConfig('sqlsugar.cleanupOnClose', true);
			if (shouldCleanup && cleanupOnClose) {
				try { await fs.promises.unlink(tempFilePath); } catch { }
				if (isTestEnvironment) { devMetrics.activeTempFiles = Math.max(0, devMetrics.activeTempFiles - 1); }
			}
			// Always clean up listeners when document is closed
			cleanupTempListeners(tempDisposables);
		});

		tempDisposables.push(saveDisposable);
		if (isTestEnvironment) { devMetrics.activeDisposables++; }
		tempDisposables.push(closeDisposable);
		if (isTestEnvironment) { devMetrics.activeDisposables++; }
	});

	// Helper command: Configure sqls executable path
	// const configureSqlsPath = vscode.commands.registerCommand('sqlsugar.configureSqlsPath', async () => {
	// 	const current = getConfig('sqlsugar.sqlsPath', 'sqls');
	// 	const picked = await vscode.window.showInputBox({
	// 		prompt: 'Enter path to sqls executable',
	// 		value: current,
	// 		ignoreFocusOut: true,
	// 	});
	// 	if (!picked) { return; }
	// 	await vscode.workspace.getConfiguration().update('sqlsugar.sqlsPath', picked, vscode.ConfigurationTarget.Workspace);
	// 	vscode.window.showInformationMessage(`sqls path set to: ${picked}`);
	// 	restartSqlsClient(context);
	// });

	disposables.push(editInlineSQL);
	// disposables.push(configureSqlsPath);

	// Dev metrics command for tests/tools
	const metricsCmd = vscode.commands.registerCommand('sqlsugar._devGetMetrics', async () => {
		return { ...devMetrics };
	});
	disposables.push(metricsCmd);

	context.subscriptions.push(...disposables);

	startSqlsClient(context);

	const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('sqlsugar.sqlsPath') || e.affectsConfiguration('sqlsugar.sqlsConfigPath')) {
			restartSqlsClient(context);
		}
	});
	context.subscriptions.push(configChange);
}

function deactivateTempListeners(disposables: vscode.Disposable[]) {
	while (disposables.length) {
		try { disposables.pop()?.dispose(); } catch { }
	}
}

function cleanupTempListeners(disposables: vscode.Disposable[]) {
	// Alias to make intent clear for per-temp-file listeners
	const count = disposables.length;
	deactivateTempListeners(disposables);
	if (isTestEnvironment) { devMetrics.activeDisposables = Math.max(0, devMetrics.activeDisposables - count); }
}

export async function deactivate() {
	if (client) {
		try {
			await client.stop();
		} catch {
			// ignore
		}
		client = undefined;
	}
}

function startSqlsClient(context: vscode.ExtensionContext) {
	const sqlsPath = getConfig('sqlsugar.sqlsPath', 'sqls');
	const configuredConfigPath = getConfig<string>('sqlsugar.sqlsConfigPath', '');
	const resolvedConfigPath = resolveConfigPath(configuredConfigPath);

	const args: string[] = [];
	if (resolvedConfigPath) {
		args.push('-config', resolvedConfigPath);
	}

	const exec: Executable = {
		command: sqlsPath,
		args,
		options: {
			env: process.env,
		}
	};
	const serverOptions: ServerOptions = {
		run: exec,
		debug: exec,
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'sql' },
			{ scheme: 'untitled', language: 'sql' },
			// Fallback for environments where .sql may not auto-detect to 'sql'
			{ scheme: 'file', pattern: '**/*.sql' },
		],
		outputChannelName: 'sqls',
	};

	// If a previous client is running, stop it first
	if (client) {
		try { client.stop(); } catch { }
		client = undefined;
	}

	client = new LanguageClient('sqls', 'SQL Language Server', serverOptions, clientOptions);
	client.start().then(() => {
		vscode.window.setStatusBarMessage('SQLS language server started', 3000);
	}).catch((err) => {
		vscode.window.showErrorMessage(`Failed to start sqls: ${err?.message ?? err}`);
	});

	// Warn if config path is set but does not exist
	if (configuredConfigPath && !resolvedConfigPath) {
		vscode.window.showWarningMessage(`sqls config not found: ${configuredConfigPath}`);
	}
}

function restartSqlsClient(context: vscode.ExtensionContext) {
	startSqlsClient(context);
}

function expandVariables(input: string): string {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
	return input.replace(/\$\{(env:)?([^}]+)\}/g, (_match, envPrefix: string | undefined, name: string) => {
		if (envPrefix === 'env:') {
			return process.env[name] ?? '';
		}
		if (name === 'workspaceFolder') {
			return workspaceFolder || '';
		}
		return '';
	});
}

function resolveConfigPath(configPath: string): string {
	if (!configPath) { return ''; }
	let candidate = expandVariables(configPath);
	if (!candidate) { return ''; }
	if (!path.isAbsolute(candidate)) {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		if (workspaceFolder) {
			candidate = path.join(workspaceFolder, candidate);
		}
	}
	candidate = path.normalize(candidate);
	try {
		const stat = fs.statSync(candidate);
		if (stat.isFile()) { return candidate; }
	} catch {
		return '';
	}
	return '';
}

function stripQuotes(text: string): string {
	const t = text.trim();
	// Triple quotes ''' or """
	if ((t.startsWith("'''") && t.endsWith("'''")) || (t.startsWith('"""') && t.endsWith('"""'))) {
		return t.slice(3, -3);
	}
	// Single quotes or double quotes
	if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
		return t.slice(1, -1);
	}
	return t;
}

function wrapLike(original: string, content: string): string {
	const t = original.trim();
	if ((t.startsWith("'''") && t.endsWith("'''")) || (t.startsWith('"""') && t.endsWith('"""'))) {
		return t.slice(0, 3) + content + t.slice(-3);
	}
	if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
		return t[0] + content + t.slice(-1);
	}
	return content;
}

function looksLikeSQL(text: string): boolean {
	const s = text.trim().toUpperCase();
	const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'WITH'];
	return keywords.some(k => s.includes(k));
}

async function replaceSelection(editor: vscode.TextEditor, sel: vscode.Selection, newText: string) {
	const range = new vscode.Range(sel.start, sel.end);
	await editor.edit(editBuilder => {
		editBuilder.replace(range, newText);
	});
}

function simpleHash(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
	return Math.abs(h);
}

function getConfig<T>(key: string, defaultValue: T): T {
	return vscode.workspace.getConfiguration().get<T>(key, defaultValue);
}

/**
 * Convert ORM placeholders (:placeholder) to temp string format ("__:placeholder") for sqls compatibility
 * - Converts :placeholder to "__:placeholder" (quoted string literal)
 * - Avoids matching times like 12:34
 * - Avoids matching Postgres casts ::type
 */
function convertPlaceholdersToTemp(sql: string): { hasPlaceholders: boolean; convertedSQL: string } {
	// Match `:name` where the preceding char is start or not a colon/word/$
	// Capture the preceding char to preserve it in replacement
	const regex = /(^|[^:\w$]):([A-Za-z_][\w]*)/g;
	let has = false;
	const convertedSQL = sql.replace(regex, (_m, pre: string, name: string) => {
		has = true;
		return `${pre}"__:${name}"`;
	});
	return { hasPlaceholders: has, convertedSQL };
}

/**
 * Convert temp placeholders ("__:placeholder") back to original format (:placeholder)
 */
function convertPlaceholdersFromTemp(sql: string): string {
	return sql.replace(/"__:(\w+)"/g, ':$1');
}

function findSQLPosition(docText: string, startPos: vscode.Position, originalQuotedSQL: string): vscode.Selection | null {
	// Try to find SQL string starting from the general area of the original position
	const startOffset = Math.max(0, (startPos.line - 2) * 100); // rough estimation
	const searchArea = docText.substring(startOffset);
	
	// Look for the quoted SQL pattern - try exact match first
	let sqlIndex = searchArea.indexOf(originalQuotedSQL);
	if (sqlIndex === -1) {
		// If exact match fails, try to find by the opening quote and first few words
		const quotedPattern = originalQuotedSQL.substring(0, Math.min(50, originalQuotedSQL.length));
		sqlIndex = searchArea.indexOf(quotedPattern);
	}
	
	if (sqlIndex !== -1) {
		const actualStartOffset = startOffset + sqlIndex;
		const actualEndOffset = actualStartOffset + originalQuotedSQL.length;
		
		// Convert back to positions
		const startPosition = positionFromOffset(docText, actualStartOffset);
		const endPosition = positionFromOffset(docText, actualEndOffset);
		
		return new vscode.Selection(startPosition, endPosition);
	}
	
	return null;
}

function positionFromOffset(text: string, offset: number): vscode.Position {
	const textBeforeOffset = text.substring(0, offset);
	const lines = textBeforeOffset.split('\n');
	const line = lines.length - 1;
	const character = lines[line].length;
	return new vscode.Position(line, character);
}

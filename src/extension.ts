// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { LanguageClient, LanguageClientOptions, Executable, ServerOptions } from 'vscode-languageclient/node';
import { SQLLogParser, ParsedSQL } from './sql-log-parser';
import { TerminalMonitor } from './terminal-monitor';
import { ClipboardManager } from './clipboard-manager';
import { Jinja2TemplateProcessor } from './jinja2-processor';

let client: LanguageClient | undefined;
let extensionContext: vscode.ExtensionContext;

// Database connection management
interface DatabaseConnection {
	alias: string;
	driver: string;
	dataSourceName?: string;
	proto?: string;
	user?: string;
	passwd?: string;
	host?: string;
	port?: string;
	dbName?: string;
	params?: Record<string, string>;
	sshConfig?: any;
}

interface ConnectionConfig {
	lowercaseKeywords?: boolean;
	connections: DatabaseConnection[];
}

let currentConnection: DatabaseConnection | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

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

// Debug mode flag
let debugMode = false;

export function activate(context: vscode.ExtensionContext) {
	console.log('sqlsugar activated');

	// Store context for use in other functions
	extensionContext = context;

	const disposables: vscode.Disposable[] = [];

	// Initialize status bar
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'sqlsugar.switchConnection';
	disposables.push(statusBarItem);

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
		
		// Store original indentation pattern for Python multi-line strings
		const indentInfo = extractIndentInfo(unquoted);

		// On save of temp file, write back to original
		const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (doc) => {
			if (doc.uri.fsPath !== tempFilePath) { return; }
			
			const newSQL = doc.getText();

			// Convert temp placeholders back to original format before writing back
			const restoredSQL = convertPlaceholdersFromTemp(newSQL);
			
			// Restore original indentation for Python multi-line strings
			const finalSQL = applyIndentation(restoredSQL, indentInfo, editor.document);
			
			const wrappedSQL = wrapLikeIntelligent(currentRaw, finalSQL, editor.document);
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
				try { await fs.promises.unlink(tempFilePath); } catch (error) {
					console.warn('Failed to cleanup temp file on save:', error instanceof Error ? error.message : String(error));
				}
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
				try { await fs.promises.unlink(tempFilePath); } catch (error) {
					console.warn('Failed to cleanup temp file on close:', error instanceof Error ? error.message : String(error));
				}
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

	// Database connection switching command
	const switchConnection = vscode.commands.registerCommand('sqlsugar.switchConnection', async () => {
		const connections = await loadConnectionsFromConfig();
		if (connections.length === 0) {
			vscode.window.showErrorMessage('No database connections found in sqls configuration');
			return;
		}

		const items = connections.map(conn => ({
			label: conn.alias,
			description: `${conn.driver} - ${conn.host || conn.dataSourceName || 'Unknown'}`,
			detail: conn.dataSourceName || `${conn.user || ''}@${conn.host || ''}:${conn.port || ''}/${conn.dbName || ''}`,
			connection: conn
		}));

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a database connection',
			title: 'Switch Database Connection'
		});

		if (selected) {
			await switchToConnection(selected.connection);
		}
	});

	disposables.push(editInlineSQL);
	disposables.push(switchConnection);

	// Terminal SQL copy command
	const copyTerminalSQL = vscode.commands.registerCommand('sqlsugar.copyTerminalSQL', async () => {
		await handleCopyTerminalSQL();
	});
	disposables.push(copyTerminalSQL);

	// Test log generation command
	const generateTestLogs = vscode.commands.registerCommand('sqlsugar.generateTestLogs', async () => {
		await handleGenerateTestLogs();
	});
	disposables.push(generateTestLogs);

	// Debug mode toggle command
	const toggleDebugMode = vscode.commands.registerCommand('sqlsugar.toggleDebugMode', async () => {
		debugMode = !debugMode;
		SQLLogParser.setDebugMode(debugMode);
		
		const message = debugMode ? 
			'SQLSugar debug mode enabled. Check developer console for detailed logs.' : 
			'SQLSugar debug mode disabled.';
		
		vscode.window.showInformationMessage(message, { modal: false });
		
		// Update status bar to show debug mode
		if (statusBarItem) {
			if (debugMode) {
				statusBarItem.text = '$(bug) SQLSugar Debug';
				statusBarItem.tooltip = 'SQLSugar Debug Mode - Click to toggle';
				statusBarItem.show();
			} else {
				// Restore normal status bar
				if (currentConnection) {
					statusBarItem.text = `$(database) ${currentConnection.alias}`;
					statusBarItem.tooltip = `${currentConnection.driver} - ${currentConnection.host || currentConnection.dataSourceName || 'Unknown'}`;
				} else {
					statusBarItem.text = '$(database) No Connection';
					statusBarItem.tooltip = 'Click to select database connection';
				}
				statusBarItem.show();
			}
		}
	});
	disposables.push(toggleDebugMode);

	// Test clipboard command
	const testClipboard = vscode.commands.registerCommand('sqlsugar.testClipboard', async () => {
		try {
			const clipboardText = await vscode.env.clipboard.readText();

			// 详细的调试信息
			console.log('=== SQLSugar Clipboard Debug Info ===');
			console.log('Clipboard content length:', clipboardText.length);
			console.log('Clipboard content (first 500 chars):', clipboardText.substring(0, 500));
			console.log('Clipboard content (char codes):', Array.from(clipboardText.substring(0, 50)).map(c => c.charCodeAt(0)));

			// 检查是否为空或只有空白字符
			if (!clipboardText.trim()) {
				vscode.window.showErrorMessage('❌ Clipboard is empty or contains only whitespace', { modal: false });
				return;
			}

			// 分析每一行
			const lines = clipboardText.trim().split('\n');
			console.log('Number of lines:', lines.length);

			let foundSQLKeywords = false;
			const analysis = lines.map((line, index) => {
				const trimmed = line.trim();
				const hasSQLKeywords = [
					'sqlalchemy.engine.Engine',
					'INSERT INTO',
					'SELECT',
					'UPDATE',
					'DELETE FROM',
					'CREATE TABLE',
					'ALTER TABLE',
					'DROP TABLE',
					'BEGIN',
					'COMMIT',
					'ROLLBACK'
				].some(keyword => trimmed.toLowerCase().includes(keyword.toLowerCase()));

				const hasPlaceholders = trimmed.includes('?') || trimmed.includes(':') || trimmed.includes('%s');
				const hasParams = trimmed.match(/\(.*?\)/) || trimmed.match(/\{.*?\}/) || trimmed.match(/\[.*?\]/);
				const hasTimestamp = trimmed.includes('INFO ') || trimmed.includes('DEBUG ') || trimmed.includes('[generated in');

				if (hasSQLKeywords || hasPlaceholders || hasParams || hasTimestamp) {
					foundSQLKeywords = true;
				}

				return {
					lineNumber: index + 1,
					content: trimmed,
					hasSQLKeywords,
					hasPlaceholders,
					hasParams,
					hasTimestamp
				};
			});

			// 显示分析结果
			console.log('Line analysis:', analysis);

			if (foundSQLKeywords) {
				const message = `✅ Clipboard content appears to be SQL log (${lines.length} lines detected)`;
				console.log(message);

				// 尝试解析SQL
				try {
					const parsed = SQLLogParser.processSelectedText(clipboardText);
					if (parsed) {
						console.log('✅ Successfully parsed SQL:', parsed);
						vscode.window.showInformationMessage(`SQL log detected! Found SQL with ${parsed.parameters.length} parameters.`, {
							modal: false,
							detail: `Original: ${parsed.originalSQL}\nInjected: ${parsed.injectedSQL}`
						});
					} else {
						console.log('❌ Failed to parse SQL');
						vscode.window.showErrorMessage('❌ Clipboard contains SQL-like text but parsing failed', { modal: false });
					}
				} catch (parseError) {
					console.log('❌ Parse error:', parseError);
					vscode.window.showErrorMessage(`❌ Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`, { modal: false });
				}
			} else {
				const message = `❌ Clipboard content does not appear to be SQL log (${lines.length} lines)\nFirst line: "${lines[0]?.trim().substring(0, 50)}..."`;
				console.log(message);
				vscode.window.showErrorMessage(message, { modal: false });
			}

		} catch (error) {
			console.log('❌ Clipboard read error:', error);
			vscode.window.showErrorMessage(`❌ Failed to read clipboard: ${error instanceof Error ? error.message : String(error)}`, { modal: false });
		}
	});
	disposables.push(testClipboard);

	// Jinja2 template copy command
	const copyJinja2Template = vscode.commands.registerCommand('sqlsugar.copyJinja2Template', async () => {
		await Jinja2TemplateProcessor.handleCopyJinja2Template();
	});
	disposables.push(copyJinja2Template);

	// Dev metrics command for tests/tools
	const metricsCmd = vscode.commands.registerCommand('sqlsugar._devGetMetrics', async () => {
		return { ...devMetrics };
	});
	disposables.push(metricsCmd);

	context.subscriptions.push(...disposables);

	startSqlsClient(context);

	const configChange = vscode.workspace.onDidChangeConfiguration((e) => {
		if (e.affectsConfiguration('sqlsugar.sqlsPath') || e.affectsConfiguration('sqlsugar.sqlsConfigPath')) {
			startSqlsClient(context);
		}
	});
	context.subscriptions.push(configChange);

	// Initialize connection status and auto-select first connection
	initializeConnection();
}

function deactivateTempListeners(disposables: vscode.Disposable[]) {
	while (disposables.length) {
		try {
			const disposable = disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		} catch (error) {
			console.warn('Failed to dispose listener:', error instanceof Error ? error.message : String(error));
		}
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
		} catch (error) {
			console.warn('Failed to stop language client:', error instanceof Error ? error.message : String(error));
		}
		client = undefined;
	}

	// Clean up other resources
	try {
		statusBarItem?.dispose();
	} catch (error) {
		console.warn('Failed to dispose status bar:', error instanceof Error ? error.message : String(error));
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

	// Set up client options
	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'sql' },
			{ scheme: 'untitled', language: 'sql' },
			// Fallback for environments where .sql may not auto-detect to 'sql'
			{ scheme: 'file', pattern: '**/*.sql' },
		],
		outputChannelName: 'sqls',
		// Disable formatting capabilities to prevent sqls crashes with placeholders
		initializationOptions: {
			provideFormatter: false
		},
		synchronize: {
			configurationSection: 'sqls'
		}
	};

		stopExistingClient();

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


function stopExistingClient(): void {
	if (client) {
		try {
			client.stop();
		} catch (error) {
			console.warn('Failed to stop existing client:', error instanceof Error ? error.message : String(error));
		}
		client = undefined;
	}
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
	
	// Handle prefixed strings (f"...", r"""...""""")
	const prefixMatch = t.match(/^([fruFRU]*)(['"]{1,3})(.*?)(['"]{1,3})$/s);
	if (prefixMatch) {
		const [, , openQuote, content, closeQuote] = prefixMatch;
		if (openQuote === closeQuote) {
			return content;
		}
	}
	
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

type LanguageType = 'python' | 'javascript' | 'typescript' | 'unknown';
type QuoteType = 'single' | 'double' | 'triple-single' | 'triple-double' | 'backtick';

/**
 * 检测文档的编程语言
 */
function detectLanguage(document: vscode.TextDocument): LanguageType {
	// Use VSCode language ID first
	const vscodeLanguageId = document.languageId;
	
		const languageMap: Record<string, LanguageType> = {
		'python': 'python',
		'javascript': 'javascript', 
		'typescript': 'typescript',
		'javascriptreact': 'javascript',
		'typescriptreact': 'typescript',
	};
	
	if (languageMap[vscodeLanguageId]) {
		return languageMap[vscodeLanguageId];
	}
	
	// Fallback to file extension detection
	const fileName = document.fileName;
	if (fileName.endsWith('.py')) {
		return 'python';
	}
	if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) {
		return 'javascript';
	}
	if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
		return 'typescript';
	}
	
	return 'unknown';
}

/**
 * 检测原始字符串的引号类型
 */
function detectQuoteType(originalQuoted: string): QuoteType {
	const t = originalQuoted.trim();
	if ((t.startsWith("'''") && t.endsWith("'''")) || (t.startsWith('"""') && t.endsWith('"""'))) {
		return t.startsWith("'''") ? 'triple-single' : 'triple-double';
	}
	if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
		return t.startsWith("'") ? 'single' : 'double';
	}
	return 'double'; // fallback
}

/**
 * 根据语言和内容特征选择合适的引号类型
 */
function selectQuoteType(
	originalQuoted: string,
	newContent: string,
	language: LanguageType
): QuoteType {
	const hasMultipleLines = newContent.includes('\n');
	const originalQuoteType = detectQuoteType(originalQuoted);
	
	// Keep original quotes for single-line content
	if (!hasMultipleLines) {
		return originalQuoteType;
	}
	
	// Multi-line content strategy by language
	switch (language) {
		case 'python':
			return selectPythonQuote(originalQuoteType, newContent);
		
		case 'javascript':
		case 'typescript':
			// Conservative: keep original behavior
			return originalQuoteType === 'triple-single' || originalQuoteType === 'triple-double' 
				? originalQuoteType 
				: 'double';
		
		case 'unknown':
		default:
			return selectGenericQuote(originalQuoteType, newContent);
	}
}

/**
 * Python引号选择策略
 */
function selectPythonQuote(original: QuoteType, content: string): QuoteType {
	// 如果原本就是三引号，保持不变
	if (original === 'triple-single' || original === 'triple-double') {
		return original;
	}
	
	// 单行引号升级为对应的三引号
	if (original === 'single') {
		// 检查内容是否包含三单引号，如果是则改用三双引号
		if (content.includes("'''")) {
			return 'triple-double';
		}
		return 'triple-single';
	}
	
	if (original === 'double') {
		// 检查内容是否包含三双引号，如果是则改用三单引号
		if (content.includes('"""')) {
			return 'triple-single';
		}
		return 'triple-double';
	}
	
		return 'triple-double';
}

/**
 * 通用引号选择策略
 */
function selectGenericQuote(original: QuoteType, content: string): QuoteType {
	// 保守策略：尽量保持原有类型，实在不行用双引号
	if (original === 'triple-single' || original === 'triple-double') {
		return original;
	}
	
	// 单行引号转多行时保持双引号（较通用）
	return 'double';
}

/**
 * 提取字符串前缀（如 f, r, u 等）
 */
function extractPrefix(original: string): string {
	// 匹配 Python 字符串前缀：f, r, u, b 及其组合，不区分大小写
	// 前缀在引号之前，例如 f"..." 或 fr"""..."""
	const match = original.trim().match(/^([fruFRU]*)(['"`])/i);
	return match ? match[1] : '';
}

/**
 * 使用指定的引号类型包裹内容
 */
function wrapWithQuoteType(
	content: string,
	quoteType: QuoteType,
	prefix: string = ''
): string {
	switch (quoteType) {
		case 'single':
			return `${prefix}'${content}'`;
		case 'double':
			return `${prefix}"${content}"`;
		case 'triple-single':
			return `${prefix}'''${content}'''`;
		case 'triple-double':
			return `${prefix}"""${content}"""`;
		case 'backtick':
			return `${prefix}\`${content}\``;
		default:
			return `${prefix}"${content}"`;
	}
}

/**
 * 智能包裹函数，支持语言感知的引号选择
 */
function wrapLikeIntelligent(
	original: string,
	content: string,
	document: vscode.TextDocument
): string {
	const language = detectLanguage(document);
	const selectedQuoteType = selectQuoteType(original, content, language);
	
	// 检测并保留前缀（如Python的f-string）
	const prefix = extractPrefix(original);
	
	return wrapWithQuoteType(content, selectedQuoteType, prefix);
}

/**
 * 提取缩进信息 - 找出基础缩进和每行的相对缩进
 */
interface IndentInfo {
	baseIndent: string;
	relativeIndents: string[];
}

function extractIndentInfo(text: string): IndentInfo {
	const lines = text.split('\n');
	
	if (lines.length === 0) {
		return { baseIndent: '', relativeIndents: [] };
	}
	
	// 找出所有非空行的缩进
	const nonEmptyLines = lines.filter(line => line.trim().length > 0);
	
	if (nonEmptyLines.length === 0) {
		return { 
			baseIndent: '', 
			relativeIndents: lines.map(() => '') 
		};
	}
	
	// 找出最小缩进作为基础缩进
	let minIndentLength = Infinity;
	const lineIndents = lines.map(line => {
		const indent = line.match(/^(\s*)/)?.[1] || '';
		const indentLength = indent.length;
		if (line.trim().length > 0) {
			minIndentLength = Math.min(minIndentLength, indentLength);
		}
		return indent;
	});
	
	const baseIndent = ' '.repeat(minIndentLength === Infinity ? 0 : minIndentLength);
	
	// 计算每行的相对缩进
	const relativeIndents = lineIndents.map(indent => {
		if (indent.startsWith(baseIndent)) {
			return indent.substring(baseIndent.length);
		}
		return indent;
	});
	
	return { baseIndent, relativeIndents };
}

/**
 * 应用缩进模式到SQL文本
 */
function applyIndentation(sql: string, indentInfo: IndentInfo, document: vscode.TextDocument): string {
	const language = detectLanguage(document);
	
	// 只对Python多行字符串应用缩进
	if (language !== 'python' || !indentInfo.baseIndent) {
		return sql;
	}
	
	const lines = sql.split('\n');
	
	// 检查是否已经是格式化的SQL（有明显的缩进结构）
	const hasComplexIndentation = lines.some(line => {
		const trimmed = line.trim();
		return trimmed.length > 0 && line.length > trimmed.length + indentInfo.baseIndent.length;
	});
	
	// 如果有复杂的缩进结构，保持用户编辑的格式，只添加基础缩进
	if (hasComplexIndentation) {
		const indentedLines = lines.map((line, index) => {
			const trimmedLine = line.trim();
			
			if (trimmedLine.length === 0) {
				// 空行保持为空，不添加缩进
				return '';
			}
			
			// 检查原始行是否有相对缩进
			const originalRelativeIndent = indentInfo.relativeIndents[index] || '';
			const currentIndent = line.match(/^(\s*)/)?.[1] || '';
			
			// 如果当前行有缩进，尝试保持相对结构
			if (currentIndent.length > 0) {
				// 计算当前缩进相对于基础缩进的偏移
				const extraIndent = Math.max(0, currentIndent.length - indentInfo.baseIndent.length);
				return indentInfo.baseIndent + ' '.repeat(extraIndent) + trimmedLine;
			}
			
			// 对于新添加的行，尝试从上下文推断缩进
			if (trimmedLine.startsWith('AND ') || trimmedLine.startsWith('OR ')) {
				// 查找已有的AND/OR行的缩进模式
				const andIndentPatterns = indentInfo.relativeIndents.filter(indent => 
					indent && indent.length > 0
				);
				
				// 优先查找与当前行最相似的AND/OR行的缩进模式
				if (andIndentPatterns.length > 0) {
					// 使用最长的AND/OR缩进模式（通常是正确的缩进）
					const andIndentPattern = andIndentPatterns.reduce((longest, current) => 
						current.length > longest.length ? current : longest
					);
					return indentInfo.baseIndent + andIndentPattern + trimmedLine;
				}
				
				// 查找最长的相对缩进作为默认
				const longestIndent = indentInfo.relativeIndents.reduce((longest, current) => {
					return current.length > longest.length ? current : longest;
				}, '');
				
				if (longestIndent.length > 0) {
					return indentInfo.baseIndent + longestIndent + trimmedLine;
				}
				
				// 默认2个空格的额外缩进
				return indentInfo.baseIndent + '  ' + trimmedLine;
			}
			
			// 否则只应用基础缩进
			return indentInfo.baseIndent + trimmedLine;
		});
		
		return indentedLines.join('\n');
	}
	
	// 简单缩进情况：应用原始的相对缩进模式
	const indentedLines = lines.map((line, index) => {
		const relativeIndent = indentInfo.relativeIndents[index] || '';
		const trimmedLine = line.trim();
		
		if (trimmedLine.length === 0) {
			// 空行保持为空，不添加缩进
			return '';
		}
		
		// 组合：基础缩进 + 相对缩进 + 内容
		return indentInfo.baseIndent + relativeIndent + trimmedLine;
	});
	
	return indentedLines.join('\n');
}

/**
 * Initialize database connection by selecting the first available connection
 */
async function initializeConnection(): Promise<void> {
	const connections = await loadConnectionsFromConfig();
	if (connections.length > 0 && !currentConnection) {
		// Auto-select the first connection (default in sqls)
		currentConnection = connections[0];
		updateConnectionStatus();
		
		await configureWorkspaceConnection(currentConnection);
	}
}

/**
 * Configure workspace settings for the selected connection
 */
async function configureWorkspaceConnection(connection: DatabaseConnection): Promise<void> {
	try {
		// Update VS Code workspace configuration for sqls
		await vscode.workspace.getConfiguration().update('sqls.connections', [connection], vscode.ConfigurationTarget.Workspace);
	} catch (error) {
		console.warn('Failed to configure workspace connection:', error);
	}
}

/**
 * Load database connections from sqls configuration file
 */
async function loadConnectionsFromConfig(): Promise<DatabaseConnection[]> {
	const configuredConfigPath = getConfig<string>('sqlsugar.sqlsConfigPath', '');
	const resolvedConfigPath = resolveConfigPath(configuredConfigPath);
	
	if (!resolvedConfigPath) {
		return [];
	}

	try {
		const configContent = await fs.promises.readFile(resolvedConfigPath, 'utf8');
		const config = yaml.load(configContent) as ConnectionConfig;
		
		if (config && config.connections) {
			return config.connections;
		}
	} catch (error) {
		console.error('Failed to load sqls configuration:', error);
	}
	
	return [];
}

/**
 * Switch to a specific database connection using sqls native connection switching
 */
async function switchToConnection(connection: DatabaseConnection): Promise<void> {
	currentConnection = connection;
	updateConnectionStatus();
	
	// Configure workspace settings for the selected connection
	await configureWorkspaceConnection(connection);
	
	// Restart client with new connection configuration
	restartSqlsClientWithConnection(connection);
	
	vscode.window.showInformationMessage(`Switched to database connection: ${connection.alias}`);
}

/**
 * Update the status bar to show current connection
 */
function updateConnectionStatus(): void {
	if (!statusBarItem) {
		return;
	}
	
	if (currentConnection) {
		statusBarItem.text = `$(database) ${currentConnection.alias}`;
		statusBarItem.tooltip = `${currentConnection.driver} - ${currentConnection.host || currentConnection.dataSourceName || 'Unknown'}`;
		statusBarItem.show();
	} else {
		statusBarItem.text = '$(database) No Connection';
		statusBarItem.tooltip = 'Click to select database connection';
		statusBarItem.show();
	}
}

/**
 * Restart sqls client with a specific connection configuration
 */
function restartSqlsClientWithConnection(connection: DatabaseConnection): void {
	const sqlsPath = getConfig('sqlsugar.sqlsPath', 'sqls');
	const configuredConfigPath = getConfig<string>('sqlsugar.sqlsConfigPath', '');
	
	const args: string[] = [];
	if (configuredConfigPath) {
		args.push('-config', configuredConfigPath);
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

	// Set up workspace configuration with the selected connection
	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{ scheme: 'file', language: 'sql' },
			{ scheme: 'untitled', language: 'sql' },
			{ scheme: 'file', pattern: '**/*.sql' },
		],
		outputChannelName: 'sqls',
		initializationOptions: {
			sqls: {
				connections: [connection]
			},
			// Disable formatting capabilities to prevent sqls crashes with placeholders
			provideFormatter: false
		},
		synchronize: {
			configurationSection: 'sqls'
		}
	};

		stopExistingClient();

	client = new LanguageClient('sqls', 'SQL Language Server', serverOptions, clientOptions);
	client.start().then(() => {
		vscode.window.setStatusBarMessage('SQLS language server restarted with new connection', 3000);
	}).catch((err) => {
		vscode.window.showErrorMessage(`Failed to restart sqls: ${err?.message ?? err}`);
	});
}

/**
 * 处理终端 SQL 复制命令
 */
async function handleCopyTerminalSQL(): Promise<void> {
	try {
		if (debugMode) {
			console.log('[SQLSugar Debug] 开始处理终端SQL复制命令');
		}
		
		const clipboardManager = ClipboardManager.getInstance();
		let selectedText: string | null = null;
		let sourceType: 'editor' | 'terminal' | 'clipboard' | 'none' = 'none';

		// 首先尝试从编辑器获取选中的文本
		const editor = vscode.window.activeTextEditor;
		if (editor && editor.selection && !editor.selection.isEmpty) {
			selectedText = editor.document.getText(editor.selection);
			sourceType = 'editor';
			if (debugMode) {
				console.log('[SQLSugar Debug] 从编辑器获取选中文本，长度:', selectedText?.length);
			}
		}

		// 如果编辑器没有选中文本，尝试从终端获取
		if (!selectedText) {
			try {
				if (debugMode) {
					console.log('[SQLSugar Debug] 尝试从终端获取选中文本');
				}
				const terminalMonitor = TerminalMonitor.getInstance();
				selectedText = await terminalMonitor.getSelectedText();
				if (selectedText) {
					sourceType = 'terminal';
					if (debugMode) {
						console.log('[SQLSugar Debug] 从终端获取选中文本，长度:', selectedText.length);
					}
				}
			} catch (terminalError) {
				console.warn('Terminal monitor error:', terminalError);
				// 继续执行，不阻止功能使用
			}
		}

		// 如果仍然没有选中文本，显示错误信息
		if (!selectedText) {
			if (debugMode) {
				console.log('[SQLSugar Debug] 没有找到选中文本');
				console.log('[SQLSugar Debug] 尝试检查剪贴板内容作为后备方案...');
			}
			
			// 尝试从剪贴板获取内容作为后备方案
			try {
				const clipboardText = await vscode.env.clipboard.readText();
				if (debugMode) {
					console.log('[SQLSugar Debug] 剪贴板内容长度:', clipboardText.length);
					console.log('[SQLSugar Debug] 剪贴板内容前200字符:', clipboardText.substring(0, 200));
				}
				
				if (clipboardText.trim()) {
					// 检查是否看起来像SQL日志
					const looksLikeSQL = clipboardText.includes('sqlalchemy.engine.Engine') || 
									  clipboardText.includes('SELECT') || 
									  clipboardText.includes('INSERT INTO') ||
									  clipboardText.includes('UPDATE') ||
									  clipboardText.includes('DELETE FROM');
					
					if (looksLikeSQL) {
						if (debugMode) {
							console.log('[SQLSugar Debug] 剪贴板内容看起来像SQL日志，使用剪贴板内容');
						}
						selectedText = clipboardText;
						sourceType = 'clipboard';
					} else {
						if (debugMode) {
							console.log('[SQLSugar Debug] 剪贴板内容不像SQL日志');
						}
						vscode.window.showWarningMessage('No SQL log text selected or detected.', {
							modal: false,
							detail: 'Please select text containing "INFO sqlalchemy.engine.Engine:" followed by SQL statements in the terminal or editor. Clipboard content does not appear to be SQL log.'
						});
						return;
					}
				} else {
					if (debugMode) {
						console.log('[SQLSugar Debug] 剪贴板为空');
					}
					vscode.window.showWarningMessage('No SQL log text selected or detected.', {
						modal: false,
						detail: 'Please select text containing "INFO sqlalchemy.engine.Engine:" followed by SQL statements in the terminal or editor. Clipboard is empty.'
					});
					return;
				}
			} catch (clipboardError) {
				if (debugMode) {
					console.log('[SQLSugar Debug] 剪贴板读取失败:', clipboardError);
				}
				vscode.window.showWarningMessage('No SQL log text selected or detected.', {
					modal: false,
					detail: 'Please select text containing "INFO sqlalchemy.engine.Engine:" followed by SQL statements in the terminal or editor. Could not access clipboard.'
				});
				return;
			}
		}

		// 解析 SQL 日志
		if (debugMode) {
			console.log('[SQLSugar Debug] 开始解析SQL日志，文本长度:', selectedText.length);
			console.log('[SQLSugar Debug] 选中的文本前200字符:', selectedText.substring(0, 200));
		}
		
		const parsedSQL = SQLLogParser.processSelectedText(selectedText);
		if (!parsedSQL) {
			if (debugMode) {
				console.log('[SQLSugar Debug] SQL解析失败，没有找到有效的SQL语句');
			}
			vscode.window.showWarningMessage('No valid SQL statement found in the selected text. Please select SQLAlchemy log output with SQL statements.', {
				modal: false,
				detail: 'Expected format: "INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = ?" followed by parameter values.'
			});
			return;
		}

		// 检查选择是否为空
		if (!selectedText.trim()) {
			if (debugMode) {
				console.log('[SQLSugar Debug] 选中的文本为空');
			}
			vscode.window.showWarningMessage('Selected text is empty. Please select SQLAlchemy log output in the terminal or editor.');
			return;
		}

		if (debugMode) {
			console.log('[SQLSugar Debug] SQL解析成功:');
			console.log('[SQLSugar Debug] - 原始SQL:', parsedSQL.originalSQL);
			console.log('[SQLSugar Debug] - 注入SQL:', parsedSQL.injectedSQL);
			console.log('[SQLSugar Debug] - 占位符类型:', parsedSQL.placeholderType);
			console.log('[SQLSugar Debug] - 参数数量:', parsedSQL.parameters.length);
			console.log('[SQLSugar Debug] - 参数:', parsedSQL.parameters);
		}

		// 如果没有参数需要注入，直接复制原始 SQL
		if (parsedSQL.placeholderType === 'none' || parsedSQL.parameters.length === 0) {
			if (debugMode) {
				console.log('[SQLSugar Debug] 没有参数需要注入，直接复制原始SQL');
			}
			// Try wl-copy first on Linux (user request)
			let success = false;
			if (process.platform === 'linux') {
				success = await clipboardManager.copyWithWlCopy(parsedSQL.originalSQL);
			}
			
			// Fall back to normal copy method if wl-copy fails
			if (!success) {
				success = await clipboardManager.copyText(parsedSQL.originalSQL);
			}
			if (success) {
				const sourceMsg = sourceType === 'editor' ? ' (from editor)' : ' (from terminal)';
				vscode.window.showInformationMessage(`SQL statement copied to clipboard${sourceMsg} (no parameters to inject).`, {
					modal: false
				});
			} else {
				if (debugMode) {
					console.log('[SQLSugar Debug] 复制到剪贴板失败');
				}
				vscode.window.showErrorMessage('Failed to copy SQL to clipboard. Please check your clipboard permissions.', {
					modal: false
				});
			}
			return;
		}

		// 复制注入参数后的 SQL - 优先使用 wl-copy
		let success = false;
		if (process.platform === 'linux') {
			success = await clipboardManager.copyWithWlCopy(parsedSQL.injectedSQL);
		}
		
		// 如果 wl-copy 失败，回退到正常复制方法
		if (!success) {
			success = await clipboardManager.copyText(parsedSQL.injectedSQL);
		}
		if (success) {
			const sourceMsg = sourceType === 'editor' ? ' (from editor)' : ' (from terminal)';
			const message = `SQL with ${parsedSQL.parameters.length} parameter(s) injected copied to clipboard${sourceMsg}.`;

			// 添加查看详细信息的选项
			if (getConfig('sqlsugar.showSQLPreview', false)) {
				const preview = `Original: ${parsedSQL.originalSQL}\nInjected: ${parsedSQL.injectedSQL}`;
				vscode.window.showInformationMessage(message, {
					modal: false,
					detail: preview
				});
			} else {
				vscode.window.showInformationMessage(message, {
					modal: false
				});
			}
		} else {
			// 提供剪贴板故障排除信息
			const clipboardInfo = await clipboardManager.getClipboardInfo();
			let detail = 'Failed to copy SQL to clipboard.';

			if (!clipboardInfo.nativeAPI && clipboardInfo.availableCommands.length === 0) {
				detail += ' No clipboard commands available. Please install clipboard tools (xclip, wl-copy, or xsel for Linux; pbcopy for macOS; clip for Windows).';
			} else if (!clipboardInfo.nativeAPI) {
				detail += ` Using fallback command: ${clipboardInfo.availableCommands[0] || 'unknown'}.`;
			}

			vscode.window.showErrorMessage(detail, {
				modal: false
			});
		}
	} catch (error) {
		console.error('Error in handleCopyTerminalSQL:', error);

		// 提供更详细的错误信息
		let errorMessage = 'An error occurred while processing SQL.';
		if (error instanceof Error) {
			if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
				errorMessage += ' Required command not found. Please ensure clipboard tools are installed.';
			} else if (error.message.includes('permission') || error.message.includes('denied')) {
				errorMessage += ' Permission denied. Please check clipboard access permissions.';
			} else {
				errorMessage += ' ' + error.message;
			}
		} else {
			errorMessage += ' Unknown error occurred.';
		}

		vscode.window.showErrorMessage(errorMessage, {
			modal: false
		});
	}
}

/**
 * 处理生成测试日志命令
 */
async function handleGenerateTestLogs(): Promise<void> {
	try {
		const debugScriptPath = path.join(extensionContext.extensionPath, 'debug', 'generate_sqlalchemy_logs.py');

		// 检查脚本文件是否存在
		if (!fs.existsSync(debugScriptPath)) {
			vscode.window.showErrorMessage('Debug script not found. Please ensure the extension is properly installed.');
			return;
		}

		// 检查 uv 是否可用
		const { exec } = require('child_process');
		const { promisify } = require('util');
		const execAsync = promisify(exec);

		try {
			await execAsync('uv --version');
		} catch (error) {
			vscode.window.showErrorMessage(
				'uv is not installed. Please install uv first:\n\n' +
				'curl -LsSf https://astral.sh/uv/install.sh | sh',
				{ modal: false }
			);
			return;
		}

		// 检查是否有正在运行的终端
		let terminal = vscode.window.activeTerminal;
		if (!terminal) {
			terminal = vscode.window.createTerminal('SQLAlchemy Log Generator');
		}

		// 激活终端并运行脚本
		terminal.show();
		terminal.sendText(`cd "${extensionContext.extensionPath}"`);

		const message = 'Generating SQLAlchemy test logs...\n\n' +
			'This will run a comprehensive test script that demonstrates:\n' +
			'• Basic CRUD operations with various parameter types\n' +
			'• Complex JOIN queries with multiple tables\n' +
			'• Aggregate functions and grouping\n' +
			'• Window functions and CTEs\n' +
			'• JSON operations and advanced features\n' +
			'• Different parameter formats (question marks, named params)\n' +
			'• Error scenarios and edge cases\n\n' +
			'The generated logs will appear in this terminal and can be used\n' +
			'to test the "Copy SQL (Injected)" feature.\n\n' +
			'Press Enter to continue...';

		vscode.window.showInformationMessage(message, { modal: true });

		// 运行脚本
		terminal.sendText(`uv run debug/generate_sqlalchemy_logs.py`);

	} catch (error) {
		console.error('Error in handleGenerateTestLogs:', error);
		vscode.window.showErrorMessage(
			'Failed to generate test logs: ' + (error instanceof Error ? error.message : String(error)),
			{ modal: false }
		);
	}
}

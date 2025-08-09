// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LanguageClient, LanguageClientOptions, Executable, ServerOptions } from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('sqlsugar activated');

	const disposables: vscode.Disposable[] = [];

	// Core command: Edit Inline SQL
	const editInlineSQL = vscode.commands.registerCommand('sqlsugar.editInlineSQL', async () => {
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

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const baseDir = workspaceFolder?.uri.fsPath ?? context.globalStorageUri.fsPath;
		const tempRoot = path.join(baseDir, '.vscode', 'sqlsugar', 'temp');
		await fs.promises.mkdir(tempRoot, { recursive: true });

		const timestamp = Date.now();
		const hash = simpleHash(unquoted).toString(16);
		const tempFileName = `temp_sql_${timestamp}_${hash}.sql`;
		const tempFilePath = path.join(tempRoot, tempFileName);

		await fs.promises.writeFile(tempFilePath, unquoted, 'utf8');

		const tempDocPath = tempFilePath;
		let tempDoc = await vscode.workspace.openTextDocument(tempDocPath);
		if (tempDoc.languageId !== 'sql') {
			try {
				tempDoc = await vscode.languages.setTextDocumentLanguage(tempDoc, 'sql');
			} catch {}
		}
		await vscode.window.showTextDocument(tempDoc, {
			preview: false,
			viewColumn: vscode.ViewColumn.Beside
		});

		// On save of temp file, write back to original
		const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (doc) => {
			if (doc.uri.fsPath !== tempFilePath) { return; }
			const newSQL = doc.getText();
			await replaceSelection(editor, selection, wrapLike(raw, newSQL));

			vscode.window.showInformationMessage('Inline SQL updated.');

			// cleanup behavior: delete on save only when cleanupOnClose is false
			const shouldCleanup = getConfig('sqlsugar.tempFileCleanup', true);
			const cleanupOnClose = getConfig('sqlsugar.cleanupOnClose', true);
			if (shouldCleanup && !cleanupOnClose) {
				try { await fs.promises.unlink(tempFilePath); } catch {}
			}
		});

		// when configured, cleanup temp file on editor close instead of save
		const closeDisposable = vscode.workspace.onDidCloseTextDocument(async (doc) => {
			if (doc.uri.fsPath !== tempFilePath) { return; }
			const shouldCleanup = getConfig('sqlsugar.tempFileCleanup', true);
			const cleanupOnClose = getConfig('sqlsugar.cleanupOnClose', true);
			if (shouldCleanup && cleanupOnClose) {
				try { await fs.promises.unlink(tempFilePath); } catch {}
			}
		});

		disposables.push(saveDisposable);
		disposables.push(closeDisposable);
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
		try { disposables.pop()?.dispose(); } catch {}
	}
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
		try { client.stop(); } catch {}
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
	await editor.edit(editBuilder => {
		editBuilder.replace(sel, newText);
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

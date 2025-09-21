import * as vscode from 'vscode';
import * as path from 'path';
import { SQLLogParser } from '../sql-log-parser';
import { TerminalMonitor } from '../terminal-monitor';
import { ClipboardManager } from '../clipboard-manager';
import { Jinja2NunjucksHandler } from '../jinja2-nunjucks-handler';
import { Jinja2WebviewEditor } from '../jinja2-webview';

/**
 * SQLSugar命令管理器
 * 统一管理所有扩展命令
 */
export class CommandManager {
    private context: vscode.ExtensionContext;
    private terminalMonitor: TerminalMonitor;
    private clipboardManager: ClipboardManager;
    private jinja2Handler: Jinja2NunjucksHandler;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.terminalMonitor = TerminalMonitor.getInstance();
        this.clipboardManager = ClipboardManager.getInstance();
        this.jinja2Handler = Jinja2NunjucksHandler.getInstance();
    }

    /**
     * 注册所有命令
     */
    public registerCommands(): void {
        const commands = [
            { name: 'editInlineSQL', callback: this.handleEditInlineSQL.bind(this) },
            { name: 'switchConnection', callback: this.handleSwitchConnection.bind(this) },
            { name: 'copyTerminalSQL', callback: this.handleCopyTerminalSQL.bind(this) },
            { name: 'copyJinja2Template', callback: this.handleCopyJinja2Template.bind(this) },
            { name: '_devGetMetrics', callback: this.handleGetMetrics.bind(this) },
            { name: 'toggleDebugMode', callback: this.handleToggleDebugMode.bind(this) },
            { name: 'generateTestLogs', callback: this.handleGenerateTestLogs.bind(this) },
            { name: 'testClipboard', callback: this.handleTestClipboard.bind(this) },
            { name: 'copyJinja2TemplateQuick', callback: this.handleCopyJinja2TemplateQuick.bind(this) },
            { name: 'copyJinja2TemplateWizard', callback: this.handleCopyJinja2TemplateWizard.bind(this) },
            { name: 'copyJinja2TemplateWebview', callback: this.handleCopyJinja2TemplateWebview.bind(this) },
            { name: 'copyJinja2TemplateDefaults', callback: this.handleCopyJinja2TemplateDefaults.bind(this) }
        ];

        commands.forEach(({ name, callback }) => {
            this.context.subscriptions.push(
                vscode.commands.registerCommand(`sqlsugar.${name}`, callback)
            );
        });
    }

    /**
     * 处理内联SQL编辑命令
     */
    private async handleEditInlineSQL(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showInformationMessage('Please select SQL text to edit');
            return;
        }

        try {
            // 获取语言处理器检查SQL
            const { LanguageHandler } = require('../core/language-handler');
            const languageHandler = new LanguageHandler();

            if (!languageHandler.looksLikeSQL(selectedText)) {
                const confirm = await vscode.window.showWarningMessage(
                    'Selected text may not be SQL. Continue?',
                    { modal: true },
                    'Continue',
                    'Cancel'
                );
                if (confirm !== 'Continue') { return; }
            }

            // 获取扩展核心实例并创建临时文件
            const { ExtensionCore } = require('./extension-core');
            const extensionCore = ExtensionCore.getInstance(this.context);
            const tempUri = await extensionCore.createTempSQLFile(editor, selection, selectedText);

            // 打开临时文件
            const doc = await vscode.workspace.openTextDocument(tempUri);
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

            vscode.window.showInformationMessage('SQL file created. Use Ctrl+S to sync changes back.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to edit inline SQL: ${error}`);
        }
    }

    /**
     * 处理数据库连接切换命令
     */
    private async handleSwitchConnection(): Promise<void> {
        try {
            // 获取SQLs客户端管理器
            const { ExtensionCore } = require('./extension-core');
            const extensionCore = ExtensionCore.getInstance(this.context);
            const sqlsClientManager = extensionCore.getSQLsClientManager();

            // 显示连接选择器
            await sqlsClientManager.showConnectionPicker();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to switch connection: ${error}`);
        }
    }

    /**
     * 处理复制终端SQL命令
     * 根据上下文处理编辑器选中的文本或终端选中的文本
     */
    private async handleCopyTerminalSQL(): Promise<void> {
        try {
            let selectedText: string | null = null;
            let sourceType: 'editor' | 'terminal' = 'terminal';

            // 检查是否在编辑器上下文中
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && !activeEditor.selection.isEmpty) {
                // 在编辑器上下文中，直接获取选中的文本
                const selection = activeEditor.selection;
                selectedText = activeEditor.document.getText(selection);
                sourceType = 'editor';
            } else {
                // 在终端上下文中，从终端获取选中的文本
                selectedText = await this.terminalMonitor.getSelectedText();
            }

            if (!selectedText) {
                const message = sourceType === 'editor'
                    ? 'No text selected in editor'
                    : 'No terminal text selected';
                vscode.window.showInformationMessage(message);
                return;
            }

            const result = SQLLogParser.processSelectedText(selectedText);
            if (result && result.injectedSQL) {
                await this.clipboardManager.copyText(result.injectedSQL);
                const message = sourceType === 'editor'
                    ? 'SQL copied to clipboard with injected parameters (from editor)'
                    : 'SQL copied to clipboard with injected parameters (from terminal)';
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showErrorMessage('Failed to process SQL');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to copy SQL: ${error}`);
        }
    }

    /**
     * 处理Jinja2模板复制命令
     */
    private async handleCopyJinja2Template(): Promise<void> {
        try {
            await Jinja2NunjucksHandler.handleCopyJinja2Template();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error}`);
        }
    }

    /**
     * 快速处理Jinja2模板
     */
    private async handleCopyJinja2TemplateQuick(): Promise<void> {
        try {
            await Jinja2NunjucksHandler.handleCopyJinja2Template('quick');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error}`);
        }
    }

    /**
     * 向导式处理Jinja2模板
     */
    private async handleCopyJinja2TemplateWizard(): Promise<void> {
        try {
            await Jinja2NunjucksHandler.handleCopyJinja2Template('wizard');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error}`);
        }
    }

    /**
     * WebView处理Jinja2模板
     */
    private async handleCopyJinja2TemplateWebview(): Promise<void> {
        try {
            await Jinja2NunjucksHandler.handleCopyJinja2Template('webview');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error}`);
        }
    }

    /**
     * 默认值处理Jinja2模板
     */
    private async handleCopyJinja2TemplateDefaults(): Promise<void> {
        try {
            await Jinja2NunjucksHandler.handleCopyJinja2Template('defaults');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${error}`);
        }
    }

    /**
     * 获取开发指标
     */
    private async handleGetMetrics(): Promise<void> {
        try {
            // 获取扩展核心实例和指标
            const { ExtensionCore } = require('./extension-core');
            const extensionCore = ExtensionCore.getInstance(this.context);
            const metrics = extensionCore.getMetrics();

            vscode.window.showInformationMessage(
                `SQLSugar Dev Metrics:\n` +
                `• Active Disposables: ${metrics.activeDisposables}\n` +
                `• Active Temp Files: ${metrics.activeTempFiles}\n` +
                `• Total Commands: ${metrics.totalCommandInvocations}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get metrics: ${error}`);
        }
    }

    /**
     * 切换调试模式
     */
    private async handleToggleDebugMode(): Promise<void> {
        try {
            // TODO: 实现调试模式切换逻辑
            vscode.window.showInformationMessage('Debug mode toggle feature coming soon');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to toggle debug mode: ${error}`);
        }
    }

    /**
     * 生成测试日志
     */
    private async handleGenerateTestLogs(): Promise<void> {
        try {
            // 获取Python脚本路径 - 使用多种可能的路径
            const possiblePaths = [
                path.join(this.context.extensionPath, 'artifacts', 'scripts', 'generate_sqlalchemy_logs.py'),
                path.join(this.context.extensionPath, 'debug', 'generate_sqlalchemy_logs.py'),
                path.join(this.context.extensionPath, 'dist', 'artifacts', 'scripts', 'generate_sqlalchemy_logs.py'),
                path.join(this.context.extensionPath, 'dist', 'debug', 'generate_sqlalchemy_logs.py'),
                path.join(process.cwd(), 'artifacts', 'scripts', 'generate_sqlalchemy_logs.py'),
                path.join(process.cwd(), 'debug', 'generate_sqlalchemy_logs.py')
            ];

            const fs = require('fs');
            let scriptPath = null;
            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    scriptPath = possiblePath;
                    break;
                }
            }

            if (!scriptPath) {
                vscode.window.showErrorMessage('Test log generation script not found. Please ensure the extension is properly built.');
                return;
            }

            // 获取当前活动终端或创建新终端
            let terminal = vscode.window.activeTerminal;
            if (!terminal) {
                // 如果没有活动终端，创建一个新终端
                terminal = vscode.window.createTerminal('SQLAlchemy Test Logs');
                vscode.window.showInformationMessage('Created new terminal for test log generation');
            }

            // 确保终端可见并获取焦点
            terminal.show(true); // true 表示获取焦点

            // 等待一小段时间确保终端准备好接收命令
            await new Promise(resolve => setTimeout(resolve, 500));

            // 在终端中运行Python脚本 - 使用uv或python3
            const command = process.platform === 'win32' ?
                `uv run "${scriptPath}" || python "${scriptPath}"` :
                `uv run "${scriptPath}" || python3 "${scriptPath}"`;

            // 发送命令到终端
            terminal.sendText(command);

            vscode.window.showInformationMessage('SQLAlchemy test log generation started in terminal. Please wait for completion...');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate test logs: ${error}`);
        }
    }

    /**
     * 测试剪贴板功能
     */
    private async handleTestClipboard(): Promise<void> {
        try {
            // TODO: 实现剪贴板测试功能
            vscode.window.showInformationMessage('Clipboard test feature coming soon');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to test clipboard: ${error}`);
        }
    }
}
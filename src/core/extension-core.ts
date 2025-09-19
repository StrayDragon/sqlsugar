import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { LanguageHandler, LanguageType, QuoteType } from './language-handler';
import { SQLsClientManager, DatabaseConnection } from './sqls-client-manager';
import { CommandManager } from './command-manager';
import { IndentationPatternAnalyzer } from '../indentationAnalyzer';

/**
 * 临时文件信息接口
 */
interface TempFileInfo {
    uri: vscode.Uri;
    originalEditor: vscode.TextEditor;
    originalSelection: vscode.Selection;
    originalQuotedSQL: string;
    quoteType: QuoteType;
    language: LanguageType;
    disposables: vscode.Disposable[];
    isProcessing: boolean;
}

/**
 * 开发指标接口
 */
interface DevMetrics {
    activeDisposables: number;
    activeTempFiles: number;
    totalCommandInvocations: number;
}

/**
 * SQLSugar核心扩展管理器
 * 协调整个扩展的功能和生命周期
 */
export class ExtensionCore {
    private static instance: ExtensionCore;
    private context: vscode.ExtensionContext;
    private languageHandler: LanguageHandler;
    private sqlsClientManager: SQLsClientManager;
    private commandManager: CommandManager;
    private indentationAnalyzer: IndentationPatternAnalyzer;

    // 临时文件管理
    private tempFiles: Map<string, TempFileInfo> = new Map();
    private devMetrics: DevMetrics;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.languageHandler = new LanguageHandler();
        this.sqlsClientManager = new SQLsClientManager(context);
        this.commandManager = new CommandManager(context);
        this.indentationAnalyzer = new IndentationPatternAnalyzer();

        this.devMetrics = {
            activeDisposables: 0,
            activeTempFiles: 0,
            totalCommandInvocations: 0
        };

        this.initialize();
    }

    /**
     * 获取单例实例
     */
    public static getInstance(context: vscode.ExtensionContext): ExtensionCore {
        if (!ExtensionCore.instance) {
            ExtensionCore.instance = new ExtensionCore(context);
        }
        return ExtensionCore.instance;
    }

    /**
     * 初始化扩展
     */
    private initialize(): void {
        // 注册所有命令
        this.commandManager.registerCommands();

        // 启动SQLs客户端
        this.sqlsClientManager.startClient().catch(error => {
            console.error('Failed to start SQLs client:', error);
        });

        // 初始化数据库连接
        this.sqlsClientManager.initializeConnection().catch(error => {
            console.error('Failed to initialize connection:', error);
        });

        // 注册事件监听器
        this.registerEventListeners();

        // 注册开发者命令
        this.registerDeveloperCommands();
    }

    /**
     * 注册事件监听器
     */
    private registerEventListeners(): void {
        // 监听文档关闭事件，清理临时文件
        this.context.subscriptions.push(
            vscode.workspace.onDidCloseTextDocument((doc) => {
                this.cleanupTempFile(doc.uri);
            })
        );

        // 监听窗口关闭事件
        this.context.subscriptions.push(
            vscode.window.onDidCloseTerminal((terminal) => {
                // 清理与终端相关的资源
            })
        );
    }

    /**
     * 注册开发者命令
     */
    private registerDeveloperCommands(): void {
        // 获取指标命令已在CommandManager中注册
    }

    /**
     * 创建临时SQL文件
     */
    public async createTempSQLFile(
        originalEditor: vscode.TextEditor,
        originalSelection: vscode.Selection,
        originalQuotedSQL: string
    ): Promise<vscode.Uri> {
        const language = this.languageHandler.detectLanguage(originalEditor.document);
        const quoteType = this.languageHandler.detectQuoteType(originalQuotedSQL);
        const sqlContent = this.languageHandler.stripQuotes(originalQuotedSQL);

        // 转换ORM占位符为sqls兼容格式
        const { convertedSQL, hasPlaceholders } = this.convertPlaceholdersToTemp(sqlContent);

        // 创建临时文件
        const tempDir = path.join(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', '.vscode/sqlsugar/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const tempFileName = `sql-${Date.now()}.sql`;
        const tempFilePath = path.join(tempDir, tempFileName);
        const tempUri = vscode.Uri.file(tempFilePath);

        // 写入临时文件内容
        const fileContent = this.generateTempFileContent(convertedSQL, hasPlaceholders);
        await vscode.workspace.fs.writeFile(tempUri, Buffer.from(fileContent, 'utf8'));

        // 保存临时文件信息
        const tempFileInfo: TempFileInfo = {
            uri: tempUri,
            originalEditor,
            originalSelection,
            originalQuotedSQL,
            quoteType,
            language,
            disposables: [],
            isProcessing: false
        };

        this.tempFiles.set(tempUri.fsPath, tempFileInfo);
        this.devMetrics.activeTempFiles++;

        // 注册临时文件变化监听器
        const disposable = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.fsPath === tempUri.fsPath) {
                this.handleTempFileChange(tempFileInfo);
            }
        });

        tempFileInfo.disposables.push(disposable);

        return tempUri;
    }

    /**
     * 生成临时文件内容
     */
    private generateTempFileContent(sql: string, hasPlaceholders: boolean): string {
        let content = sql;

        // 添加占位符说明
        if (hasPlaceholders) {
            content += '\n\n-- This SQL contains placeholders (__) that will be converted back to :param format when saved\n';
        }

        // 添加使用说明
        content += '\n-- Use Ctrl+S to save and sync changes back to original code\n';
        content += '-- Use Ctrl+W to close this temporary file\n';

        return content;
    }

    /**
     * 处理临时文件变化
     */
    private async handleTempFileChange(tempFileInfo: TempFileInfo): Promise<void> {
        if (tempFileInfo.isProcessing) {
            return;
        }

        tempFileInfo.isProcessing = true;

        try {
            const doc = await vscode.workspace.openTextDocument(tempFileInfo.uri);
            const modifiedSQL = doc.getText();

            // 转换回ORM占位符格式
            const finalSQL = this.convertPlaceholdersFromTemp(modifiedSQL);

            // 应用缩进（针对Python）- 简化版本
            tempFileInfo.originalEditor.edit(editBuilder => {
                editBuilder.replace(tempFileInfo.originalSelection, finalSQL);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to sync changes: ${error}`);
        } finally {
            tempFileInfo.isProcessing = false;
        }
    }

    /**
     * 转换ORM占位符为临时格式
     */
    private convertPlaceholdersToTemp(sql: string): { convertedSQL: string; hasPlaceholders: boolean } {
        const placeholderRegex = /:(\w+)/g;
        let hasPlaceholders = false;
        let convertedSQL = sql;

        if (placeholderRegex.test(sql)) {
            hasPlaceholders = true;
            convertedSQL = sql.replace(placeholderRegex, '__:$1');
        }

        return { convertedSQL, hasPlaceholders };
    }

    /**
     * 转换临时占位符回ORM格式
     */
    private convertPlaceholdersFromTemp(sql: string): string {
        const tempPlaceholderRegex = /__:(\w+)/g;
        return sql.replace(tempPlaceholderRegex, ':$1');
    }

    /**
     * 清理临时文件
     */
    private cleanupTempFile(uri: vscode.Uri): void {
        const tempInfo = this.tempFiles.get(uri.fsPath);
        if (tempInfo) {
            // 清理所有disposables
            tempInfo.disposables.forEach(d => d.dispose());
            this.tempFiles.delete(uri.fsPath);
            this.devMetrics.activeTempFiles--;

            // 删除临时文件
            const cleanupSetting = vscode.workspace.getConfiguration('sqlsugar').get<string>('cleanupOnClose', 'onClose');
            if (cleanupSetting === 'onClose') {
                vscode.workspace.fs.delete(uri).then(undefined, err => {
                    console.error('Failed to delete temp file:', err);
                });
            }
        }
    }

    /**
     * 获取开发指标
     */
    public getMetrics(): DevMetrics {
        return { ...this.devMetrics };
    }

    /**
     * 销毁扩展资源
     */
    public dispose(): void {
        // 清理临时文件
        this.tempFiles.forEach((tempInfo, path) => {
            tempInfo.disposables.forEach(d => d.dispose());
            try {
                vscode.workspace.fs.delete(vscode.Uri.file(path));
            } catch (error) {
                console.error('Failed to delete temp file:', error);
            }
        });

        this.tempFiles.clear();

        // 清理其他资源
        this.sqlsClientManager.dispose();

        // 更新指标
        this.devMetrics.activeDisposables = 0;
        this.devMetrics.activeTempFiles = 0;
    }

    // 公共访问方法
    public getLanguageHandler(): LanguageHandler {
        return this.languageHandler;
    }

    public getSQLsClientManager(): SQLsClientManager {
        return this.sqlsClientManager;
    }

    public getCommandManager(): CommandManager {
        return this.commandManager;
    }
}
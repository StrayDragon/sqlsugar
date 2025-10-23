import * as vscode from 'vscode';

import { LanguageHandler } from '../core/language-handler';
import { Jinja2NunjucksHandler } from '../jinja2-nunjucks-handler';
import { ExtensionCore } from './extension-core';
import { Logger } from './logger';

/**
 * SQLSugar命令管理器
 * 统一管理所有扩展命令
 */
export class CommandManager {
  private context: vscode.ExtensionContext;
  private jinja2Handler: Jinja2NunjucksHandler;
  private extensionCore: ExtensionCore;

  constructor(context: vscode.ExtensionContext, extensionCore?: ExtensionCore) {
    this.context = context;
    this.jinja2Handler = Jinja2NunjucksHandler.getInstance();
    this.extensionCore = extensionCore || ExtensionCore.getInstance(context);
  }

  /**
   * 验证基本的前置条件
   */
  private validateCommandPrerequisites(): { valid: boolean; editor?: vscode.TextEditor; error?: string } {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return { valid: false, error: 'No active editor found' };
    }

    if (editor.document.isClosed) {
      return { valid: false, error: 'Active editor document is closed' };
    }

    return { valid: true, editor };
  }

  /**
   * 验证选中的文本
   */
  private validateSelection(editor: vscode.TextEditor): { valid: boolean; selection?: vscode.Selection; selectedText?: string; error?: string } {
    const selection = editor.selection;
    if (!selection) {
      return { valid: false, error: 'No selection found' };
    }

    if (selection.isEmpty) {
      return { valid: false, error: 'No text selected' };
    }

    const selectedText = editor.document.getText(selection);
    if (!selectedText || selectedText.trim().length === 0) {
      return { valid: false, error: 'Selected text is empty' };
    }

    return { valid: true, selection, selectedText };
  }

  /**
   * 安全执行命令函数
   */
  private async safeExecuteCommand<T>(
    commandName: string,
    operation: () => Promise<T>,
    errorMessage: string = `Failed to execute ${commandName}`
  ): Promise<void> {
    try {
      this.extensionCore.recordCommandInvocation(commandName);
      Logger.debug(`Executing command: ${commandName}`);
      await operation();
    } catch (error) {
      Logger.error(`Error in ${commandName}:`, error);
      const userMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`${errorMessage}: ${userMessage}`);
    }
  }

  /**
   * 注册所有命令
   */
  public registerCommands(): void {
    const commands = [
      { name: 'editInlineSQL', callback: this.handleEditInlineSQL.bind(this) },
      { name: 'copyJinja2Template', callback: this.handleCopyJinja2Template.bind(this) },
      { name: '_devGetMetrics', callback: this.handleGetMetrics.bind(this) },
      { name: 'toggleDebugMode', callback: this.handleToggleDebugMode.bind(this) },
      { name: 'copyJinja2TemplateQuick', callback: this.handleCopyJinja2TemplateQuick.bind(this) },
      {
        name: 'copyJinja2TemplateWebviewV2',
        callback: this.handleCopyJinja2TemplateWebviewV2.bind(this),
      },
    ];

    // 验证命令配置
    const validationResult = this.validateCommandConfiguration(commands);
    if (!validationResult.valid) {
      throw new Error(`Command validation failed: ${validationResult.error}`);
    }

    // 注册命令
    commands.forEach(({ name, callback }) => {
      this.registerSingleCommand(name, () => {
        Promise.resolve(callback()).catch(err => {
          Logger.error(`Command ${name} failed:`, err);
        });
      });
    });
  }

  /**
   * 验证命令配置
   */
  private validateCommandConfiguration(commands: Array<{ name: string; callback: () => void }>): { valid: boolean; error?: string } {
    if (!Array.isArray(commands)) {
      return { valid: false, error: 'Commands must be an array' };
    }

    if (commands.length === 0) {
      return { valid: false, error: 'No commands to register' };
    }

    const commandNames = new Set<string>();
    for (const command of commands) {
      if (!command.name || typeof command.name !== 'string') {
        return { valid: false, error: 'Command name must be a non-empty string' };
      }

      if (commandNames.has(command.name)) {
        return { valid: false, error: `Duplicate command name: ${command.name}` };
      }

      if (!command.callback || typeof command.callback !== 'function') {
        return { valid: false, error: `Command callback must be a function for: ${command.name}` };
      }

      commandNames.add(command.name);
    }

    return { valid: true };
  }

  /**
   * 注册单个命令
   */
  private registerSingleCommand(name: string, callback: () => void): void {
    try {
      this.context.subscriptions.push(
        vscode.commands.registerCommand(`sqlsugar.${name}`, callback)
      );
      Logger.debug(`Command registered: sqlsugar.${name}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        Logger.warn(`Command sqlsugar.${name} already registered, skipping`);
      } else {
        Logger.error(`Failed to register command sqlsugar.${name}:`, error);
        throw error;
      }
    }
  }

  /**
   * 处理内联SQL编辑命令
   */
  private async handleEditInlineSQL(): Promise<void> {
    await this.safeExecuteCommand('editInlineSQL', async () => {
      // 验证前置条件
      const prerequisites = this.validateCommandPrerequisites();
      if (!prerequisites.valid || !prerequisites.editor) {
        throw new Error(prerequisites.error || 'Failed to validate prerequisites');
      }

      const editor = prerequisites.editor;

      // 验证选中文本
      const selectionValidation = this.validateSelection(editor);
      if (!selectionValidation.valid || !selectionValidation.selection || !selectionValidation.selectedText) {
        vscode.window.showInformationMessage('Please select SQL text to edit');
        return;
      }

      const { selection, selectedText } = selectionValidation;

      // 验证是否为SQL
      const languageHandler = new LanguageHandler();
      if (!languageHandler.looksLikeSQL(selectedText)) {
        const confirm = await vscode.window.showWarningMessage(
          'Selected text may not be SQL. Continue?',
          { modal: true },
          'Continue',
          'Cancel'
        );
        if (confirm !== 'Continue') {
          return;
        }
      }

      // 创建临时文件
      const result = await this.extensionCore.createTempSQLFile(editor, selection, selectedText);
      if (!result.ok) {
        throw result.error;
      }

      const tempUri = result.value;
      if (!tempUri) {
        throw new Error('Failed to create temporary file - no URI returned');
      }

      // 打开临时文件
      const doc = await vscode.workspace.openTextDocument(tempUri);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    }, 'Failed to edit inline SQL');
  }

  /**
   * 处理Jinja2模板复制命令
   */
  private async handleCopyJinja2Template(): Promise<void> {
    await this.safeExecuteCommand('copyJinja2Template', async () => {
      await Jinja2NunjucksHandler.handleCopyJinja2Template();
    }, 'Failed to process Jinja2 template');
  }

  /**
   * 快速处理Jinja2模板
   */
  private async handleCopyJinja2TemplateQuick(): Promise<void> {
    await this.safeExecuteCommand('copyJinja2TemplateQuick', async () => {
      await Jinja2NunjucksHandler.handleCopyJinja2Template('quick');
    }, 'Failed to process Jinja2 template');
  }

  /**
   * WebView V2处理Jinja2模板
   */
  private async handleCopyJinja2TemplateWebviewV2(): Promise<void> {
    await this.safeExecuteCommand('copyJinja2TemplateWebviewV2', async () => {
      await Jinja2NunjucksHandler.handleCopyJinja2Template('webviewV2');
    }, 'Failed to process Jinja2 template with V2 editor');
  }

  /**
   * 获取开发指标
   */
  private async handleGetMetrics(): Promise<void> {
    await this.safeExecuteCommand('_devGetMetrics', async () => {
      const extensionCore = ExtensionCore.getInstance(this.context);
      const metrics = extensionCore.getMetrics();

      vscode.window.showInformationMessage(
        'SQLSugar Dev Metrics:\n' +
          `• Active Disposables: ${metrics.activeDisposables}\n` +
          `• Active Temp Files: ${metrics.activeTempFiles}\n` +
          `• Total Commands: ${metrics.totalCommandInvocations}`
      );
    }, 'Failed to get metrics');
  }

  /**
   * 切换调试模式
   */
  private async handleToggleDebugMode(): Promise<void> {
    await this.safeExecuteCommand('toggleDebugMode', async () => {
      vscode.window.showInformationMessage('Debug mode toggle feature coming soon');
    }, 'Failed to toggle debug mode');
  }
}

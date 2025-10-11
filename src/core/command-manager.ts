import * as vscode from 'vscode';

import { LanguageHandler } from '../core/language-handler';
import { Jinja2NunjucksHandler } from '../jinja2-nunjucks-handler';
import { ExtensionCore } from './extension-core';

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
        name: 'copyJinja2TemplateWizard',
        callback: this.handleCopyJinja2TemplateWizard.bind(this),
      },
      {
        name: 'copyJinja2TemplateWebview',
        callback: this.handleCopyJinja2TemplateWebview.bind(this),
      },
      {
        name: 'copyJinja2TemplateDefaults',
        callback: this.handleCopyJinja2TemplateDefaults.bind(this),
      },
    ];

    commands.forEach(({ name, callback }) => {
      try {
        this.context.subscriptions.push(
          vscode.commands.registerCommand(`sqlsugar.${name}`, callback.bind(this))
        );
      } catch (error) {

        if (error instanceof Error && error.message.includes('already exists')) {
          console.warn(`Command sqlsugar.${name} already registered, skipping`);
        } else {
          throw error;
        }
      }
    });
  }

  /**
   * 处理内联SQL编辑命令
   */
  private async handleEditInlineSQL(): Promise<void> {
    this.extensionCore.recordCommandInvocation('editInlineSQL');
    console.log('handleEditInlineSQL called');
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      console.log('No active editor found');
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText) {
      console.log('No selected text');
      vscode.window.showInformationMessage('Please select SQL text to edit');
      return;
    }

    try {

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


      const result = await this.extensionCore.createTempSQLFile(editor, selection, selectedText);

      if (!result.ok) {
        throw result.error;
      }

      const tempUri = result.value;
      if (!tempUri) {
        throw new Error('Failed to create temporary file - no URI returned');
      }


      const doc = await vscode.workspace.openTextDocument(tempUri);
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
    } catch (error) {
      console.error('Error in handleEditInlineSQL:', error);
      vscode.window.showErrorMessage(`Failed to edit inline SQL: ${error}`);
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

      const extensionCore = ExtensionCore.getInstance(this.context);
      const metrics = extensionCore.getMetrics();

      vscode.window.showInformationMessage(
        'SQLSugar Dev Metrics:\n' +
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

      vscode.window.showInformationMessage('Debug mode toggle feature coming soon');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to toggle debug mode: ${error}`);
    }
  }
}

import * as vscode from 'vscode';
import { Logger } from '../../core/logger';
import { DIContainer } from '../../core/di-container';
import { LanguageHandler } from './language-handler';
import { TempFileManager } from './temp-file-manager';

/**
 * 内联SQL编辑命令处理器
 */
export class InlineSQLCommandHandler {
  private container: DIContainer;
  private languageHandler: LanguageHandler;
  private tempFileManager: TempFileManager;

  constructor(container: DIContainer) {
    this.container = container;
    this.languageHandler = new LanguageHandler();
    this.tempFileManager = new TempFileManager(this.languageHandler);
  }

  /**
   * 执行内联SQL编辑命令
   */
  public async execute(): Promise<void> {
    try {
      Logger.debug('Executing editInlineSQL command');

      // 验证前置条件
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      if (editor.document.isClosed) {
        vscode.window.showErrorMessage('Active editor document is closed');
        return;
      }

      // 验证选中文本
      const selection = editor.selection;
      if (!selection || selection.isEmpty) {
        vscode.window.showInformationMessage('Please select SQL text to edit');
        return;
      }

      const selectedText = editor.document.getText(selection);
      if (!selectedText || selectedText.trim().length === 0) {
        vscode.window.showInformationMessage('Selected text is empty');
        return;
      }

      // 验证是否为SQL
      if (!this.languageHandler.looksLikeSQL(selectedText)) {
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
      const result = await this.tempFileManager.createTempSQLFile(
        editor,
        selection,
        selectedText
      );

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

      Logger.debug('Inline SQL editing session started');
    } catch (error) {
      Logger.error('Error in editInlineSQL command:', error);
      const userMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to edit inline SQL: ${userMessage}`);
    }
  }
}


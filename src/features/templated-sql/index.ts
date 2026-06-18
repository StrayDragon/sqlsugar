import * as vscode from 'vscode';
import { DIContainer } from '../../core/di-container';
import { Logger } from '../../core/logger';
import { TemplatedSqlHandler } from './command-handler';

/**
 * 注册Jinja2模板功能
 */
export function registerTemplatedSqlFeature(
  container: DIContainer,
  context: vscode.ExtensionContext
): void {
  Logger.debug('Registering Jinja2 feature');


  const disposable = vscode.commands.registerCommand(
    'sqlsugar.copyTemplatedSql',
    async () => {
      try {
        await TemplatedSqlHandler.handleCopyTemplatedSql();
      } catch (error) {
        Logger.error('Failed to execute copyTemplatedSql command:', error);
        const userMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${userMessage}`);
      }
    }
  );

  context.subscriptions.push(disposable);

  Logger.debug('Jinja2 feature registered');
}


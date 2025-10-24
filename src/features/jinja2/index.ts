import * as vscode from 'vscode';
import { DIContainer } from '../../core/di-container';
import { Logger } from '../../core/logger';
import { Jinja2NunjucksHandler } from './command-handler';

/**
 * 注册Jinja2模板功能
 */
export function registerJinja2Feature(
  container: DIContainer,
  context: vscode.ExtensionContext
): void {
  Logger.debug('Registering Jinja2 feature');

  // 注册命令
  const disposable = vscode.commands.registerCommand(
    'sqlsugar.copyJinja2Template',
    async () => {
      try {
        await Jinja2NunjucksHandler.handleCopyJinja2Template('webviewV2');
      } catch (error) {
        Logger.error('Failed to execute copyJinja2Template command:', error);
        const userMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to process Jinja2 template: ${userMessage}`);
      }
    }
  );

  context.subscriptions.push(disposable);

  Logger.debug('Jinja2 feature registered');
}


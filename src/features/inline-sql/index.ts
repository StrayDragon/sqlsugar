import * as vscode from 'vscode';
import { DIContainer } from '../../core/di-container';
import { Logger } from '../../core/logger';
import { InlineSQLCommandHandler } from './command-handler';

/**
 * 注册内联SQL编辑功能
 */
export function registerInlineSQLFeature(
  container: DIContainer,
  context: vscode.ExtensionContext
): void {
  Logger.debug('Registering inline SQL feature');

  const handler = new InlineSQLCommandHandler(container);

  const disposable = vscode.commands.registerCommand(
    'sqlsugar.editInlineSQL',
    () => handler.execute()
  );

  context.subscriptions.push(disposable);

  Logger.debug('Inline SQL feature registered');
}


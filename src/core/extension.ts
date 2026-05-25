import * as vscode from 'vscode';
import { DIContainer } from './di-container';
import { ProviderRegistry } from './provider-registry';
import { LanguageHandlerAdapter, PatternInferenceAdapter } from './adapters';
import { Logger } from './logger';
import { registerInlineSQLFeature } from '../features/inline-sql';
import { registerJinja2Feature } from '../features/jinja2';
import { registerSQLIntelligenceFeature } from '../features/sql-intelligence';
import { LanguageHandler } from '../features/inline-sql/language-handler';


let outputChannel: vscode.OutputChannel | undefined;

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  Logger.info('SQLSugar extension activating');

  try {

    outputChannel = vscode.window.createOutputChannel('SQLSugar');
    outputChannel.appendLine('[SQLSugar] Extension activated successfully');
    outputChannel.appendLine('[SQLSugar] Output channel initialized at plugin startup');
    outputChannel.appendLine(`[SQLSugar] Activation time: ${new Date().toISOString()}`);
    outputChannel.show();
    context.subscriptions.push(outputChannel);


    const container = DIContainer.getInstance();


    container.register('context', context);
    container.register('outputChannel', outputChannel);


    const registry = ProviderRegistry.getInstance();
    registry.register('language', new LanguageHandlerAdapter(new LanguageHandler()));
    registry.register('inference', new PatternInferenceAdapter());

    registerInlineSQLFeature(container, context);
    registerJinja2Feature(container, context);
    registerSQLIntelligenceFeature(context);

    Logger.info('SQLSugar extension activated successfully');
    outputChannel.appendLine('[SQLSugar] All features registered and ready');
  } catch (error) {
    Logger.error('Failed to activate SQLSugar extension:', error);
    vscode.window.showErrorMessage(`Failed to activate SQLSugar: ${error}`);

    if (outputChannel) {
      outputChannel.appendLine(`[SQLSugar] ERROR: ${error}`);
    }
  }
}

/**
 * 扩展停用函数
 */
export async function deactivate() {
  Logger.info('SQLSugar extension deactivating');

  try {
    if (outputChannel) {
      outputChannel.appendLine('[SQLSugar] Extension deactivating...');
      outputChannel.appendLine(`[SQLSugar] Deactivation time: ${new Date().toISOString()}`);
    }


    ProviderRegistry.getInstance().clear();
    DIContainer.getInstance().clear();

    if (outputChannel) {
      outputChannel.appendLine('[SQLSugar] Extension deactivated successfully');
      outputChannel.dispose();
      outputChannel = undefined;
    }
  } catch (error) {
    Logger.error('Error during deactivation:', error);
  }
}

/**
 * 获取全局输出频道
 */
export function getOutputChannel(): vscode.OutputChannel | undefined {
  return outputChannel;
}


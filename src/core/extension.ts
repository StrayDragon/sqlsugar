import * as vscode from 'vscode';
import { DIContainer } from './di-container';
import { Logger } from './logger';
import { registerInlineSQLFeature } from '../features/inline-sql';
import { registerJinja2Feature } from '../features/jinja2';

// 全局输出频道实例
let outputChannel: vscode.OutputChannel | undefined;

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  Logger.info('SQLSugar extension activating');

  try {
    // 创建输出频道
    outputChannel = vscode.window.createOutputChannel('SQLSugar');
    outputChannel.appendLine('[SQLSugar] Extension activated successfully');
    outputChannel.appendLine('[SQLSugar] Output channel initialized at plugin startup');
    outputChannel.appendLine(`[SQLSugar] Activation time: ${new Date().toISOString()}`);
    outputChannel.show();
    context.subscriptions.push(outputChannel);

    // 获取DI容器
    const container = DIContainer.getInstance();

    // 注册核心服务
    container.register('context', context);
    container.register('outputChannel', outputChannel);

    // 注册功能模块
    registerInlineSQLFeature(container, context);
    registerJinja2Feature(container, context);

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

    // 清理DI容器
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




import * as vscode from 'vscode';
import { Logger } from './core/logger';

import { ExtensionCore } from './core/extension-core';

// 全局输出频道实例
let sqlsugarOutputChannel: vscode.OutputChannel | undefined;

let extensionCore: ExtensionCore | undefined;

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  Logger.info('SQLSugar extension activated');

  try {
    // 立即创建SQLSugar输出频道
    sqlsugarOutputChannel = vscode.window.createOutputChannel('SQLSugar');
    sqlsugarOutputChannel.appendLine('[SQLSugar] Extension activated successfully');
    sqlsugarOutputChannel.appendLine('[SQLSugar] Output channel initialized at plugin startup');
    sqlsugarOutputChannel.appendLine(`[SQLSugar] Activation time: ${new Date().toISOString()}`);
    sqlsugarOutputChannel.show();


    extensionCore = ExtensionCore.getInstance(context);
    Logger.debug('ExtensionCore instance created successfully');

    registerDeveloperCommands();

    Logger.info('SQLSugar extension activated successfully');

    // 在输出频道也记录激活成功
    sqlsugarOutputChannel.appendLine('[SQLSugar] ExtensionCore initialized and ready');
  } catch (error) {
    Logger.error('Failed to activate SQLSugar extension:', error);
    vscode.window.showErrorMessage(`Failed to activate SQLSugar: ${error}`);

    // 即使出错也尝试输出到频道
    if (sqlsugarOutputChannel) {
      sqlsugarOutputChannel.appendLine(`[SQLSugar] ERROR: ${error}`);
    }
  }
}

/**
 * 扩展停用函数
 */
export async function deactivate() {
  Logger.info('SQLSugar extension deactivating');

  try {
    if (sqlsugarOutputChannel) {
      sqlsugarOutputChannel.appendLine('[SQLSugar] Extension deactivating...');
      sqlsugarOutputChannel.appendLine(`[SQLSugar] Deactivation time: ${new Date().toISOString()}`);
    }

    if (extensionCore) {
      extensionCore.dispose();
      extensionCore = undefined;
    }

    if (sqlsugarOutputChannel) {
      sqlsugarOutputChannel.appendLine('[SQLSugar] Extension deactivated successfully');
      sqlsugarOutputChannel.dispose();
      sqlsugarOutputChannel = undefined;
    }
  } catch (error) {
    Logger.error('Error during deactivation:', error);
  }
}

/**
 * 获取全局SQLSugar输出频道
 */
export function getSqlSugarOutputChannel(): vscode.OutputChannel | undefined {
  return sqlsugarOutputChannel;
}

/**
 * 注册开发者命令
 * 开发者命令已移至CommandManager中统一管理
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
function registerDeveloperCommands() {}

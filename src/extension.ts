

import * as vscode from 'vscode';
import { Logger } from './core/logger';

import { ExtensionCore } from './core/extension-core';


let extensionCore: ExtensionCore | undefined;

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  Logger.info('SQLSugar extension activated');

  try {

    extensionCore = ExtensionCore.getInstance(context);
    Logger.debug('ExtensionCore instance created successfully');


    registerDeveloperCommands();

    Logger.info('SQLSugar extension activated successfully');
  } catch (error) {
    Logger.error('Failed to activate SQLSugar extension:', error);
    vscode.window.showErrorMessage(`Failed to activate SQLSugar: ${error}`);
  }
}

/**
 * 扩展停用函数
 */
export async function deactivate() {
  Logger.info('SQLSugar extension deactivating');

  try {
    if (extensionCore) {
      extensionCore.dispose();
      extensionCore = undefined;
    }
  } catch (error) {
    Logger.error('Error during deactivation:', error);
  }
}

/**
 * 注册开发者命令
 * 开发者命令已移至CommandManager中统一管理
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
function registerDeveloperCommands() {}

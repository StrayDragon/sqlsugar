// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Logger } from './core/logger';

import { ExtensionCore } from './core/extension-core';

// 全局变量
let extensionCore: ExtensionCore | undefined;

/**
 * 扩展激活函数
 */
export function activate(context: vscode.ExtensionContext) {
  Logger.info('SQLSugar extension activated');

  try {
    // 创建扩展核心实例
    extensionCore = ExtensionCore.getInstance(context);
    Logger.debug('ExtensionCore instance created successfully');

    // 注册开发者命令
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
function registerDeveloperCommands() {
  // 这里可以添加任何extension.ts特定的命令
  // 开发者命令现在由CommandManager统一处理
}

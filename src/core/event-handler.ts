import * as vscode from 'vscode';

import { Jinja2WebviewEditor } from '../jinja2-webview';
import { TempFileManager } from './temp-file-manager';

/**
 * 事件处理器
 * 负责管理扩展的所有事件监听器
 */
export class EventHandler {
  private disposables: vscode.Disposable[] = [];
  private tempFileManager: TempFileManager;

  constructor(tempFileManager: TempFileManager) {
    this.tempFileManager = tempFileManager;
  }

  /**
   * 注册所有事件监听器
   */
  public registerEventListeners(): void {
    this.registerDocumentCloseListener();
    this.registerTerminalCloseListener();
    this.registerWorkspaceChangeListener();
    this.registerConfigurationChangeListener();
  }

  /**
   * 注册文档关闭事件监听器
   */
  private registerDocumentCloseListener(): void {
    const disposable = vscode.workspace.onDidCloseTextDocument(doc => {
      this.tempFileManager.cleanupTempFile(doc.uri);
    });

    this.disposables.push(disposable);
  }

  /**
   * 注册终端关闭事件监听器
   */
  private registerTerminalCloseListener(): void {
    const disposable = vscode.window.onDidCloseTerminal(terminal => {
      // 清理与终端相关的资源
      this.handleTerminalClose(terminal);
    });

    this.disposables.push(disposable);
  }

  /**
   * 注册工作区变化监听器
   */
  private registerWorkspaceChangeListener(): void {
    const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.handleWorkspaceChange();
    });

    this.disposables.push(disposable);
  }

  /**
   * 注册配置变化监听器
   */
  private registerConfigurationChangeListener(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration(e => {
      this.handleConfigurationChange(e);
    });

    this.disposables.push(disposable);
  }

  /**
   * 处理终端关闭
   */
  private handleTerminalClose(terminal: vscode.Terminal): void {
    console.log('Terminal closed:', terminal.name);
    // 可以在这里添加终端相关的资源清理逻辑
  }

  /**
   * 处理工作区变化
   */
  private handleWorkspaceChange(): void {
    console.log('Workspace folders changed');
    // 可以在这里添加工作区变化时的处理逻辑
  }

  /**
   * 处理配置变化
   */
  private handleConfigurationChange(e: vscode.ConfigurationChangeEvent): void {
    if (e.affectsConfiguration('sqlsugar')) {
      console.log('SQLSugar configuration changed');

      // 检查是否是主题配置变化
      if (e.affectsConfiguration('sqlsugar.sqlSyntaxHighlightTheme')) {
        console.log('SQLSugar theme configuration changed, refreshing WebView instances');
        this.refreshWebviewThemes();
      }
    }
  }

  /**
   * 刷新所有WebView实例的主题
   */
  private refreshWebviewThemes(): void {
    try {
      Jinja2WebviewEditor.refreshAllInstances();
    } catch (error) {
      console.log('Failed to refresh WebView themes:', error);
    }
  }

  /**
   * 注册开发者命令
   */
  public registerDeveloperCommands(): void {
    // 开发者命令已在CommandManager中注册
    // 这里可以添加特定的事件相关命令
  }

  /**
   * 获取所有disposables的数量
   */
  public getDisposablesCount(): number {
    return this.disposables.length;
  }

  /**
   * 销毁事件处理器
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

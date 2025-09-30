import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

import { ExtensionCore } from './core/extension-core';
import { Logger } from './core/logger';
import { Jinja2Variable } from './jinja2-nunjucks-processor';

/**
 * WebView 消息类型
 */
interface WebViewMessage {
  command: string;
  text?: string;
  message?: string;
  data?: unknown;
  config?: unknown;
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * WebView变量值的类型
 */
type WebViewVariableValue = string | number | boolean | null | undefined;



/**
 * Jinja2 WebView编辑器
 * 提供可视化模板编辑和变量管理界面
 */
export class Jinja2WebviewEditor {
  private static readonly viewType = 'sqlsugar.jinja2Editor';
  private static activeInstances: Jinja2WebviewEditor[] = [];
  private panel: vscode.WebviewPanel | undefined;
  private resolvePromise: ((values: Record<string, WebViewVariableValue>) => void) | undefined;
  private rejectPromise: ((reason?: unknown) => void) | undefined;
  private extensionPath: string;
  private context: vscode.ExtensionContext;
  private currentTemplate: string = '';
  private currentVariables: Jinja2Variable[] = [];

  /**
   * 刷新所有活动的WebView实例以应用新的主题
   */
  public static refreshAllInstances(): void {
    Jinja2WebviewEditor.activeInstances.forEach(editor => {
      editor.refreshTheme();
    });
  }

  /**
   * 刷新当前WebView实例的主题
   */
  private refreshTheme(): void {
    if (this.panel && this.currentTemplate && this.currentVariables.length > 0) {
      this.panel.webview.html = this.getAppHtml(
        this.panel.webview,
        this.currentTemplate,
        this.currentVariables
      );

      this.panel.webview.postMessage({
        command: 'init',
        template: this.currentTemplate,
        variables: this.currentVariables,
      });
    }
  }

  /**
   * 显示 WebView 编辑器
   */
  public static showEditor(
    template: string,
    variables: Jinja2Variable[],
    title: string = 'Jinja2模板编辑器'
  ): Promise<Record<string, WebViewVariableValue>> {
    return new Promise((resolve, reject) => {
      const editor = new Jinja2WebviewEditor();


      try {
        const extensionCore = ExtensionCore.getInstance();
        editor.context = extensionCore['context'];
        editor.extensionPath = extensionCore['context'].extensionPath;
      } catch (error) {

        editor.extensionPath = process.cwd();
      }

      editor.resolvePromise = resolve;
      editor.rejectPromise = reject;
      editor.show(template, variables, title);
    });
  }

  /**
   * 获取扩展上下文路径
   */
  private getContextPath(): string {

    return this.extensionPath;
  }

  private show(template: string, variables: Jinja2Variable[], title: string): void {

    this.currentTemplate = template;
    this.currentVariables = variables;


    if (this.panel) {
      this.panel.reveal();
      this.updateContent(template, variables);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      Jinja2WebviewEditor.viewType,
      title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources'),
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'jinja2-editor'),
        ],
        enableCommandUris: false,

        enableForms: false,
      }
    );

    this.panel.webview.html = this.getAppHtml(this.panel.webview, template, variables);
    this.setupWebviewListeners();


    this.panel.webview.postMessage({
      command: 'init',
      template,
      variables,
    });


    Jinja2WebviewEditor.activeInstances.push(this);
  }

  private setupWebviewListeners(): void {
    if (!this.panel) {
      return;
    }

    this.panel.onDidDispose(() => {
      this.panel = undefined;

      const index = Jinja2WebviewEditor.activeInstances.indexOf(this);
      if (index > -1) {
        Jinja2WebviewEditor.activeInstances.splice(index, 1);
      }
      if (this.rejectPromise) {
        this.rejectPromise(new Error('用户关闭了编辑器'));
        this.rejectPromise = undefined;
        this.resolvePromise = undefined;
      }
    });

    this.panel.webview.onDidReceiveMessage(async message => {
      await this.handleWebviewMessage(message);
    });
  }



  private async handleWebviewMessage(message: WebViewMessage): Promise<void> {
    if (!message || !message.command) {
      return;
    }
    const msg = message;
    switch (msg.command) {
      case 'submit':
        if (this.resolvePromise && msg.values) {
          this.resolvePromise(msg.values as Record<string, WebViewVariableValue>);
          this.panel?.dispose();
        }
        break;

      case 'cancel':
        if (this.rejectPromise) {
          this.rejectPromise(new Error('用户取消了操作'));
          this.panel?.dispose();
        }
        break;

      case 'copyToClipboard':
        if (message.text) {
          await this.copyToClipboardWithFallback(message.text);
          vscode.window.showInformationMessage('SQL已复制到剪贴板');
        }
        break;

      case 'showError':
        if (message.message) {
          vscode.window.showErrorMessage(message.message);
        }
        break;
    }
  }

  /**
   * 复制文本到剪贴板，支持 wl-copy fallback
   */
  private async copyToClipboardWithFallback(text: string): Promise<void> {
    try {

      await vscode.env.clipboard.writeText(text);
    } catch (error) {
          Logger.warn('VS Code clipboard failed, trying fallback:', error);


      const config = vscode.workspace.getConfiguration('sqlsugar');
      const enableWlCopyFallback = config.get<boolean>('enableWlCopyFallback', false);

      if (enableWlCopyFallback && process.platform === 'linux') {
        await this.copyWithWlCopy(text);
      } else {

        throw new Error('剪贴板操作失败，请检查系统权限或启用 wl-copy fallback');
      }
    }
  }

  /**
   * 使用 wl-copy 命令复制文本到剪贴板（Linux Wayland）
   */
  private async copyWithWlCopy(text: string): Promise<void> {
    const execAsync = promisify(exec);

    try {

      await execAsync(`echo '${text.replace(/'/g, "'\\''")}' | wl-copy`);
      Logger.info('Text copied to clipboard using wl-copy');
    } catch (error) {
      Logger.error('wl-copy failed:', error);
      throw new Error('wl-copy 命令执行失败，请确保已安装 wl-clipboard');
    }
  }

  private updateContent(template: string, variables: Jinja2Variable[]): void {
    if (!this.panel) {
      return;
    }

    this.currentTemplate = template;
    this.currentVariables = variables;

    this.panel.webview.postMessage({
      command: 'init',
      template,
      variables,
    });
  }

  /**
   * 新版 WebView HTML：仅挂载App并加载外部脚本
   */
  private getAppHtml(
    webview: vscode.Webview,
    template: string,
    variables: Jinja2Variable[]
  ): string {
    const nonce = getNonce();
    const templatePreview = template.substring(0, 100) + (template.length > 100 ? '...' : '');

    const nunjucksUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources', 'nunjucks.min.js')
    );
    const jinjaEditorUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'jinja2-editor', 'jinja2-editor.js')
    );
    const appJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'app.js')
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource} 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <title>Jinja2 Template Editor - ${templatePreview}</title>
</head>
<body>
  <sqlsugar-webview-app></sqlsugar-webview-app>
  <script nonce="${nonce}">(function(){try{var a=typeof acquireVsCodeApi==='function'?acquireVsCodeApi():undefined;if(a){window.vscode=a;}}catch(e){}})();</script>
  <script src="${nunjucksUri}"></script>
  <script type="module" src="${jinjaEditorUri}"></script>
  <script type="module" src="${appJsUri}"></script>
</body>
</html>`;
  }


}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

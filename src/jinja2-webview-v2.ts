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
  isTemplate?: boolean;
  [key: string]: unknown;
}

/**
 * WebView变量值的类型
 */
type WebViewVariableValue = string | number | boolean | null | undefined;

/**
 * Jinja2 WebView编辑器 V2
 * 新一代可视化模板编辑器
 */
export class Jinja2WebviewEditorV2 {
  private static readonly viewType = 'sqlsugar.jinja2EditorV2';
  private static activeInstances: Jinja2WebviewEditorV2[] = [];
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
    Jinja2WebviewEditorV2.activeInstances.forEach(editor => {
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
        config: this.getV2EditorConfig(),
      });
    }
  }

  /**
   * 显示 V2 WebView 编辑器
   */
  public static showEditor(
    template: string,
    variables: Jinja2Variable[],
    title: string = 'Jinja2 V2 模板编辑器'
  ): Promise<Record<string, WebViewVariableValue>> {
    return new Promise((resolve, reject) => {
      const editor = new Jinja2WebviewEditorV2();

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

    // 如果已经存在面板，直接显示
    if (this.panel) {
      this.panel.reveal();
      this.updateContent(template, variables);
      return;
    }

    // 创建新的WebView面板
    this.panel = vscode.window.createWebviewPanel(
      Jinja2WebviewEditorV2.viewType,
      title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources'),
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview'),
          vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'jinja2-editor-v2'),
        ],
        enableCommandUris: false,
        enableForms: false,
      }
    );

    this.panel.webview.html = this.getAppHtml(this.panel.webview, template, variables);
    this.setupWebviewListeners();

    // 发送初始化消息
    this.panel.webview.postMessage({
      command: 'init',
      template,
      variables,
      config: this.getV2EditorConfig(),
    });

    // 添加到活动实例列表
    Jinja2WebviewEditorV2.activeInstances.push(this);
  }

  private setupWebviewListeners(): void {
    if (!this.panel) {
      return;
    }

    this.panel.onDidDispose(() => {
      this.panel = undefined;

      const index = Jinja2WebviewEditorV2.activeInstances.indexOf(this);
      if (index > -1) {
        Jinja2WebviewEditorV2.activeInstances.splice(index, 1);
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

      case 'fallbackToV1':
        // User requested fallback to V1 editor
        this.panel?.dispose();
        await this.handleFallbackToV1(msg.template as string, msg.variables as Jinja2Variable[]);
        break;

      case 'copyToClipboard':
        if (message.text) {
          await this.copyToClipboardWithFallback(message.text);
          const messageText = message.isTemplate ? '模板已复制到剪贴板' : 'SQL已复制到剪贴板';
          vscode.window.showInformationMessage(messageText);
        }
        break;

      case 'showError':
        if (message.message) {
          vscode.window.showErrorMessage(message.message);
        }
        break;

      case 'log':
        // 处理来自WebView的日志消息
        if (message.message) {
          Logger.info(`WebView V2: ${message.message}`);
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

  /**
   * 获取V2编辑器配置
   */
  private getV2EditorConfig(): Record<string, unknown> {
    const config = vscode.workspace.getConfiguration('sqlsugar.v2Editor');
    return {
      popoverPlacement: config.get<string>('popoverPlacement', 'auto'),
      highlightStyle: config.get<string>('highlightStyle', 'background'),
      autoPreview: config.get<boolean>('autoPreview', true),
      keyboardNavigation: config.get<boolean>('keyboardNavigation', true),
      animationsEnabled: config.get<boolean>('animationsEnabled', true),
      showSuggestions: config.get<boolean>('showSuggestions', true),
      autoFocusFirst: config.get<boolean>('autoFocusFirst', false)
    };
  }

  /**
   * 回退到V1编辑器
   */
  private async handleFallbackToV1(template: string, variables: Jinja2Variable[]): Promise<void> {
    try {
      // Import V1 editor
      const { Jinja2WebviewEditor } = await import('./jinja2-webview.js');

      // Convert V2 variables to V1 format
      const v1Variables = variables.map(v => ({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
        description: v.description,
        isRequired: v.required
      }));

      // Show V1 editor
      const result = await Jinja2WebviewEditor.showEditor(template, v1Variables);

      // Resolve with the result from V1 editor
      if (this.resolvePromise) {
        this.resolvePromise(result);
      }
    } catch (error) {
      Logger.error('Failed to fallback to V1 editor:', error);
      if (this.rejectPromise) {
        this.rejectPromise(error);
      }
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
      config: this.getV2EditorConfig(),
    });
  }

  /**
   * V2 WebView HTML - 使用V1相同架构
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
    const jinjaEditorV2Uri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'jinja2-editor-v2', 'jinja2-editor-v2.js')
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline';">
  <title>Jinja2 V2 Template Editor - ${templatePreview}</title>
  <link href="${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources', 'vs2015.min.css'))}" rel="stylesheet">
</head>
<body>
  <sqlsugar-webview-v2-app></sqlsugar-webview-v2-app>
  <script nonce="${nonce}">(function(){try{var a=typeof acquireVsCodeApi==='function'?acquireVsCodeApi():undefined;if(a){window.vscode=a;}}catch(e){}})();</script>
  <script src="${nunjucksUri}"></script>
  <script type="module" src="${jinjaEditorV2Uri}"></script>
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

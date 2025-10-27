import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

import { Logger } from '../../core/logger';
import { getOutputChannel } from '../../core/extension';
import { DIContainer } from '../../core/di-container';
import { Jinja2Variable } from './processor';
import { Jinja2NunjucksHandler } from './command-handler';

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
   * 获取全局输出频道
   */
  private static getOutputChannel(): vscode.OutputChannel | undefined {
    return getOutputChannel();
  }

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
  public static async showEditor(
    template: string,
    _variables: Jinja2Variable[],
    title: string = 'Jinja2 V2 模板编辑器'
  ): Promise<Record<string, WebViewVariableValue>> {
    return new Promise((resolve, reject) => {
      void (async () => {
        const editor = new Jinja2WebviewEditorV2();

      try {
        const container = DIContainer.getInstance();
        const context = container.get<vscode.ExtensionContext>('context');
        editor.context = context;
        editor.extensionPath = context.extensionPath;
      } catch (_error) {
        editor.extensionPath = process.cwd();
      }

      editor.resolvePromise = resolve;
      editor.rejectPromise = reject;


      try {
        const handler = Jinja2NunjucksHandler.getInstance();
        const extractedVariables = handler.extractVariables(template);

        Logger.info(`V2 Editor: Extracted ${extractedVariables.length} variables from template`);


        extractedVariables.forEach((variable, index) => {
          Logger.info(`V2 Editor: Variable ${index + 1}: ${variable.name} (${variable.type}) - extracted via ${variable.extractionMethod}`);
        });

        editor.show(template, extractedVariables, title);
      } catch (_error) {
        Logger.warn('V2 Editor: Variable extraction failed, using provided variables:', _error);

        editor.show(template, _variables, title);
      }
      })();
    });
  }

  /**
   * 静态方法：提取模板变量（供外部调用）
   */
  public static extractVariables(template: string): Jinja2Variable[] {
    try {
      const handler = Jinja2NunjucksHandler.getInstance();
      const variables = handler.extractVariables(template);

      Logger.info(`V2 Editor: Extracted ${variables.length} variables`);
      return variables;
    } catch (_error) {
      Logger.error('V2 Editor: Failed to extract variables:', _error);
      return [];
    }
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


    this.panel.webview.postMessage({
      command: 'init',
      template,
      variables: variables,
      config: this.getV2EditorConfig(),
    });


    const mainConfig = vscode.workspace.getConfiguration('sqlsugar');
    const logLevel = mainConfig.get<string>('logLevel', 'error');

    if (logLevel !== 'error' && logLevel !== 'none') {
      const outputChannel = Jinja2WebviewEditorV2.getOutputChannel();
      if (outputChannel) {
        outputChannel.appendLine('[V2 Extension] Editor initialized');
        outputChannel.appendLine(`[V2 Extension] Variables: ${variables.length}`);


        if (logLevel === 'info' || logLevel === 'debug') {
          outputChannel.appendLine(`[V2 Extension] Template preview: ${template.substring(0, 50)}...`);
        }


      }
    }


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
    if (!message?.command) {
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

        if (message.category && message.data) {
          const category = String(message.category);


          const mainConfig = vscode.workspace.getConfiguration('sqlsugar');
          const logLevel = mainConfig.get<string>('logLevel', 'error');


          const shouldLog = this.shouldLogToOutput(category, logLevel);

          if (shouldLog) {
            const logMessage = `[${category}] ${JSON.stringify(message.data, null, 2)}`;


            const outputChannel = Jinja2WebviewEditorV2.getOutputChannel();
            if (outputChannel) {
              outputChannel.appendLine(logMessage);


              if (this.shouldShowOutputChannel(category, logLevel)) {
                outputChannel.show();
              }
            }
          }


          Logger.debug(`${category}:`, message.data);
        }
        break;

      default:

        break;
    }
  }

  /**
   * 复制文本到剪贴板，支持 wl-copy fallback
   */
  private async copyToClipboardWithFallback(text: string): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(text);
    } catch (_error) {
      Logger.warn('VS Code clipboard failed, trying fallback:', _error);

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
    } catch (_error) {
      Logger.error('wl-copy failed:', _error);
      throw new Error('wl-copy 命令执行失败，请确保已安装 wl-clipboard');
    }
  }

  /**
   * 获取V2编辑器配置
   */
  private getV2EditorConfig(): Record<string, unknown> {
    const config = vscode.workspace.getConfiguration('sqlsugar.v2Editor');
    const mainConfig = vscode.workspace.getConfiguration('sqlsugar');
    return {
      popoverPlacement: config.get<string>('popoverPlacement', 'auto'),
      highlightStyle: config.get<string>('highlightStyle', 'background'),
      autoPreview: config.get<boolean>('autoPreview', true),
      keyboardNavigation: config.get<boolean>('keyboardNavigation', true),
      animationsEnabled: config.get<boolean>('animationsEnabled', true),
      showSuggestions: config.get<boolean>('showSuggestions', true),
      autoFocusFirst: config.get<boolean>('autoFocusFirst', false),
      logLevel: mainConfig.get<string>('logLevel', 'error')
    };
  }

  /**
   * 判断是否应该记录到输出频道
   */
  private shouldLogToOutput(category: string, logLevel: string): boolean {

    if (logLevel === 'none') {
      return false;
    }


    const errorCategories = [
      'V2_EDITOR_ERROR',
      'NUNJUCKS_ERROR',
      'TEMPLATE_RENDER_ERROR',
      'PLACEHOLDER_DETECTED',
      'PLACEHOLDER_IN_HTML'
    ];


    const warnCategories = [
      'V2_EDITOR_WARN',
      'NUNJUCKS_SUSPICIOUS',
      'SUSPICIOUS_FORMATTING',
      'DEFAULT_PLACEHOLDER',
      'VARIABLE_VALIDATION'
    ];


    const infoCategories = [
      'V2_EDITOR_INFO',
      'NUNJUCKS_SUCCESS',
      'NUNJUCKS_CLEAN',
      'VARIABLE_CLEANED'
    ];


    switch (logLevel) {
      case 'error':
        return errorCategories.some(cat => category.includes(cat));
      case 'warn':
        return errorCategories.some(cat => category.includes(cat)) ||
               warnCategories.some(cat => category.includes(cat));
      case 'info':
        return errorCategories.some(cat => category.includes(cat)) ||
               warnCategories.some(cat => category.includes(cat)) ||
               infoCategories.some(cat => category.includes(cat));
      case 'debug':
        return true;
      default:
        return false;
    }
  }

  /**
   * 判断是否应该自动显示输出频道
   */
  private shouldShowOutputChannel(category: string, logLevel: string): boolean {

    const criticalCategories = [
      'V2_EDITOR_ERROR',
      'NUNJUCKS_ERROR',
      'TEMPLATE_RENDER_ERROR',
      'PLACEHOLDER_DETECTED',
      'PLACEHOLDER_IN_HTML'
    ];


    if (logLevel === 'error') {
      return criticalCategories.some(cat => category.includes(cat));
    }


    if (logLevel === 'warn' || logLevel === 'info') {
      return criticalCategories.some(cat => category.includes(cat));
    }


    if (logLevel === 'debug') {
      return false;
    }

    return false;
  }


  private updateContent(template: string, _variables: Jinja2Variable[]): void {
    if (!this.panel) {
      return;
    }

    this.currentTemplate = template;
    this.currentVariables = _variables;

    this.panel.webview.postMessage({
      command: 'init',
      template,
      variables: _variables,
      config: this.getV2EditorConfig(),
    });
  }

  /**
   * V2 WebView HTML
   */
  private getAppHtml(
    webview: vscode.Webview,
    template: string,
    _variables: Jinja2Variable[]
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
  <script nonce="${nonce}">

    (function() {
      try {
        if (typeof acquireVsCodeApi === 'function') {
          const vscode = acquireVsCodeApi();
          if (vscode) {
            window.vscode = vscode;
          }
        }
      } catch (_error) {
        console.error('[V2 WebView] Error initializing VS Code API:', _error);
      }
    })();
  </script>
  <script src="${nunjucksUri}"></script>
  <script src="${webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources', 'highlight.min.js'))}"></script>
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

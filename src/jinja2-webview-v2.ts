import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

import { ExtensionCore } from './core/extension-core';
import { Logger } from './core/logger';
import { Jinja2Variable } from './jinja2-nunjucks-processor';
import { Jinja2NunjucksHandler } from './jinja2-nunjucks-handler';
import { getSqlSugarOutputChannel } from './extension';

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
    return getSqlSugarOutputChannel();
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
   * 显示 V2 WebView 编辑器（使用V1处理器提取变量）
   */
  public static async showEditor(
    template: string,
    variables: Jinja2Variable[],
    title: string = 'Jinja2 V2 模板编辑器'
  ): Promise<Record<string, WebViewVariableValue>> {
    return new Promise(async (resolve, reject) => {
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

      // 使用V1的成熟处理器提取变量，确保能识别{% if %}中的变量
      try {
        const handler = Jinja2NunjucksHandler.getInstance();
        const extractedVariables = handler.extractVariables(template);

        Logger.info(`V2 Editor: Using V1 processor extracted ${extractedVariables.length} variables from template`);

        // 记录提取到的变量，用于调试
        extractedVariables.forEach((variable, index) => {
          Logger.info(`V2 Editor: Variable ${index + 1}: ${variable.name} (${variable.type}) - extracted via ${variable.extractionMethod}`);
        });

        editor.show(template, extractedVariables, title);
      } catch (error) {
        Logger.warn('V2 Editor: V1 processor failed, using provided variables:', error);
        // 如果V1处理器失败，回退到传入的变量
        editor.show(template, variables, title);
      }
    });
  }

  /**
   * 静态方法：使用V1处理器提取变量（供外部调用）
   */
  public static extractVariablesUsingV1Processor(template: string): Jinja2Variable[] {
    try {
      const handler = Jinja2NunjucksHandler.getInstance();
      const variables = handler.extractVariables(template);

      Logger.info(`V2 Editor: Extracted ${variables.length} variables using V1 processor`);
      return variables;
    } catch (error) {
      Logger.error('V2 Editor: Failed to extract variables using V1 processor:', error);
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

    // 测试全局输出频道是否工作
    const outputChannel = Jinja2WebviewEditorV2.getOutputChannel();
    if (outputChannel) {
      outputChannel.appendLine('[V2 Extension] Editor initialized successfully');
      outputChannel.appendLine(`[V2 Extension] Template: ${template.substring(0, 100)}...`);
      outputChannel.appendLine(`[V2 Extension] Variables count: ${variables.length}`);
      outputChannel.appendLine(`[V2 Extension] Editor opened at: ${new Date().toISOString()}`);
      outputChannel.show();
      console.log('[V2 Extension] Successfully wrote to global output channel');
    } else {
      console.log('[V2 Extension] Global output channel not available at editor initialization!');
    }

    // 添加到活动实例列表
    Jinja2WebviewEditorV2.activeInstances.push(this);
  }

  private setupWebviewListeners(): void {
    if (!this.panel) {
      console.log('[V2 Extension] No panel available for setting up listeners');
      return;
    }

    console.log('[V2 Extension] Setting up webview listeners');

    this.panel.onDidDispose(() => {
      console.log('[V2 Extension] WebView panel disposed');
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
      console.log('[V2 Extension] WebView message received, calling handler');
      await this.handleWebviewMessage(message);
    });

    console.log('[V2 Extension] WebView listeners setup complete');
  }

  private async handleWebviewMessage(message: WebViewMessage): Promise<void> {
    // Log all received messages for debugging
    console.log('[V2 Extension] === WEBVIEW MESSAGE RECEIVED ===');
    console.log('[V2 Extension] Message:', JSON.stringify(message, null, 2));
    console.log('[V2 Extension] Command:', message.command);
    console.log('[V2 Extension] Category:', message.category);
    console.log('[V2 Extension] Data:', message.data);

    if (!message || !message.command) {
      console.log('[V2 Extension] No message or command, returning');
      return;
    }

    const msg = message;
    console.log('[V2 Extension] Processing command:', msg.command);

    switch (msg.command) {

      case 'submit':
        console.log('[V2 Extension] Handling submit command');
        if (this.resolvePromise && msg.values) {
          this.resolvePromise(msg.values as Record<string, WebViewVariableValue>);
          this.panel?.dispose();
        }
        break;

      case 'cancel':
        console.log('[V2 Extension] Handling cancel command');
        if (this.rejectPromise) {
          this.rejectPromise(new Error('用户取消了操作'));
          this.panel?.dispose();
        }
        break;

      case 'fallbackToV1':
        console.log('[V2 Extension] Handling fallbackToV1 command');
        // User requested fallback to V1 editor
        this.panel?.dispose();
        await this.handleFallbackToV1(msg.template as string, msg.variables as Jinja2Variable[]);
        break;

      case 'copyToClipboard':
        console.log('[V2 Extension] Handling copyToClipboard command');
        if (message.text) {
          await this.copyToClipboardWithFallback(message.text);
          const messageText = message.isTemplate ? '模板已复制到剪贴板' : 'SQL已复制到剪贴板';
          vscode.window.showInformationMessage(messageText);
        }
        break;

      case 'showError':
        console.log('[V2 Extension] Handling showError command');
        if (message.message) {
          vscode.window.showErrorMessage(message.message);
        }
        break;

      case 'log':
        console.log('[V2 Extension] === HANDLING LOG COMMAND ===');
        console.log('[V2 Extension] Category:', message.category);
        console.log('[V2 Extension] Data:', message.data);

        // 处理来自WebView的精确日志消息
        if (message.category && message.data) {
          const logMessage = `[${message.category}] ${JSON.stringify(message.data, null, 2)}`;
          console.log('[V2 Extension] Generated log message:', logMessage);

          // 使用全局输出频道
          const outputChannel = Jinja2WebviewEditorV2.getOutputChannel();
          if (outputChannel) {
            console.log('[V2 Extension] Writing to global output channel:', logMessage);
            outputChannel.appendLine(logMessage);
            outputChannel.show(); // Auto-show output channel
            console.log('[V2 Extension] Message written to output channel successfully');
          } else {
            console.log('[V2 Extension] Global output channel not available!');
          }

          // 也发送到控制台进行调试
          console.log(`[SQLSugar] ${message.category}:`, message.data);
        } else {
          console.log('[V2 Extension] Log message missing category or data:', message);
          console.log('[V2 Extension] Full message object:', message);
        }
        break;

      default:
        console.log('[V2 Extension] Unknown command:', msg.command);
        console.log('[V2 Extension] Full message:', message);
        break;
    }

    console.log('[V2 Extension] === WEBVIEW MESSAGE PROCESSING COMPLETE ===');
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
  <script nonce="${nonce}">
    // Initialize VS Code API immediately and test communication
    (function() {
      console.log('[V2 WebView] Starting VS Code API initialization...');

      try {
        // Check if acquireVsCodeApi function exists
        if (typeof acquireVsCodeApi === 'function') {
          console.log('[V2 WebView] acquireVsCodeApi function found, calling it...');
          const vscode = acquireVsCodeApi();

          if (vscode) {
            console.log('[V2 WebView] VS Code API acquired successfully');
            window.vscode = vscode;

            // Test basic postMessage
            console.log('[V2 WebView] Testing basic postMessage...');
            vscode.postMessage({
              command: 'log',
              category: 'WEBVIEW_API_TEST',
              data: {
                message: 'VS Code API is working!',
                timestamp: new Date().toISOString(),
                hasPostMessage: typeof vscode.postMessage === 'function'
              }
            });

            // Test with different message format
            console.log('[V2 WebView] Testing message with category...');
            vscode.postMessage({
              command: 'log',
              category: 'WEBVIEW_INIT',
              data: { message: 'WebView initialized and ready!', timestamp: new Date().toISOString() }
            });

            console.log('[V2 WebView] All test messages sent');
          } else {
            console.error('[V2 WebView] acquireVsCodeApi returned undefined');
          }
        } else {
          console.error('[V2 WebView] acquireVsCodeApi function not found');
        }
      } catch (error) {
        console.error('[V2 WebView] Error in VS Code API initialization:', error);
      }
    })();
  </script>

  <!-- Fallback test script -->
  <script nonce="${nonce}">
    // Fallback: Try to find VS Code API in global scope
    setTimeout(() => {
      console.log('[V2 WebView] Fallback: Checking for VS Code API...');

      if (typeof window.vscode !== 'undefined') {
        console.log('[V2 WebView] Found vscode in window, testing postMessage...');
        window.vscode.postMessage({
          command: 'log',
          category: 'WEBVIEW_FALLBACK',
          data: { message: 'Fallback test working!', timestamp: new Date().toISOString() }
        });
      } else {
        console.error('[V2 WebView] VS Code API not available in window object');
      }
    }, 2000);
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

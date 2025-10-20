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

    // 只在非 error 等级时记录初始化信息
    const mainConfig = vscode.workspace.getConfiguration('sqlsugar');
    const logLevel = mainConfig.get<string>('logLevel', 'error');

    if (logLevel !== 'error' && logLevel !== 'none') {
      const outputChannel = Jinja2WebviewEditorV2.getOutputChannel();
      if (outputChannel) {
        outputChannel.appendLine('[V2 Extension] Editor initialized');
        outputChannel.appendLine(`[V2 Extension] Variables: ${variables.length}`);

        // 只在 info 或 debug 等级时显示详细信息
        if (logLevel === 'info' || logLevel === 'debug') {
          outputChannel.appendLine(`[V2 Extension] Template preview: ${template.substring(0, 50)}...`);
        }

        // 不自动显示输出频道，避免打扰用户
      }
    }

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
        // 处理来自WebView的日志消息，根据日志等级过滤
        if (message.category && message.data) {
          const category = String(message.category); // 转换为字符串类型

          // 获取当前日志等级配置
          const mainConfig = vscode.workspace.getConfiguration('sqlsugar');
          const logLevel = mainConfig.get<string>('logLevel', 'error');

          // 根据日志等级决定是否显示
          const shouldLog = this.shouldLogToOutput(category, logLevel);

          if (shouldLog) {
            const logMessage = `[${category}] ${JSON.stringify(message.data, null, 2)}`;

            // 使用全局输出频道
            const outputChannel = Jinja2WebviewEditorV2.getOutputChannel();
            if (outputChannel) {
              outputChannel.appendLine(logMessage);

              // 只在错误等级或关键问题时自动显示输出频道
              if (this.shouldShowOutputChannel(category, logLevel)) {
                outputChannel.show();
              }
            }
          }

          // 调试信息始终发送到开发者控制台（不影响用户体验）
          console.log(`[SQLSugar] ${category}:`, message.data);
        }
        break;

      default:
        // Unknown command, ignore silently
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
    const mainConfig = vscode.workspace.getConfiguration('sqlsugar');
    return {
      popoverPlacement: config.get<string>('popoverPlacement', 'auto'),
      highlightStyle: config.get<string>('highlightStyle', 'background'),
      autoPreview: config.get<boolean>('autoPreview', true),
      keyboardNavigation: config.get<boolean>('keyboardNavigation', true),
      animationsEnabled: config.get<boolean>('animationsEnabled', true),
      showSuggestions: config.get<boolean>('showSuggestions', true),
      autoFocusFirst: config.get<boolean>('autoFocusFirst', false),
      logLevel: mainConfig.get<string>('logLevel', 'error') // 传递日志等级到 WebView
    };
  }

  /**
   * 判断是否应该记录到输出频道
   */
  private shouldLogToOutput(category: string, logLevel: string): boolean {
    // 如果日志等级是 none，不输出任何日志
    if (logLevel === 'none') {
      return false;
    }

    // 错误级别的分类
    const errorCategories = [
      'V2_EDITOR_ERROR',
      'NUNJUCKS_ERROR',
      'TEMPLATE_RENDER_ERROR',
      'PLACEHOLDER_DETECTED',
      'PLACEHOLDER_IN_HTML'
    ];

    // 警告级别的分类
    const warnCategories = [
      'V2_EDITOR_WARN',
      'NUNJUCKS_SUSPICIOUS',
      'SUSPICIOUS_FORMATTING',
      'DEFAULT_PLACEHOLDER',
      'VARIABLE_VALIDATION'
    ];

    // 信息级别的分类（重要的操作）
    const infoCategories = [
      'V2_EDITOR_INFO',
      'NUNJUCKS_SUCCESS',
      'NUNJUCKS_CLEAN',
      'VARIABLE_CLEANED'
    ];

    // 根据日志等级和分类决定是否输出
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
        return true; // debug 级别显示所有日志
      default:
        return false;
    }
  }

  /**
   * 判断是否应该自动显示输出频道
   */
  private shouldShowOutputChannel(category: string, logLevel: string): boolean {
    // 只在错误等级或者包含关键问题的分类时自动显示
    const criticalCategories = [
      'V2_EDITOR_ERROR',
      'NUNJUCKS_ERROR',
      'TEMPLATE_RENDER_ERROR',
      'PLACEHOLDER_DETECTED',
      'PLACEHOLDER_IN_HTML'
    ];

    // 如果日志等级是 error，只显示错误
    if (logLevel === 'error') {
      return criticalCategories.some(cat => category.includes(cat));
    }

    // warn 及以上级别，显示重要问题
    if (logLevel === 'warn' || logLevel === 'info') {
      return criticalCategories.some(cat => category.includes(cat));
    }

    // debug 级别不自动显示，避免打扰用户
    if (logLevel === 'debug') {
      return false;
    }

    return false;
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
    // Initialize VS Code API
    (function() {
      try {
        if (typeof acquireVsCodeApi === 'function') {
          const vscode = acquireVsCodeApi();
          if (vscode) {
            window.vscode = vscode;
          }
        }
      } catch (error) {
        console.error('[V2 WebView] Error initializing VS Code API:', error);
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

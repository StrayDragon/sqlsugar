import * as path from 'path';
import * as vscode from 'vscode';

import { ExtensionCore } from './core/extension-core';
import { Jinja2Variable } from './jinja2-nunjucks-processor';

/**
 * WebView变量值接口
 */
interface VariableValue {
  name: string;
  type: string;
  value: any;
  isEmpty: boolean;
}

/**
 * WebView编辑器结果接口
 */
interface WebViewResult {
  success: boolean;
  values?: Record<string, any>;
  error?: string;
}

/**
 * Jinja2 WebView编辑器
 * 提供可视化模板编辑和变量管理界面
 */
export class Jinja2WebviewEditor {
  private static readonly viewType = 'sqlsugar.jinja2Editor';
  private panel: vscode.WebviewPanel | undefined;
  private resolvePromise: ((values: Record<string, any>) => void) | undefined;
  private rejectPromise: ((reason?: any) => void) | undefined;
  private extensionPath: string;
  private context: vscode.ExtensionContext;

  /**
   * 显示 WebView 编辑器
   */
  public static showEditor(
    template: string,
    variables: Jinja2Variable[],
    title: string = 'Jinja2模板编辑器'
  ): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      const editor = new Jinja2WebviewEditor();

      // Get extension context from ExtensionCore
      try {
        const extensionCore = ExtensionCore.getInstance();
        editor.context = extensionCore['context'];
        editor.extensionPath = extensionCore['context'].extensionPath;
      } catch (error) {
        // Fallback: use current working directory
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
    // 使用扩展路径，在开发和生产环境中都有效
    return this.extensionPath;
  }

  private show(template: string, variables: Jinja2Variable[], title: string): void {
    // 创建或显示 webview 面板
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
        ],
        enableCommandUris: false,
        // Explicit sandbox settings to prevent security warnings
        enableForms: false,
      }
    );

    this.panel.webview.html = this.getHtmlContent(this.panel.webview, template, variables);
    this.setupWebviewListeners();
  }

  private setupWebviewListeners(): void {
    if (!this.panel) {
      return;
    }

    this.panel.onDidDispose(() => {
      this.panel = undefined;
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

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'submit':
        if (this.resolvePromise && message.values) {
          this.resolvePromise(message.values);
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
          await vscode.env.clipboard.writeText(message.text);
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

  private updateContent(template: string, variables: Jinja2Variable[]): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.html = this.getHtmlContent(this.panel.webview, template, variables);
  }

  private getHtmlContent(
    webview: vscode.Webview,
    template: string,
    variables: Jinja2Variable[]
  ): string {
    const nonce = getNonce();
    const templatePreview = template.substring(0, 100) + (template.length > 100 ? '...' : '');

    // 获取配置
    const config = vscode.workspace.getConfiguration('sqlsugar');
    const theme = config.get<string>('sqlSyntaxHighlightTheme', 'vscode-dark');
    const fontSize = config.get<number>('sqlSyntaxHighlightFontSize', 14);
    const logLevel = config.get<string>('logLevel', 'error');

    // 获取本地资源URI - 在已安装的扩展中，资源文件始终位于 dist/resources 目录
    const nunjucksUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources', 'nunjucks.min.js')
    );
    const highlightJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources', 'highlight.min.js')
    );
    const highlightCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'resources', 'vs2015.min.css')
    );

    // 构建变量初始值 - 使用安全的方式创建对象
    const initialValuesObj: Record<string, any> = {};
    variables.forEach(v => {
      initialValuesObj[v.name] = v.defaultValue;
    });
    const initialValues = JSON.stringify(initialValuesObj);

    // 构建变量配置 - 使用安全的方式创建数组
    const variableConfigs = JSON.stringify(
      variables.map(v => ({
        name: v.name,
        defaultValue: v.defaultValue,
        description: v.description || '',
        type: v.type,
        filters: v.filters || [],
      }))
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' 'unsafe-eval' ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline';">
    <title>Jinja2 Template Editor - ${templatePreview}</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-font-family), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --vscode-font-size: var(--vscode-font-size, 13px);
            --vscode-foreground: var(--vscode-foreground, #cccccc);
            --vscode-background: var(--vscode-background, #1e1e1e);
            --vscode-editor-background: var(--vscode-editor-background, #1e1e1e);
            --vscode-textBlockQuote-background: var(--vscode-textBlockQuote-background, #7f7f7f26);
            --vscode-textBlockQuote-border: var(--vscode-textBlockQuote-border, #007acc80);
            --vscode-textLink-activeForeground: var(--vscode-textLink-activeForeground, #4e94ce);
            --vscode-textLink-foreground: var(--vscode-textLink-foreground, #3794ff);
            --vscode-button-background: var(--vscode-button-background, #0e639c);
            --vscode-button-foreground: var(--vscode-button-foreground, #ffffff);
            --vscode-button-hoverBackground: var(--vscode-button-hoverBackground, #1177bb);
            --vscode-button-secondaryBackground: var(--vscode-button-secondaryBackground, #3a3d41);
            --vscode-button-secondaryForeground: var(--vscode-button-secondaryForeground, #cccccc);
            --vscode-button-secondaryHoverBackground: var(--vscode-button-secondaryHoverBackground, #45494e);
            --vscode-checkbox-background: var(--vscode-checkbox-background, #3c3c3c);
            --vscode-checkbox-border: var(--vscode-checkbox-border, #6e6e6e);
            --vscode-dropdown-background: var(--vscode-dropdown-background, #3c3c3c);
            --vscode-dropdown-foreground: var(--vscode-dropdown-foreground, #f0f0f0);
            --vscode-input-background: var(--vscode-input-background, #3c3c3c);
            --vscode-input-foreground: var(--vscode-input-foreground, #cccccc);
            --vscode-input-border: var(--vscode-input-border, #6e6e6e);
            --vscode-input-placeholderForeground: var(--vscode-input-placeholderForeground, #a6a6a6);
            --vscode-badge-background: var(--vscode-badge-background, #4d4d4d);
            --vscode-badge-foreground: var(--vscode-badge-foreground, #ffffff);
            --vscode-errorForeground: var(--vscode-errorForeground, #f48771);
            --vscode-warningForeground: var(--vscode-warningForeground, #cca700);
            --vscode-infoForeground: var(--vscode-infoForeground, #3794ff);
            --vscode-icon-foreground: var(--vscode-icon-foreground, #c5c5c5);
            --vscode-focusBorder: var(--vscode-focusBorder, #007fd4);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-background);
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            max-width: 1400px;
            margin: 0 auto;
            height: calc(100vh - 40px);
        }

        .header {
            text-align: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-textBlockQuote-border);
        }

        .title {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .template-preview {
            font-style: italic;
            color: var(--vscode-textLink-foreground);
            font-size: 0.9em;
        }

        .main-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            flex: 1;
            min-height: 0;
            height: calc(100vh - 180px);
        }

        .left-panel, .right-panel {
            display: flex;
            flex-direction: column;
            gap: 15px;
            min-height: 0;
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 12px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
            font-weight: 500;
        }

        .panel-title {
            font-size: 1.1em;
        }

        .controls {
            display: flex;
            gap: 10px;
        }

        button {
            padding: 6px 12px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.9em;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .variables-section {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-input-border);
        }

        .variable-item {
            margin-bottom: 20px;
            padding: 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 6px;
            border: 1px solid var(--vscode-textBlockQuote-border);
        }

        .variable-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .variable-name {
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }

        .variable-type-badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .variable-description {
            font-size: 0.9em;
            color: var(--vscode-input-placeholderForeground);
            margin-bottom: 12px;
        }

        .variable-controls {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 10px;
            align-items: center;
        }

        .quick-options {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 5px;
        }

        .quick-option-btn {
            padding: 2px 6px;
            font-size: 0.75em;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            white-space: nowrap;
        }

        .quick-option-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .type-select {
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            font-family: inherit;
            font-size: 0.9em;
        }

        .value-input {
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: 0.9em;
        }

        .value-input:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .empty-checkbox {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.9em;
        }

        .empty-checkbox input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: var(--vscode-button-background);
        }

        .preview-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
        }

        .sql-preview {
            flex: 1;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 15px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-input-foreground);
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: ${fontSize}px;
            line-height: 1.5;
            white-space: pre-wrap;
            overflow-y: auto;
            min-height: 300px;
            max-height: calc(100vh - 300px);
        }

        .template-original {
            font-size: 0.9em;
            color: var(--vscode-input-placeholderForeground);
            margin-bottom: 10px;
            white-space: pre-wrap;
            max-height: 150px;
            overflow-y: auto;
            padding: 12px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 3px;
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            line-height: 1.4;
        }

        .status-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8em;
            color: var(--vscode-input-placeholderForeground);
            margin-top: 10px;
        }

        /* SQL 语法高亮 - 由 highlight.js 提供 */

        @media (max-width: 1024px) {
            .main-content {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">Jinja2 Template Editor</div>
            <div class="template-preview">${templatePreview}</div>
        </div>

        <div class="main-content">
            <div class="left-panel">
                <div class="panel-header">
                    <span class="panel-title">变量配置</span>
                    <div class="controls">
                        <button class="btn-secondary" id="resetButton">
                            <span>↺</span> 重置默认值
                        </button>
                        <button class="btn-primary" id="refreshButton">
                            <span>↻</span> 刷新模板
                        </button>
                    </div>
                </div>

                <div class="variables-section" id="variablesContainer">
                    <!-- 变量控件将在这里动态生成 -->
                </div>
            </div>

            <div class="right-panel">
                <div class="panel-header">
                    <span class="panel-title">SQL 预览</span>
                    <div class="controls">
                        <button class="btn-primary" id="copyButton">
                            <span>⎘</span> 复制到剪贴板
                        </button>
                    </div>
                </div>

                <div class="preview-section">
                    <div class="template-original" id="templateOriginal"></div>
                    <div class="sql-preview" id="sqlPreview">-- 请配置变量值生成 SQL...</div>
                    <div class="status-info">
                        <span id="statusInfo">准备就绪</span>
                        <span id="variableCount"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 引入外部库 - 使用 VS Code webview 最佳实践 -->
    <script nonce="${nonce}">
        // 库加载状态检查
        let librariesLoaded = {
            nunjucks: false,
            highlightJs: false
        };

        // 库加载错误处理
        function handleLibraryError(libraryName, error) {
            logError(\`Failed to load \${libraryName}:\`, error);
            // 通知 VS Code 显示错误信息
            if (window.vscode) {
                window.vscode.postMessage({
                    command: 'showError',
                    message: \`Failed to load \${libraryName} library. Please reinstall the extension.\`
                });
            }
        }

        // 检查库是否加载成功
        function checkLibrariesLoaded() {
            if (typeof nunjucks !== 'undefined') {
                librariesLoaded.nunjucks = true;
            }
            if (typeof hljs !== 'undefined') {
                librariesLoaded.highlightJs = true;
            }

            // 如果库未加载，显示错误信息
            setTimeout(() => {
                if (!librariesLoaded.nunjucks) {
                    handleLibraryError('nunjucks', new Error('nunjucks is not defined'));
                }
                if (!librariesLoaded.highlightJs) {
                    handleLibraryError('highlight.js', new Error('hljs is not defined'));
                }
            }, 2000);
        }
    </script>

    <!-- 引入 nunjucks 库 -->
    <script src="${nunjucksUri}" nonce="${nonce}" onerror="handleLibraryError('nunjucks', event)"></script>

    <!-- 引入 highlight.js 库 -->
    <script src="${highlightJsUri}" nonce="${nonce}" onerror="handleLibraryError('highlight.js', event)"></script>
    <link rel="stylesheet" href="${highlightCssUri}" nonce="${nonce}">

    <script nonce="${nonce}">
        // 从 VS Code 传递的数据
        const template = ${JSON.stringify(template)};
        const variables = ${variableConfigs};
        const logLevel = '${logLevel}';

        // 初始值
        let initialValues = ${initialValues};

        // 日志级别控制函数
        function shouldLog(level) {
            const levels = { 'none': 0, 'error': 1, 'warn': 2, 'info': 3, 'debug': 4 };
            return levels[level] <= levels[logLevel] || levels[level] <= levels['error'];
        }

        function logError(...args) {
            if (shouldLog('error')) {
                console.error(...args);
            }
        }

        function logWarn(...args) {
            if (shouldLog('warn')) {
                console.warn(...args);
            }
        }

        function logInfo(...args) {
            if (shouldLog('info')) {
                console.info(...args);
            }
        }

        function logDebug(...args) {
            if (shouldLog('debug')) {
                console.debug(...args);
            }
        }

        // 支持的类型
        const supportedTypes = [
            { value: 'string', label: '字符串 (String)', autoQuote: true },
            { value: 'number', label: '数字 (Number)', autoQuote: false },
            { value: 'date', label: '日期 (Date)', autoQuote: true },
            { value: 'datetime', label: '日期时间 (DateTime)', autoQuote: true },
            { value: 'boolean', label: '布尔值 (Boolean)', autoQuote: false },
            { value: 'null', label: '空值 (NULL)', autoQuote: false }
        ];

        // 快捷日期时间选项
        const quickDateOptions = [
            { label: '今天', value: 'today' },
            { label: '昨天', value: 'yesterday' },
            { label: '明天', value: 'tomorrow' },
            { label: '本周一', value: 'this_monday' },
            { label: '本周末', value: 'this_sunday' },
            { label: '本月1号', value: 'this_month_1st' },
            { label: '本月最后一天', value: 'this_month_last' }
        ];

        const quickTimeOptions = [
            { label: '当前时间 (00:00:00)', value: 'current_time' },
            { label: '准确时间 (系统时间)', value: 'exact_time' },
            { label: "字符串 '00:00:00'", value: 'string_000000' }
        ];

        // 支持的过滤器列表
        const supportedFilters = [
            {
                group: '类型转换',
                filters: [
                    { name: 'float', description: '转换为浮点数' },
                    { name: 'int', description: '转换为整数' },
                    { name: 'string', description: '转换为字符串' },
                    { name: 'bool', description: '转换为布尔值' }
                ]
            },
            {
                group: 'SQL相关',
                filters: [
                    { name: 'sql_quote', description: 'SQL引号转义' },
                    { name: 'sql_identifier', description: 'SQL标识符引号' },
                    { name: 'sql_date', description: 'SQL日期格式化' },
                    { name: 'sql_datetime', description: 'SQL日期时间格式化' },
                    { name: 'sql_in', description: 'SQL IN 子句格式化' }
                ]
            },
            {
                group: '数学运算',
                filters: [
                    { name: 'abs', description: '绝对值' },
                    { name: 'round', description: '四舍五入' },
                    { name: 'sum', description: '求和' },
                    { name: 'min', description: '最小值' },
                    { name: 'max', description: '最大值' }
                ]
            },
            {
                group: '字符串处理',
                filters: [
                    { name: 'length', description: '字符串长度' },
                    { name: 'default', description: '默认值' },
                    { name: 'striptags', description: '移除HTML标签' },
                    { name: 'truncate', description: '截断字符串' },
                    { name: 'wordwrap', description: '自动换行' },
                    { name: 'urlencode', description: 'URL编码' }
                ]
            },
            {
                group: '列表处理',
                filters: [
                    { name: 'unique', description: '去重' },
                    { name: 'reverse', description: '反转' },
                    { name: 'first', description: '第一个元素' },
                    { name: 'last', description: '最后一个元素' },
                    { name: 'slice', description: '切片' }
                ]
            }
        ];

        // 获取快捷日期值
        function getQuickDateValue(option) {
            const now = new Date();
            const pad = (num) => num.toString().padStart(2, '0');

            switch (option) {
                case 'today':
                    return \`\${now.getFullYear()}-\${pad(now.getMonth() + 1)}-\${pad(now.getDate())}\`;
                case 'yesterday':
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    return \`\${yesterday.getFullYear()}-\${pad(yesterday.getMonth() + 1)}-\${pad(yesterday.getDate())}\`;
                case 'tomorrow':
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return \`\${tomorrow.getFullYear()}-\${pad(tomorrow.getMonth() + 1)}-\${pad(tomorrow.getDate())}\`;
                case 'this_monday':
                    const monday = new Date(now);
                    const day = now.getDay();
                    const diff = day === 0 ? -6 : 1 - day;
                    monday.setDate(monday.getDate() + diff);
                    return \`\${monday.getFullYear()}-\${pad(monday.getMonth() + 1)}-\${pad(monday.getDate())}\`;
                case 'this_sunday':
                    const sunday = new Date(now);
                    const day2 = now.getDay();
                    const diff2 = day2 === 0 ? 0 : 7 - day2;
                    sunday.setDate(sunday.getDate() + diff2);
                    return \`\${sunday.getFullYear()}-\${pad(sunday.getMonth() + 1)}-\${pad(sunday.getDate())}\`;
                case 'this_month_1st':
                    return \`\${now.getFullYear()}-\${pad(now.getMonth() + 1)}-01\`;
                case 'this_month_last':
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    return \`\${lastDay.getFullYear()}-\${pad(lastDay.getMonth() + 1)}-\${pad(lastDay.getDate())}\`;
                default:
                    return \`\${now.getFullYear()}-\${pad(now.getMonth() + 1)}-\${pad(now.getDate())}\`;
            }
        }

        // 获取快捷时间值
        function getQuickTimeValue(option) {
            const now = new Date();
            const pad = (num) => num.toString().padStart(2, '0');

            switch (option) {
                case 'current_time':
                    return '00:00:00';
                case 'exact_time':
                    return \`\${pad(now.getHours())}:\${pad(now.getMinutes())}:\${pad(now.getSeconds())}\`;
                case 'string_000000':
                    return '00:00:00';
                default:
                    return \`\${pad(now.getHours())}:\${pad(now.getMinutes())}:\${pad(now.getSeconds())}\`;
            }
        }

        // 初始化页面
        document.addEventListener('DOMContentLoaded', function() {
            // 首先检查库是否加载
            checkLibrariesLoaded();

            displayTemplate();
            generateVariableControls();
            refreshTemplate();

            // 添加按钮事件监听器
            document.getElementById('resetButton').addEventListener('click', resetToDefaults);
            document.getElementById('refreshButton').addEventListener('click', refreshTemplate);
            document.getElementById('copyButton').addEventListener('click', copyToClipboard);
        });

        // 获取变量的过滤器
        function getVariableFilters(variableName) {
            const variable = variables.find(v => v.name === variableName);
            return variable ? variable.filters || [] : [];
        }

        // 设置变量的过滤器
        function setVariableFilters(variableName, filters) {
            const variable = variables.find(v => v.name === variableName);
            if (variable) {
                variable.filters = filters;
                refreshTemplate();
            }
        }

        // 生成过滤器选择器
        function createFilterSelector(variableName) {
            const container = document.createElement('div');
            container.className = 'filter-selector';
            container.style.marginTop = '10px';
            container.style.padding = '10px';
            container.style.backgroundColor = 'var(--vscode-textBlockQuote-background)';
            container.style.borderRadius = '4px';
            container.style.border = '1px solid var(--vscode-textBlockQuote-border)';

            const currentFilters = getVariableFilters(variableName);
            const hasFilters = currentFilters.length > 0;

            // 折叠/展开控制
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.alignItems = 'center';
            headerDiv.style.cursor = 'pointer';
            headerDiv.style.marginBottom = hasFilters ? '8px' : '0';

            const title = document.createElement('div');
            title.textContent = '过滤器 (Filters)';
            title.style.fontWeight = 'bold';
            title.style.fontSize = '0.9em';

            const filterCount = document.createElement('span');
            filterCount.textContent = currentFilters.length > 0 ? '(' + currentFilters.length + ')' : '';
            filterCount.style.fontSize = '0.8em';
            filterCount.style.color = 'var(--vscode-textLink-foreground)';
            filterCount.style.marginLeft = '5px';

            const collapseIcon = document.createElement('span');
            collapseIcon.textContent = hasFilters ? '▼' : '▶';
            collapseIcon.style.fontSize = '0.8em';
            collapseIcon.style.transition = 'transform 0.2s';

            const titleContainer = document.createElement('div');
            titleContainer.appendChild(title);
            titleContainer.appendChild(filterCount);

            headerDiv.appendChild(titleContainer);
            headerDiv.appendChild(collapseIcon);
            container.appendChild(headerDiv);

            // 默认折叠状态
            const isCollapsed = !hasFilters;

            // 过滤器内容区域
            const filterGroups = document.createElement('div');
            filterGroups.style.display = isCollapsed ? 'none' : 'flex';
            filterGroups.style.flexDirection = 'column';
            filterGroups.style.gap = '8px';

            // 已选择的过滤器显示区域
            const selectedFiltersDiv = document.createElement('div');
            selectedFiltersDiv.style.marginBottom = '8px';
            selectedFiltersDiv.style.padding = '8px';
            selectedFiltersDiv.style.backgroundColor = 'var(--vscode-editor-background)';
            selectedFiltersDiv.style.borderRadius = '3px';
            selectedFiltersDiv.style.border = '1px solid var(--vscode-input-border)';
            selectedFiltersDiv.style.display = currentFilters.length > 0 ? 'block' : 'none';

            const selectedTitle = document.createElement('div');
            selectedTitle.textContent = '已选择的过滤器 (按顺序处理):';
            selectedTitle.style.fontSize = '0.8em';
            selectedTitle.style.marginBottom = '5px';
            selectedTitle.style.color = 'var(--vscode-textLink-foreground)';
            selectedFiltersDiv.appendChild(selectedTitle);

            const selectedFiltersList = document.createElement('div');
            selectedFiltersList.style.display = 'flex';
            selectedFiltersList.style.flexWrap = 'wrap';
            selectedFiltersList.style.gap = '4px';
            selectedFiltersList.id = 'selectedFilters_' + variableName.replace(/[^a-zA-Z0-9_]/g, '_');
            selectedFiltersDiv.appendChild(selectedFiltersList);

            filterGroups.appendChild(selectedFiltersDiv);

            // 更新已选择过滤器显示
            function updateSelectedFiltersDisplay() {
                const currentFilters = getVariableFilters(variableName);
                selectedFiltersList.innerHTML = '';

                if (currentFilters.length === 0) {
                    selectedFiltersDiv.style.display = 'none';
                } else {
                    selectedFiltersDiv.style.display = 'block';

                    currentFilters.forEach((filterName, index) => {
                        const filterChip = document.createElement('div');
                        filterChip.style.display = 'flex';
                        filterChip.style.alignItems = 'center';
                        filterChip.style.gap = '4px';
                        filterChip.style.padding = '2px 6px';
                        filterChip.style.backgroundColor = 'var(--vscode-button-background)';
                        filterChip.style.color = 'var(--vscode-button-foreground)';
                        filterChip.style.borderRadius = '3px';
                        filterChip.style.fontSize = '0.75em';

                        const filterText = document.createElement('span');
                        filterText.textContent = filterName;
                        filterChip.appendChild(filterText);

                        // 顺序控制按钮
                        if (currentFilters.length > 1) {
                            if (index > 0) {
                                const upBtn = document.createElement('button');
                                upBtn.textContent = '↑';
                                upBtn.style.padding = '1px 4px';
                                upBtn.style.fontSize = '0.7em';
                                upBtn.style.border = 'none';
                                upBtn.style.borderRadius = '2px';
                                upBtn.style.cursor = 'pointer';
                                upBtn.onclick = () => moveFilterUp(variableName, index);
                                filterChip.appendChild(upBtn);
                            }

                            if (index < currentFilters.length - 1) {
                                const downBtn = document.createElement('button');
                                downBtn.textContent = '↓';
                                downBtn.style.padding = '1px 4px';
                                downBtn.style.fontSize = '0.7em';
                                downBtn.style.border = 'none';
                                downBtn.style.borderRadius = '2px';
                                downBtn.style.cursor = 'pointer';
                                downBtn.onclick = () => moveFilterDown(variableName, index);
                                filterChip.appendChild(downBtn);
                            }
                        }

                        // 删除按钮
                        const removeBtn = document.createElement('button');
                        removeBtn.textContent = '×';
                        removeBtn.style.padding = '1px 4px';
                        removeBtn.style.fontSize = '0.7em';
                        removeBtn.style.border = 'none';
                        removeBtn.style.borderRadius = '2px';
                        removeBtn.style.cursor = 'pointer';
                        removeBtn.style.marginLeft = '4px';
                        removeBtn.onclick = () => removeFilter(variableName, filterName);
                        filterChip.appendChild(removeBtn);

                        selectedFiltersList.appendChild(filterChip);
                    });
                }

                // 更新计数
                filterCount.textContent = currentFilters.length > 0 ? '(' + currentFilters.length + ')' : '';
                collapseIcon.textContent = currentFilters.length > 0 ? '▼' : '▶';
            }

            // 移动过滤器顺序
            function moveFilterUp(variableName, index) {
                const currentFilters = getVariableFilters(variableName);
                if (index > 0) {
                    const newFilters = [...currentFilters];
                    [newFilters[index - 1], newFilters[index]] = [newFilters[index], newFilters[index - 1]];
                    setVariableFilters(variableName, newFilters);
                    updateSelectedFiltersDisplay();
                    refreshTemplate();
                }
            }

            function moveFilterDown(variableName, index) {
                const currentFilters = getVariableFilters(variableName);
                if (index < currentFilters.length - 1) {
                    const newFilters = [...currentFilters];
                    [newFilters[index], newFilters[index + 1]] = [newFilters[index + 1], newFilters[index]];
                    setVariableFilters(variableName, newFilters);
                    updateSelectedFiltersDisplay();
                    refreshTemplate();
                }
            }

            function removeFilter(variableName, filterName) {
                const currentFilters = getVariableFilters(variableName);
                const newFilters = currentFilters.filter(f => f !== filterName);
                setVariableFilters(variableName, newFilters);
                updateSelectedFiltersDisplay();
                refreshTemplate();
            }

            // 折叠/展开功能
            headerDiv.addEventListener('click', () => {
                const isHidden = filterGroups.style.display === 'none';
                filterGroups.style.display = isHidden ? 'flex' : 'none';
                collapseIcon.textContent = isHidden ? '▼' : '▶';
            });

            // 生成过滤器选择按钮
            supportedFilters.forEach(group => {
                const groupDiv = document.createElement('div');

                const groupTitle = document.createElement('div');
                groupTitle.textContent = group.group;
                groupTitle.style.fontSize = '0.8em';
                groupTitle.style.color = 'var(--vscode-textLink-foreground)';
                groupTitle.style.marginBottom = '4px';
                groupDiv.appendChild(groupTitle);

                const filtersDiv = document.createElement('div');
                filtersDiv.style.display = 'flex';
                filtersDiv.style.flexWrap = 'wrap';
                filtersDiv.style.gap = '4px';

                group.filters.forEach(filter => {
                    const filterButton = document.createElement('button');
                    filterButton.className = 'filter-btn';
                    filterButton.textContent = filter.name;
                    filterButton.title = filter.description;
                    filterButton.style.padding = '2px 8px';
                    filterButton.style.fontSize = '0.75em';
                    filterButton.style.borderRadius = '3px';
                    filterButton.style.border = '1px solid var(--vscode-input-border)';
                    filterButton.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                    filterButton.style.color = 'var(--vscode-button-secondaryForeground)';
                    filterButton.style.cursor = 'pointer';

                    // 检查是否已选择
                    const currentFilters = getVariableFilters(variableName);
                    if (currentFilters.includes(filter.name)) {
                        filterButton.style.backgroundColor = 'var(--vscode-button-background)';
                        filterButton.style.color = 'var(--vscode-button-foreground)';
                    }

                    filterButton.addEventListener('click', () => {
                        const currentFilters = getVariableFilters(variableName);
                        let newFilters;

                        if (currentFilters.includes(filter.name)) {
                            newFilters = currentFilters.filter(f => f !== filter.name);
                        } else {
                            newFilters = [...currentFilters, filter.name];
                        }

                        setVariableFilters(variableName, newFilters);
                        updateSelectedFiltersDisplay();
                        updateFilterButtonStyles();
                    });

                    filtersDiv.appendChild(filterButton);
                });

                groupDiv.appendChild(filtersDiv);
                filterGroups.appendChild(groupDiv);
            });

            container.appendChild(filterGroups);

            // 添加样式
            const style = document.createElement('style');
            style.textContent = \`
                .filter-btn:hover {
                    background-color: var(--vscode-button-secondaryHoverBackground) !important;
                    color: var(--vscode-button-secondaryForeground) !important;
                }
                .filter-btn.selected {
                    background-color: var(--vscode-button-background) !important;
                    color: var(--vscode-button-foreground) !important;
                }
            \`;
            container.appendChild(style);

            // 更新按钮样式的函数
            window.updateFilterButtonStyles = function() {
                const currentFilters = getVariableFilters(variableName);
                const buttons = container.querySelectorAll('.filter-btn');
                buttons.forEach(button => {
                    if (currentFilters.includes(button.textContent)) {
                        button.classList.add('selected');
                        button.style.backgroundColor = 'var(--vscode-button-background)';
                        button.style.color = 'var(--vscode-button-foreground)';
                    } else {
                        button.classList.remove('selected');
                        button.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
                        button.style.color = 'var(--vscode-button-secondaryForeground)';
                    }
                });
            };

            // 初始化显示
            updateSelectedFiltersDisplay();

            return container;
        }

        // 显示模板
        function displayTemplate() {
            const templateElement = document.getElementById('templateOriginal');
            templateElement.textContent = template;
        }

        // 生成变量控件
        function generateVariableControls() {
            const container = document.getElementById('variablesContainer');
            container.innerHTML = '';

            variables.forEach(variable => {
                const div = document.createElement('div');
                div.className = 'variable-item';

                const typeLabel = supportedTypes.find(t => t.value === variable.type)?.label || variable.type;
                const safeName = variable.name.replace(/[^a-zA-Z0-9_]/g, '_');

                // 安全地创建HTML内容
                const headerDiv = document.createElement('div');
                headerDiv.className = 'variable-header';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'variable-name';
                nameSpan.textContent = variable.name;

                const typeSpan = document.createElement('span');
                typeSpan.className = 'variable-type-badge';
                typeSpan.textContent = typeLabel;

                // 显示当前选择的过滤器
                if (variable.filters && variable.filters.length > 0) {
                    const filterBadge = document.createElement('span');
                    filterBadge.className = 'variable-type-badge';
                    filterBadge.style.backgroundColor = 'var(--vscode-badge-background)';
                    filterBadge.style.color = 'var(--vscode-badge-foreground)';
                    filterBadge.textContent = variable.filters.join('|');
                    filterBadge.style.marginLeft = '5px';
                    headerDiv.appendChild(nameSpan);
                    headerDiv.appendChild(typeSpan);
                    headerDiv.appendChild(filterBadge);
                } else {
                    headerDiv.appendChild(nameSpan);
                    headerDiv.appendChild(typeSpan);
                }

                div.appendChild(headerDiv);

                if (variable.description) {
                    const descDiv = document.createElement('div');
                    descDiv.className = 'variable-description';
                    descDiv.textContent = variable.description;
                    div.appendChild(descDiv);
                }

                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'variable-controls';

                // 类型选择
                const typeSelect = document.createElement('select');
                typeSelect.className = 'type-select';
                typeSelect.id = 'type_' + safeName;

                supportedTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.value;
                    option.selected = type.value === variable.type;
                    option.textContent = type.label;
                    typeSelect.appendChild(option);
                });

                // 值输入
                const valueInput = document.createElement('input');
                valueInput.type = 'text';
                valueInput.className = 'value-input';
                valueInput.id = 'value_' + safeName;
                valueInput.placeholder = '输入 ' + variable.name + ' 的值';
                valueInput.value = formatValueForInput(initialValues[variable.name], variable.type);

                // 空值复选框
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-checkbox';

                const emptyCheckbox = document.createElement('input');
                emptyCheckbox.type = 'checkbox';
                emptyCheckbox.id = 'empty_' + safeName;

                const emptyLabel = document.createElement('label');
                emptyLabel.htmlFor = 'empty_' + safeName;
                emptyLabel.textContent = '空值';

                emptyDiv.appendChild(emptyCheckbox);
                emptyDiv.appendChild(emptyLabel);

                controlsDiv.appendChild(typeSelect);
                controlsDiv.appendChild(valueInput);
                controlsDiv.appendChild(emptyDiv);
                div.appendChild(controlsDiv);

                // 添加快捷选项区域
                const quickOptionsDiv = document.createElement('div');
                quickOptionsDiv.className = 'quick-options';
                quickOptionsDiv.id = 'quickOptions_' + safeName;

                // 根据类型显示不同的快捷选项
                function updateQuickOptions() {
                    const currentType = typeSelect.value;
                    quickOptionsDiv.innerHTML = '';

                    if (currentType === 'date') {
                        quickDateOptions.forEach(option => {
                            const btn = document.createElement('button');
                            btn.className = 'quick-option-btn';
                            btn.textContent = option.label;
                            btn.onclick = () => {
                                valueInput.value = getQuickDateValue(option.value);
                                updateVariable(variable.name);
                            };
                            quickOptionsDiv.appendChild(btn);
                        });
                    } else if (currentType === 'datetime') {
                        // 为日期时间类型同时显示日期和时间快捷选项
                        quickDateOptions.forEach(option => {
                            const btn = document.createElement('button');
                            btn.className = 'quick-option-btn';
                            btn.textContent = option.label;
                            btn.onclick = () => {
                                const currentValue = valueInput.value;
                                const timeMatch = currentValue.match(/ (\d{2}:\d{2}:\d{2})$/);
                                const timePart = timeMatch ? timeMatch[1] : ' 00:00:00';
                                valueInput.value = getQuickDateValue(option.value) + timePart;
                                updateVariable(variable.name);
                            };
                            quickOptionsDiv.appendChild(btn);
                        });

                        // 添加分隔线
                        const separator = document.createElement('span');
                        separator.textContent = '|';
                        separator.style.margin = '0 5px';
                        quickOptionsDiv.appendChild(separator);

                        quickTimeOptions.forEach(option => {
                            const btn = document.createElement('button');
                            btn.className = 'quick-option-btn';
                            btn.textContent = option.label;
                            btn.onclick = () => {
                                const currentValue = valueInput.value;
                                const dateMatch = currentValue.match(/^(\d{4}-\d{2}-\d{2})/);
                                const datePart = dateMatch ? dateMatch[1] : getQuickDateValue('today');
                                valueInput.value = datePart + ' ' + getQuickTimeValue(option.value);
                                updateVariable(variable.name);
                            };
                            quickOptionsDiv.appendChild(btn);
                        });
                    }
                }

                // 初始显示快捷选项
                updateQuickOptions();

                // 类型改变时更新快捷选项
                typeSelect.addEventListener('change', () => {
                    updateVariableType(variable.name);
                    updateQuickOptions();
                });

                div.appendChild(quickOptionsDiv);

                // 添加过滤器选择器
                const filterSelector = createFilterSelector(variable.name);
                div.appendChild(filterSelector);

                // 添加事件监听器
                valueInput.addEventListener('input', () => updateVariable(variable.name));
                valueInput.addEventListener('change', () => updateVariable(variable.name));
                emptyCheckbox.addEventListener('change', () => toggleEmptyValue(variable.name));

                container.appendChild(div);
            });

            // 初始化布尔选择框
            variables.forEach(variable => {
                if (variable.type === 'boolean') {
                    replaceWithBooleanSelect(variable.name);
                }
            });

            updateVariableCount();
        }

        // 格式化值用于输入框
        function formatValueForInput(value, type) {
            if (value === null || value === undefined) {
                return '';
            }

            if (type === 'string' && typeof value === 'string') {
                return value;
            }

            if (type === 'number' && typeof value === 'number') {
                return String(value);
            }

            if (type === 'boolean' && typeof value === 'boolean') {
                return value ? 'true' : 'false';
            }

            if (type === 'date') {
                return String(value);
            }

            return String(value);
        }

        // 更新变量类型
        function updateVariableType(variableName) {
            const safeName = variableName.replace(/[^a-zA-Z0-9_]/g, '_');
            const typeSelect = document.getElementById('type_' + safeName);
            if (!typeSelect) return;

            const newType = typeSelect.value;

            // 更新变量类型
            const variable = variables.find(v => v.name === variableName);
            if (variable) {
                variable.type = newType;

                // 如果新类型是 null，自动选中空值复选框
                if (newType === 'null') {
                    const emptyCheckbox = document.getElementById('empty_' + safeName);
                    if (emptyCheckbox) {
                        emptyCheckbox.checked = true;
                        toggleEmptyValue(variableName);
                    }
                } else {
                    // 更新默认值
                    const valueInput = document.getElementById('value_' + safeName);
                    if (valueInput) {
                        valueInput.value = formatValueForInput(getDefaultForType(newType), newType);

                        // 如果是布尔类型，替换为选择框
                        if (newType === 'boolean') {
                            replaceWithBooleanSelect(variableName);
                        } else {
                            // 确保是文本输入框
                            if (valueInput.tagName === 'SELECT') {
                                replaceWithTextInput(variableName);
                            }
                        }
                    }

                    // 清除空值复选框
                    const emptyCheckbox = document.getElementById('empty_' + safeName);
                    if (emptyCheckbox) {
                        emptyCheckbox.checked = false;
                    }

                    updateVariable(variableName);
                }
            }

            refreshTemplate();
        }

        // 获取类型的默认值
        function getDefaultForType(type) {
            const now = new Date();
            const pad = (num) => num.toString().padStart(2, '0');
            const today = \`\${now.getFullYear()}-\${pad(now.getMonth() + 1)}-\${pad(now.getDate())}\`;
            const nowTime = \`\${pad(now.getHours())}:\${pad(now.getMinutes())}:\${pad(now.getSeconds())}\`;

            switch (type) {
                case 'string': return 'demo_string';
                case 'number': return 42;
                case 'date': return today;
                case 'datetime': return today + ' ' + nowTime;
                case 'boolean': return true;
                case 'null': return null;
                default: return null;
            }
        }

        // 更新变量值
        function updateVariable(variableName) {
            const safeName = variableName.replace(/[^a-zA-Z0-9_]/g, '_');
            const valueInput = document.getElementById('value_' + safeName);
            const typeSelect = document.getElementById('type_' + safeName);
            const emptyCheckbox = document.getElementById('empty_' + safeName);

            if (!valueInput || !typeSelect || !emptyCheckbox) return;

            let value;

            if (emptyCheckbox.checked) {
                value = null;
            } else {
                const inputValue = valueInput.value;
                const type = typeSelect.value;

                value = parseValueByType(inputValue, type);
            }

            initialValues[variableName] = value;
            refreshTemplate();
        }

        // 切换空值
        function toggleEmptyValue(variableName) {
            const safeName = variableName.replace(/[^a-zA-Z0-9_]/g, '_');
            const emptyCheckbox = document.getElementById('empty_' + safeName);
            const valueInput = document.getElementById('value_' + safeName);

            if (!emptyCheckbox || !valueInput) return;

            if (emptyCheckbox.checked) {
                valueInput.disabled = true;
                valueInput.value = '';
                initialValues[variableName] = null;
            } else {
                valueInput.disabled = false;
                const typeSelect = document.getElementById('type_' + safeName);
                const type = typeSelect ? typeSelect.value : 'string';
                valueInput.value = formatValueForInput(getDefaultForType(type), type);
                initialValues[variableName] = getDefaultForType(type);
            }

            refreshTemplate();
        }

        // 根据类型解析值
        function parseValueByType(inputValue, type) {
            if (!inputValue.trim()) {
                return getDefaultForType(type);
            }

            switch (type) {
                case 'string':
                    return inputValue;
                case 'number':
                    const num = Number(inputValue);
                    return isNaN(num) ? getDefaultForType(type) : num;
                case 'date':
                    return inputValue;
                case 'boolean':
                    const lowerBoolValue = inputValue.toLowerCase();
                    if (lowerBoolValue === 'false' || lowerBoolValue === '0' || lowerBoolValue === '' || lowerBoolValue === 'null') {
                        return false;
                    }
                    return lowerBoolValue === 'true' || lowerBoolValue === '1';
                case 'null':
                    return null;
                default:
                    return inputValue;
            }
        }

        // 替换为布尔选择框
        function replaceWithBooleanSelect(variableName) {
            const safeName = variableName.replace(/[^a-zA-Z0-9_]/g, '_');
            const valueInput = document.getElementById('value_' + safeName);
            if (!valueInput) return;

            // 创建选择框
            const select = document.createElement('select');
            select.id = 'value_' + safeName;
            select.className = 'value-input boolean-select';

            // 添加选项
            const trueOption = document.createElement('option');
            trueOption.value = 'true';
            trueOption.textContent = 'True (真)';

            const falseOption = document.createElement('option');
            falseOption.value = 'false';
            falseOption.textContent = 'False (假)';

            select.appendChild(trueOption);
            select.appendChild(falseOption);

            // 保持当前值
            const currentValue = initialValues[variableName];
            select.value = String(currentValue === false ? 'false' : (currentValue === true ? 'true' : currentValue));

            // 复制事件监听器
            select.addEventListener('input', () => updateVariable(variableName));
            select.addEventListener('change', () => updateVariable(variableName));

            // 替换输入框
            valueInput.parentNode.replaceChild(select, valueInput);
        }

        // 替换为文本输入框
        function replaceWithTextInput(variableName) {
            const safeName = variableName.replace(/[^a-zA-Z0-9_]/g, '_');
            const select = document.getElementById('value_' + safeName);
            if (!select || select.tagName !== 'SELECT') return;

            // 创建文本输入框
            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'value_' + safeName;
            input.className = 'value-input';
            input.placeholder = '输入 ' + variableName + ' 的值';

            // 保持当前值
            input.value = formatValueForInput(initialValues[variableName], 'string');

            // 复制事件监听器
            input.addEventListener('input', () => updateVariable(variableName));
            input.addEventListener('change', () => updateVariable(variableName));

            // 替换选择框
            select.parentNode.replaceChild(input, select);
        }

        // SQL 语法高亮 - 使用 highlight.js 库提供高性能语法高亮
        function highlightSQL(sql) {
            try {
                // 检查 highlight.js 是否可用
                if (typeof hljs === 'undefined' || !hljs.highlight) {
                    return sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }

                // 使用 highlight.js 进行 SQL 语法高亮
                const result = hljs.highlight(sql, { language: 'sql' });
                return result.value;
            } catch (error) {
                // 如果 highlight.js 失败，返回转义后的纯文本
                return sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
        }

        // 构建嵌套上下文对象
        function buildNestedContext(flatContext) {
            const nested = {};

            Object.keys(flatContext).forEach(key => {
                // 检查是否是嵌套属性（包含点号）
                if (key.includes('.')) {
                    const parts = key.split('.');
                    let current = nested;

                    // 遍历路径，创建嵌套结构
                    for (let i = 0; i < parts.length - 1; i++) {
                        const part = parts[i];
                        if (!current[part]) {
                            current[part] = {};
                        }
                        current = current[part];
                    }

                    // 设置最终值
                    const lastPart = parts[parts.length - 1];
                    current[lastPart] = flatContext[key];
                } else {
                    // 直接属性
                    nested[key] = flatContext[key];
                }
            });

            return nested;
        }

        // 渲染模板 - 直接使用 nunjucks
        function renderTemplate(templateText, context, variablesList = null) {
            try {
                // 检查 nunjucks 是否可用
                if (typeof nunjucks === 'undefined' || !nunjucks.Environment) {
                    return fallbackRenderTemplate(templateText, context);
                }

                // 直接使用 nunjucks 渲染模板
                // 创建一个临时的 nunjucks 环境来处理模板渲染
                const tempEnv = new nunjucks.Environment(null, {
                    autoescape: false,
                    throwOnUndefined: false
                });

                // 启用 Jinja2 兼容模式（确保与 Python Jinja2 的兼容性）
                nunjucks.installJinjaCompat();

                // 添加常用的 SQL 相关过滤器，确保与 Python Jinja2 兼容
                tempEnv.addFilter('float', (value) => {
                    const num = parseFloat(value);
                    return isNaN(num) ? 0 : num;
                });

                tempEnv.addFilter('int', (value) => {
                    const num = parseInt(value, 10);
                    return isNaN(num) ? 0 : num;
                });

                tempEnv.addFilter('default', (value, defaultValue) => {
                    return value !== null && value !== undefined && value !== '' ? value : defaultValue;
                });

                // 添加常用的 length 过滤器
                tempEnv.addFilter('length', (value) => {
                    if (Array.isArray(value)) {
                        return value.length;
                    }
                    if (typeof value === 'string') {
                        return value.length;
                    }
                    if (typeof value === 'object' && value !== null) {
                        return Object.keys(value).length;
                    }
                    return 0;
                });

                // 处理上下文，确保数据类型正确传递给 nunjucks
                // 将扁平的变量名转换为嵌套对象结构
                const processedContext = buildNestedContext(context);

                // 为所有未定义的变量提供合理的默认值
                Object.keys(processedContext).forEach(key => {
                    if (processedContext[key] === null || processedContext[key] === undefined) {
                        // 根据变量名推断默认值类型
                        const varName = key.toLowerCase();
                        if (varName.includes('id') || varName.includes('count') || varName.includes('amount') || varName.includes('limit')) {
                            processedContext[key] = 42; // 数字默认值
                        } else if (varName.startsWith('is_') || varName.startsWith('has_') || varName.includes('include') || varName.includes('deleted')) {
                            processedContext[key] = false; // 布尔默认值
                        } else if (varName.includes('date') || varName.includes('time')) {
                            processedContext[key] = '2024-01-01'; // 日期默认值
                        } else {
                            processedContext[key] = 'demo_' + key; // 字符串默认值
                        }
                    }
                });

                // 确保布尔值的正确类型转换
                Object.keys(processedContext).forEach(key => {
                    const value = processedContext[key];
                    if (typeof value === 'string') {
                        const lowerValue = value.toLowerCase();
                        if (lowerValue === 'true' || lowerValue === 'false') {
                            processedContext[key] = lowerValue === 'true';
                        }
                    }
                });

                // 使用 nunjucks 渲染模板 - 这是核心功能
                let result = tempEnv.renderString(templateText, processedContext);

                // 后处理：处理 SQLAlchemy 占位符 :value
                result = result.replace(/:(\w+)\b/g, (match, placeholder) => {
                    const value = processedContext[placeholder];
                    if (value === null || value === undefined) {
                        return 'NULL';
                    }

                    if (typeof value === 'string') {
                        return "'" + value.replace(/'/g, "''") + "'";
                    }
                    if (typeof value === 'boolean') {
                        return value ? 'TRUE' : 'FALSE';
                    }
                    if (value instanceof Date) {
                        return "'" + value.toISOString().replace('T', ' ').replace('Z', '') + "'";
                    }

                    return String(value);
                });

                return result;
            } catch (error) {
                logError('nunjucks 渲染失败:', error);
                logError('模板:', templateText);
                logError('上下文:', context);
                // 如果 nunjucks 渲染失败，回退到简单渲染
                return fallbackRenderTemplate(templateText, context);
            }
        }

        // 备选的简单渲染方法
        function fallbackRenderTemplate(templateText, context) {
            let result = templateText;

            // 处理变量 {{ variable }} (简单替换)
            result = result.replace(/\{\{\s*([^}|]+)\s*(?:\|[^}]*)?\s*\}\}/g, (match, varPart) => {
                const varName = varPart.trim();
                let value = context[varName];

                if (value === null || value === undefined) {
                    return 'demo_' + varName;
                }

                // 智能类型格式化
                let shouldQuote = true;

                if (varName.includes('id') || varName.includes('count') ||
                    varName.includes('limit') || varName.includes('offset') ||
                    varName.includes('max') || varName.includes('min')) {
                    shouldQuote = false;
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                        value = numValue;
                    }
                } else if (varName.startsWith('is_') || varName.startsWith('has_')) {
                    shouldQuote = false;
                    value = Boolean(value);
                } else if (typeof value === 'number' || typeof value === 'boolean') {
                    shouldQuote = false;
                }

                if (!shouldQuote) {
                    if (typeof value === 'boolean') {
                        return value ? 'TRUE' : 'FALSE';
                    }
                    return String(value);
                } else {
                    const templateHasQuotes = templateText.includes("'{{ " + varName + " }}'") ||
                                            templateText.includes('"{{ ' + varName + ' }}"');

                    if (templateHasQuotes) {
                        return value.replace(/'/g, "''");
                    } else {
                        return "'" + value.replace(/'/g, "''") + "'";
                    }
                }
            });

            // 处理 if 语句
            result = result.replace(/\{%\s*if\s+([^}]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (match, condition, content) => {
                try {
                    const conditionResult = evaluateCondition(condition, context);
                    return conditionResult ? content : '';
                } catch (e) {
                    return '';
                }
            });

            return result;
        }

        // 解析变量表达式
        function parseVariableExpression(expr) {
            const parts = expr.split('|').map(part => part.trim());
            const variableName = parts[0];
            const filters = parts.slice(1).map(filterPart => {
                // 处理带参数的过滤器
                const filterMatch = filterPart.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\([^)]*\))?/);
                return filterMatch ? filterMatch[1] : filterPart;
            });
            return { variableName, filters };
        }

        // 应用过滤器
        function applyFilters(value, filters) {
            let result = value;

            filters.forEach(filterName => {
                switch (filterName) {
                    case 'float':
                        result = parseFloat(result);
                        break;
                    case 'int':
                        result = parseInt(result, 10);
                        break;
                    case 'string':
                        result = String(result);
                        break;
                    case 'bool':
                        if (typeof result === 'string') {
                            const lower = result.toLowerCase();
                            result = lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
                        } else {
                            result = Boolean(result);
                        }
                        break;
                    case 'abs':
                        result = Math.abs(Number(result));
                        break;
                    case 'round':
                        result = Math.round(Number(result));
                        break;
                    case 'length':
                        result = String(result).length;
                        break;
                    case 'default':
                        // 简单的默认值处理
                        if (result === null || result === undefined || result === '') {
                            result = 'default_value';
                        }
                        break;
                    case 'striptags':
                        result = String(result).replace(/<[^>]*>/g, '');
                        break;
                    case 'truncate':
                        result = String(result).substring(0, 255) + '...';
                        break;
                    case 'unique':
                        if (Array.isArray(result)) {
                            result = [...new Set(result)];
                        }
                        break;
                    case 'reverse':
                        if (Array.isArray(result)) {
                            result = [...result].reverse();
                        } else if (typeof result === 'string') {
                            result = result.split('').reverse().join('');
                        }
                        break;
                    case 'first':
                        if (Array.isArray(result)) {
                            result = result[0];
                        }
                        break;
                    case 'last':
                        if (Array.isArray(result)) {
                            result = result[result.length - 1];
                        }
                        break;
                    case 'slice':
                        if (Array.isArray(result)) {
                            result = result.slice(0, 10);
                        }
                        break;
                    case 'urlencode':
                        result = encodeURIComponent(String(result));
                        break;
                    case 'sql_quote':
                        if (typeof result === 'string') {
                            result = "'" + result.replace(/'/g, "''") + "'";
                        }
                        break;
                    case 'sql_identifier':
                        if (typeof result === 'string') {
                            result = '"' + result.replace(/"/g, '""') + '"';
                        }
                        break;
                    case 'sql_date':
                        if (result instanceof Date) {
                            result = result.toISOString().split('T')[0];
                        } else {
                            const date = new Date(result);
                            result = date.toISOString().split('T')[0];
                        }
                        break;
                    case 'sql_datetime':
                        if (result instanceof Date) {
                            result = result.toISOString().replace('T', ' ').replace('Z', '');
                        } else {
                            const date = new Date(result);
                            result = date.toISOString().replace('T', ' ').replace('Z', '');
                        }
                        break;
                    case 'sql_in':
                        if (Array.isArray(result)) {
                            result = result.map(item => {
                                if (typeof item === 'string') {
                                    return "'" + item.replace(/'/g, "''") + "'";
                                }
                                return String(item);
                            }).join(', ');
                        } else {
                            result = "'" + String(result).replace(/'/g, "''") + "'";
                        }
                        break;
                }
            });

            return result;
        }

        // 简单的条件评估
        function evaluateCondition(condition, context) {
            // 处理变量存在性检查
            if (condition.trim()) {
                const varName = condition.trim();
                const value = context[varName];

                // 处理布尔值（包括字符串形式的布尔值）
                if (typeof value === 'boolean') {
                    return value;
                }

                // 处理字符串形式的布尔值
                if (typeof value === 'string') {
                    const lowerValue = value.toLowerCase();
                    if (lowerValue === 'false' || lowerValue === '0' || lowerValue === '' || lowerValue === 'null') {
                        return false;
                    }
                    if (lowerValue === 'true' || lowerValue === '1') {
                        return true;
                    }
                }

                // 处理数字0
                if (typeof value === 'number') {
                    return value !== 0;
                }

                // 默认条件检查
                return value !== null && value !== undefined && value !== 0 && value !== '';
            }
            return false;
        }

        // 刷新模板
        function refreshTemplate() {
            const statusInfo = document.getElementById('statusInfo');
            const sqlPreview = document.getElementById('sqlPreview');

            try {
                // 处理 SQLAlchemy 占位符
                let processedTemplate = template;
                const sqlalchemyVars = [];

                // 查找所有 SQLAlchemy 占位符
                const sqlalchemyRegex = /:(\w+)\b/g;
                let match;
                while ((match = sqlalchemyRegex.exec(template)) !== null) {
                    sqlalchemyVars.push(match[1]);
                }

                // 渲染模板（包含过滤器信息）
                const renderedSQL = renderTemplate(processedTemplate, initialValues, variables);

                // 应用语法高亮
                sqlPreview.innerHTML = highlightSQL(renderedSQL);

                // 更新状态
                statusInfo.textContent = '模板渲染成功';

                // 更新变量数量
                updateVariableCount();

            } catch (error) {
                logError('模板渲染错误:', error);
                statusInfo.textContent = '模板渲染失败';
                sqlPreview.textContent = '渲染错误: ' + error.message;

                // 通知 VS Code
                if (vscode) {
                    vscode.postMessage({
                        command: 'showError',
                        message: 'Template rendering failed: ' + error.message
                    });
                }
            }
        }

        // 更新变量数量显示
        function updateVariableCount() {
            const variableCount = document.getElementById('variableCount');
            const setVars = Object.keys(initialValues).filter(key => {
                const value = initialValues[key];
                return value !== null && value !== undefined && value !== '';
            }).length;

            variableCount.textContent = \`已设置 \${setVars}/\${variables.length} 个变量\`;
        }

        // 重置为默认值
        function resetToDefaults() {
            variables.forEach(variable => {
                const safeName = variable.name.replace(/[^a-zA-Z0-9_]/g, '_');
                const typeSelect = document.getElementById('type_' + safeName);
                const valueInput = document.getElementById('value_' + safeName);
                const emptyCheckbox = document.getElementById('empty_' + safeName);

                if (!typeSelect || !valueInput || !emptyCheckbox) return;

                // 重置类型
                typeSelect.value = variable.type;

                // 清除空值
                emptyCheckbox.checked = false;
                valueInput.disabled = false;

                // 重置值
                initialValues[variable.name] = variable.defaultValue;
                valueInput.value = formatValueForInput(variable.defaultValue, variable.type);
            });

            refreshTemplate();
        }

        // 复制到剪贴板
        function copyToClipboard() {
            const sqlPreview = document.getElementById('sqlPreview');
            const text = sqlPreview.textContent || sqlPreview.innerText;

            if (!text.trim() || text === '-- 请配置变量值生成 SQL...') {
                if (vscode) {
                    vscode.postMessage({
                        command: 'showError',
                        message: 'No content to copy'
                    });
                }
                return;
            }

            if (vscode) {
                vscode.postMessage({
                    command: 'copyToClipboard',
                    text: text
                });
            }
        }

        // 调用 VS Code API
        function acquireVsCodeApi() {
            try {
                return acquireVsCodeApi();
            } catch (e) {
                return null;
            }
        }

        const vscode = acquireVsCodeApi();
    </script>
</body>
</html>`;
  }

  private sanitizeJsonString(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return JSON.stringify(value);
    }
    return JSON.stringify(String(value));
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

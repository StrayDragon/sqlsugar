import * as vscode from 'vscode';
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
            editor.resolvePromise = resolve;
            editor.rejectPromise = reject;
            editor.show(template, variables, title);
        });
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
                localResourceRoots: [],
                enableCommandUris: false
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

        this.panel.webview.onDidReceiveMessage(async (message) => {
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

    private getHtmlContent(webview: vscode.Webview, template: string, variables: Jinja2Variable[]): string {
        const nonce = getNonce();
        const templatePreview = template.substring(0, 100) + (template.length > 100 ? '...' : '');

        // 获取主题配置
        const theme = vscode.workspace.getConfiguration('sqlsugar').get<string>('sqlSyntaxHighlightTheme', 'vscode-dark');
        const fontSize = vscode.workspace.getConfiguration('sqlsugar').get<number>('sqlSyntaxHighlightFontSize', 14);

        // 构建变量初始值 - 使用安全的方式创建对象
        const initialValuesObj: Record<string, any> = {};
        variables.forEach(v => {
            initialValuesObj[v.name] = v.defaultValue;
        });
        const initialValues = JSON.stringify(initialValuesObj);

        // 构建变量配置 - 使用安全的方式创建数组
        const variableConfigs = JSON.stringify(variables.map(v => ({
            name: v.name,
            defaultValue: v.defaultValue,
            description: v.description || '',
            type: v.type
        })));

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
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

        /* SQL 语法高亮主题 */
        .theme-vscode-dark .sql-keyword { color: #569cd6; font-weight: bold; }
        .theme-vscode-dark .sql-string { color: #ce9178; }
        .theme-vscode-dark .sql-number { color: #b5cea8; }
        .theme-vscode-dark .sql-function { color: #dcdcaa; }
        .theme-vscode-dark .sql-operator { color: #d4d4d4; }
        .theme-vscode-dark .sql-comment { color: #6a9955; font-style: italic; }
        .theme-vscode-dark .sql-placeholder { color: #4ec9b0; font-weight: bold; }

        /* VSCode Light Theme */
        .theme-vscode-light .sql-keyword { color: #0000ff; font-weight: bold; }
        .theme-vscode-light .sql-string { color: #a31515; }
        .theme-vscode-light .sql-number { color: #098658; }
        .theme-vscode-light .sql-function { color: #795e26; }
        .theme-vscode-light .sql-operator { color: #000000; }
        .theme-vscode-light .sql-comment { color: #008000; font-style: italic; }
        .theme-vscode-light .sql-placeholder { color: #0070c0; font-weight: bold; }

        /* GitHub Dark Theme */
        .theme-github-dark .sql-keyword { color: #ff7b72; font-weight: bold; }
        .theme-github-dark .sql-string { color: #a5d6ff; }
        .theme-github-dark .sql-number { color: #79c0ff; }
        .theme-github-dark .sql-function { color: #d2a8ff; }
        .theme-github-dark .sql-operator { color: #c9d1d9; }
        .theme-github-dark .sql-comment { color: #8b949e; font-style: italic; }
        .theme-github-dark .sql-placeholder { color: #7ee787; font-weight: bold; }

        /* GitHub Light Theme */
        .theme-github-light .sql-keyword { color: #cf222e; font-weight: bold; }
        .theme-github-light .sql-string { color: #0a3069; }
        .theme-github-light .sql-number { color: #0550ae; }
        .theme-github-light .sql-function { color: #8250df; }
        .theme-github-light .sql-operator { color: #24292f; }
        .theme-github-light .sql-comment { color: #6e7781; font-style: italic; }
        .theme-github-light .sql-placeholder { color: #116329; font-weight: bold; }

        /* Monokai Theme */
        .theme-monokai .sql-keyword { color: #f92672; font-weight: bold; }
        .theme-monokai .sql-string { color: #e6db74; }
        .theme-monokai .sql-number { color: #ae81ff; }
        .theme-monokai .sql-function { color: #a6e22e; }
        .theme-monokai .sql-operator { color: #f8f8f2; }
        .theme-monokai .sql-comment { color: #75715e; font-style: italic; }
        .theme-monokai .sql-placeholder { color: #66d9ef; font-weight: bold; }

        /* Solarized Dark Theme */
        .theme-solarized-dark .sql-keyword { color: #268bd2; font-weight: bold; }
        .theme-solarized-dark .sql-string { color: #2aa198; }
        .theme-solarized-dark .sql-number { color: #d33682; }
        .theme-solarized-dark .sql-function { color: #859900; }
        .theme-solarized-dark .sql-operator { color: #93a1a1; }
        .theme-solarized-dark .sql-comment { color: #586e75; font-style: italic; }
        .theme-solarized-dark .sql-placeholder { color: #cb4b16; font-weight: bold; }

        /* Solarized Light Theme */
        .theme-solarized-light .sql-keyword { color: #268bd2; font-weight: bold; }
        .theme-solarized-light .sql-string { color: #2aa198; }
        .theme-solarized-light .sql-number { color: #d33682; }
        .theme-solarized-light .sql-function { color: #859900; }
        .theme-solarized-light .sql-operator { color: #586e75; }
        .theme-solarized-light .sql-comment { color: #93a1a1; font-style: italic; }
        .theme-solarized-light .sql-placeholder { color: #cb4b16; font-weight: bold; }

        /* Dracula Theme */
        .theme-dracula .sql-keyword { color: #ff79c6; font-weight: bold; }
        .theme-dracula .sql-string { color: #f1fa8c; }
        .theme-dracula .sql-number { color: #bd93f9; }
        .theme-dracula .sql-function { color: #50fa7b; }
        .theme-dracula .sql-operator { color: #f8f8f2; }
        .theme-dracula .sql-comment { color: #6272a4; font-style: italic; }
        .theme-dracula .sql-placeholder { color: #8be9fd; font-weight: bold; }

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
                    <div class="sql-preview theme-${theme}" id="sqlPreview">-- 请配置变量值生成 SQL...</div>
                    <div class="status-info">
                        <span id="statusInfo">准备就绪</span>
                        <span id="variableCount"></span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script nonce="${nonce}">
        // 从 VS Code 传递的数据
        const template = ${JSON.stringify(template)};
        const variables = ${variableConfigs};

        // 初始值
        let initialValues = ${initialValues};

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
            displayTemplate();
            generateVariableControls();
            refreshTemplate();

            // 添加按钮事件监听器
            document.getElementById('resetButton').addEventListener('click', resetToDefaults);
            document.getElementById('refreshButton').addEventListener('click', refreshTemplate);
            document.getElementById('copyButton').addEventListener('click', copyToClipboard);
        });

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

                headerDiv.appendChild(nameSpan);
                headerDiv.appendChild(typeSpan);
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

                // 添加事件监听器
                valueInput.addEventListener('change', () => updateVariable(variable.name));
                emptyCheckbox.addEventListener('change', () => toggleEmptyValue(variable.name));

                container.appendChild(div);
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
                    return inputValue.toLowerCase() === 'true' || inputValue === '1';
                case 'null':
                    return null;
                default:
                    return inputValue;
            }
        }

        // SQL 语法高亮
        function highlightSQL(sql) {
            return sql
                // 关键字
                .replace(/\\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|INSERT|INTO|VALUES|UPDATE|SET|DELETE|JOIN|INNER|LEFT|RIGHT|OUTER|ON|GROUP|BY|HAVING|ORDER|ASC|DESC|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END|EXISTS|TRUE|FALSE)\\b/g, '<span class="sql-keyword">$1</span>')
                // 字符串
                .replace(/'([^']|(\\\\'))*'/g, '<span class="sql-string">$&</span>')
                // 数字
                .replace(/\\b\\d+(\\.\\d+)?\\b/g, '<span class="sql-number">$&</span>')
                // 函数
                .replace(/\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*\\(/g, '<span class="sql-function">$1</span>(')
                // 占位符
                .replace(/:(\\w+)\\b/g, '<span class="sql-placeholder">$&</span>')
                // 注释
                .replace(/(--.*)$/gm, '<span class="sql-comment">$1</span>');
        }

        // 渲染模板
        function renderTemplate(templateText, context) {
            // 简单的 Jinja2 模板渲染
            let result = templateText;

            // 处理变量 {{ variable }}
            result = result.replace(/\\{\\{\\s*([^}]+)\\s*\\}\\}/g, (match, expr) => {
                const trimmedExpr = expr.trim();

                // 处理简单的变量访问
                if (!trimmedExpr.includes('.') && !trimmedExpr.includes('|')) {
                    const value = context[trimmedExpr];
                    if (value === null || value === undefined) {
                        return 'NULL';
                    }

                    // 处理 SQLAlchemy 占位符
                    if (String(value).startsWith(':')) {
                        return String(value);
                    }

                    // 根据类型格式化
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
                }

                // 更复杂的表达式，返回占位符
                return '<' + trimmedExpr + '>';
            });

            // 处理 if 语句
            result = result.replace(/\\{%\\s*if\\s+([^}]+)\\s*%\\}([\\s\\S]*?)\\{%\\s*endif\\s*%\\}/g, (match, condition, content) => {
                try {
                    // 简单的条件评估
                    const conditionResult = evaluateCondition(condition, context);
                    return conditionResult ? content : '';
                } catch (e) {
                    return '';
                }
            });

            // 处理 SQLAlchemy 占位符 :value
            result = result.replace(/:(\\w+)\\b/g, (match, placeholder) => {
                const value = context[placeholder];
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
        }

        // 简单的条件评估
        function evaluateCondition(condition, context) {
            // 处理变量存在性检查
            if (condition.trim()) {
                const varName = condition.trim();
                const value = context[varName];
                return value !== null && value !== undefined && value !== false && value !== 0 && value !== '';
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
                const sqlalchemyRegex = /:(\\w+)\\b/g;
                let match;
                while ((match = sqlalchemyRegex.exec(template)) !== null) {
                    sqlalchemyVars.push(match[1]);
                }

                // 渲染模板
                const renderedSQL = renderTemplate(processedTemplate, initialValues);

                // 应用语法高亮
                sqlPreview.innerHTML = highlightSQL(renderedSQL);

                // 更新状态
                statusInfo.textContent = '模板渲染成功';

                // 更新变量数量
                updateVariableCount();

            } catch (error) {
                console.error('模板渲染错误:', error);
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
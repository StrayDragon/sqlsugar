import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionCore } from '../core/extension-core';
import { Jinja2Variable } from '../jinja2-nunjucks-processor';
import { VariableChangeEvent, TemplateRenderEvent } from './types.js';

/**
 * Modern Jinja2 WebView Editor using Lit Web Components
 *
 * This replaces the old monolithic WebView implementation with a modern,
 * component-based architecture using Lit for better maintainability and performance.
 */
export class Jinja2WebviewIntegrated {
    private static readonly viewType = 'sqlsugar.jinja2EditorModern';
    private panel: vscode.WebviewPanel | undefined;
    private resolvePromise: ((values: Record<string, any>) => void) | undefined;
    private rejectPromise: ((reason?: any) => void) | undefined;
    private disposables: vscode.Disposable[] = [];
    private extensionPath: string;

    /**
     * Show the modern WebView editor
     */
    public static async showEditor(
        template: string,
        variables: Jinja2Variable[],
        title: string = 'Jinja2 Template Editor'
    ): Promise<Record<string, any>> {
        return new Promise((resolve, reject) => {
            const editor = new Jinja2WebviewIntegrated();

            // Get extension path from ExtensionCore
            try {
                const extensionCore = ExtensionCore.getInstance();
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

    private getContextPath(): string {
        // 使用扩展路径，在开发和生产环境中都有效
        return this.extensionPath;
    }

    private async show(template: string, variables: Jinja2Variable[], title: string): Promise<void> {
        // Create or show webview panel
        if (this.panel) {
            this.panel.reveal();
            await this.updateContent(template, variables);
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            Jinja2WebviewIntegrated.viewType,
            title,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'dist', 'jinja2-editor'),
                    vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'node_modules')
                ],
                enableFindWidget: true,
                enableCommandUris: false
            }
        );

        this.panel.webview.html = await this.getHtmlContent(this.panel.webview, template, variables);
        this.setupWebviewListeners();
    }

    private setupWebviewListeners(): void {
        if (!this.panel) {
            return;
        }

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.dispose();
        });

        // Handle webview messages
        this.panel.webview.onDidReceiveMessage(async (message) => {
            await this.handleWebviewMessage(message);
        });
    }

    private async handleWebviewMessage(message: any): Promise<void> {
        switch (message.command) {
            case 'ready':
                // WebView is ready, we can send initial data
                if (this.panel) {
                    this.panel.webview.postMessage({
                        command: 'initialize',
                        data: {
                            template: message.currentTemplate,
                            variables: message.currentVariables,
                            values: message.currentValues
                        }
                    });
                }
                break;

            case 'submit':
                if (this.resolvePromise && message.values) {
                    this.resolvePromise(message.values);
                    this.dispose();
                }
                break;

            case 'cancel':
                if (this.rejectPromise) {
                    this.rejectPromise(new Error('User cancelled the operation'));
                    this.dispose();
                }
                break;

            case 'copyToClipboard':
                if (message.text) {
                    await vscode.env.clipboard.writeText(message.text);
                    vscode.window.showInformationMessage('SQL copied to clipboard');
                }
                break;

            case 'variable-change':
                // Handle variable changes for real-time updates
                if (message.data) {
                    // Broadcast to other parts of the extension if needed
                    console.log('Variable changed:', message.data);
                }
                break;

            case 'template-render':
                // Handle template rendering events
                if (message.data && !message.data.error) {
                    console.log('Template rendered successfully:', message.data);
                }
                break;

            case 'showError':
                if (message.message) {
                    vscode.window.showErrorMessage(message.message);
                }
                break;

            case 'export-config':
                if (message.config) {
                    await this.exportConfiguration(message.config);
                }
                break;

            case 'import-config':
                // Handle configuration import if needed
                break;

            default:
                console.warn('Unknown webview message:', message.command);
        }
    }

    private async updateContent(template: string, variables: Jinja2Variable[]): Promise<void> {
        if (!this.panel) {
            return;
        }

        this.panel.webview.html = await this.getHtmlContent(this.panel.webview, template, variables);
    }

    private async getHtmlContent(webview: vscode.Webview, template: string, variables: Jinja2Variable[]): Promise<string> {
        const nonce = this.getNonce();
        const theme = vscode.workspace.getConfiguration('sqlsugar').get<string>('sqlSyntaxHighlightTheme', 'vscode-dark');

        // Get URIs for Lit components and dependencies
        const litCoreUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'node_modules', 'lit', 'index.js'));
        const litDecoratorsUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'node_modules', 'lit', 'decorators.js'));
        const litDirectivesUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'node_modules', 'lit', 'directives', 'index.js'));
        const nunjucksUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'node_modules', 'nunjucks', 'browser', 'nunjucks.min.js'));

        // Get URIs for our web components
        const componentsUri = webview.asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(this.getContextPath()), 'dist', 'jinja2-editor', 'jinja2-editor.js'));

        // Build initial values
        const initialValues: Record<string, any> = {};
        variables.forEach(v => {
            initialValues[v.name] = v.defaultValue ?? this.getDefaultValue(v.type);
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        img-src ${webview.cspSource} https: data:;
        script-src 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline' ${webview.cspSource} ${litCoreUri} ${litDecoratorsUri} ${litDirectivesUri} ${nunjucksUri} https://cdn.jsdelivr.net;
        style-src ${webview.cspSource} 'unsafe-inline';
        font-src ${webview.cspSource} https://fonts.gstatic.com;
        connect-src ${webview.cspSource};
    ">
    <title>Jinja2 Template Editor</title>
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family, 'Consolas', 'Monaco', 'Courier New', monospace);
            color: var(--vscode-foreground, #cccccc);
            background-color: var(--vscode-background, #1e1e1e);
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
        }

        /* Loading state */
        #loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-size: 18px;
            color: var(--vscode-foreground);
        }

        .spinner {
            border: 3px solid var(--vscode-progressBar-background);
            border-top: 3px solid var(--vscode-progressBar-foreground);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin-right: 15px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Error state */
        #error {
            display: none;
            padding: 20px;
            background-color: var(--vscode-errorBackground);
            color: var(--vscode-errorForeground);
            border-radius: 4px;
            margin: 20px;
            text-align: center;
        }

        #error.show {
            display: block;
        }

        /* App container */
        #app {
            display: none;
            height: 100vh;
        }

        #app.ready {
            display: block;
        }

        /* Theme variables */
        :root {
            --vscode-font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            --vscode-font-size: 13px;
            --vscode-font-weight: normal;
            --vscode-foreground: #cccccc;
            --vscode-background: #1e1e1e;
            --vscode-editor-background: #1e1e1e;
            --vscode-textBlockQuote-background: #7f7f7f26;
            --vscode-textBlockQuote-border: #007acc80;
            --vscode-textLink-foreground: #3794ff;
            --vscode-button-background: #0e639c;
            --vscode-button-foreground: #ffffff;
            --vscode-button-hoverBackground: #1177bb;
            --vscode-button-secondaryBackground: #3a3d41;
            --vscode-button-secondaryForeground: #cccccc;
            --vscode-button-secondaryHoverBackground: #45494e;
            --vscode-dropdown-background: #3c3c3c;
            --vscode-dropdown-foreground: #f0f0f0;
            --vscode-input-background: #3c3c3c;
            --vscode-input-foreground: #cccccc;
            --vscode-input-border: #6e6e6e;
            --vscode-input-placeholderForeground: #a6a6a6;
            --vscode-badge-background: #4d4d4d;
            --vscode-badge-foreground: #ffffff;
            --vscode-errorForeground: #f48771;
            --vscode-warningForeground: #cca700;
            --vscode-infoForeground: #3794ff;
            --vscode-icon-foreground: #c5c5c5;
            --vscode-focusBorder: #007fd4;
            --vscode-widget-border: #333333;
        }

        /* Light theme overrides */
        body[data-theme="light"] {
            --vscode-foreground: #000000;
            --vscode-background: #ffffff;
            --vscode-editor-background: #ffffff;
            --vscode-textBlockQuote-background: #f5f5f5;
            --vscode-textBlockQuote-border: #d0d0d0;
            --vscode-button-background: #007acc;
            --vscode-button-foreground: #ffffff;
            --vscode-button-hoverBackground: #005a9e;
            --vscode-button-secondaryBackground: #e5e5e5;
            --vscode-button-secondaryForeground: #333333;
            --vscode-button-secondaryHoverBackground: #d0d0d0;
            --vscode-dropdown-background: #ffffff;
            --vscode-dropdown-foreground: #000000;
            --vscode-input-background: #ffffff;
            --vscode-input-foreground: #000000;
            --vscode-input-border: #cccccc;
            --vscode-input-placeholderForeground: #767676;
            --vscode-badge-background: #e5e5e5;
            --vscode-badge-foreground: #333333;
            --vscode-focusBorder: #0090ff;
            --vscode-widget-border: #e5e5e5;
        }
    </style>
</head>
<body>
    <div id="loading">
        <div class="spinner"></div>
        <div>Loading Jinja2 Editor...</div>
    </div>

    <div id="error" id="errorState">
        <h2>Failed to Load Editor</h2>
        <p id="errorMessage"></p>
        <button onclick="retryLoading()" style="margin-top: 10px; padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;">
            Retry
        </button>
    </div>

    <div id="app">
        <!-- Lit components will be loaded here -->
        <jinja2-editor id="mainEditor"></jinja2-editor>
    </div>

    <!-- Load Lit and dependencies -->
    <script nonce="${nonce}">
        // Configuration passed from VS Code
        window.vscodeConfig = {
            template: ${JSON.stringify(template)},
            variables: ${JSON.stringify(variables)},
            values: ${JSON.stringify(initialValues)},
            theme: '${theme}',
            nonce: '${nonce}'
        };

        // VS Code API placeholder
        window.vscode = {
            postMessage: (message) => {
                if (window.acquireVsCodeApi) {
                    const vscode = window.acquireVsCodeApi();
                    vscode.postMessage(message);
                }
            }
        };

        // Error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            showError('Failed to initialize editor: ' + event.error.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            showError('Failed to initialize editor: ' + event.reason);
        });

        function showError(message) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('app').style.display = 'none';
            const errorDiv = document.getElementById('errorState');
            const errorMsg = document.getElementById('errorMessage');
            errorDiv.classList.add('show');
            errorMsg.textContent = message;
        }

        function retryLoading() {
            location.reload();
        }

        function initializeEditor() {
            try {
                const editor = document.getElementById('mainEditor');

                // Set initial data
                editor.template = window.vscodeConfig.template;
                editor.variables = window.vscodeConfig.variables;
                editor.values = window.vscodeConfig.values;
                editor.theme = window.vscodeConfig.theme;
                editor.autoRender = true;

                // Set up event listeners
                editor.addEventListener('variable-change', (event) => {
                    const { detail } = event;
                    window.vscode.postMessage({
                        command: 'variable-change',
                        data: detail
                    });
                });

                editor.addEventListener('template-render', (event) => {
                    const { detail } = event;
                    window.vscode.postMessage({
                        command: 'template-render',
                        data: detail
                    });
                });

                // Handle submit action
                const handleUserSubmit = (values) => {
                    window.vscode.postMessage({
                        command: 'submit',
                        values: values
                    });
                };

                // Simulate a submit button or action
                document.addEventListener('keydown', (event) => {
                    if (event.ctrlKey && event.key === 'Enter') {
                        const currentValues = editor.values || {};
                        handleUserSubmit(currentValues);
                    }
                });

                // Notify VS Code that we're ready
                window.vscode.postMessage({
                    command: 'ready',
                    currentTemplate: window.vscodeConfig.template,
                    currentVariables: window.vscodeConfig.variables,
                    currentValues: window.vscodeConfig.values
                });

                // Show the app
                document.getElementById('loading').style.display = 'none';
                document.getElementById('app').classList.add('ready');

                console.log('Jinja2 Editor initialized successfully');
            } catch (error) {
                console.error('Failed to initialize editor:', error);
                showError('Failed to initialize editor components: ' + error.message);
            }
        }

        // Load Lit components dynamically
        function loadComponents() {
            return new Promise((resolve, reject) => {
                // Check if custom elements are already defined
                if (customElements.get('jinja2-editor')) {
                    initializeEditor();
                    resolve();
                    return;
                }

                // Load component scripts
                const scripts = [
                    '${componentsUri}'
                ];

                let loadedCount = 0;
                const totalScripts = scripts.length;

                scripts.forEach(scriptSrc => {
                    const script = document.createElement('script');
                    script.src = scriptSrc;
                    script.type = 'module';
                    script.nonce = '${nonce}';
                    script.onload = () => {
                        loadedCount++;
                        if (loadedCount === totalScripts) {
                            // Wait a bit for custom elements to be defined
                            setTimeout(() => {
                                if (customElements.get('jinja2-editor')) {
                                    initializeEditor();
                                    resolve();
                                } else {
                                    reject(new Error('jinja2-editor component not found after loading scripts'));
                                }
                            }, 100);
                        }
                    };
                    script.onerror = () => {
                        reject(new Error('Failed to load script: ' + scriptSrc));
                    };
                    document.head.appendChild(script);
                });
            });
        }

        // Start loading components when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadComponents);
        } else {
            loadComponents();
        }

        // Handle VS Code messages
        window.addEventListener('message', (event) => {
            const message = event.data;
            const editor = document.getElementById('mainEditor');

            switch (message.command) {
                case 'updateTemplate':
                    if (editor) {
                        editor.template = message.template;
                        editor.variables = message.variables;
                    }
                    break;

                case 'updateTheme':
                    if (editor) {
                        editor.theme = message.theme;
                    }
                    break;

                case 'focus':
                    if (editor) {
                        editor.focus?.();
                    }
                    break;

                case 'reset':
                    if (editor) {
                        editor.values = window.vscodeConfig.values;
                    }
                    break;
            }
        });

        // Set theme
        document.body.setAttribute('data-theme', '${theme}');
    </script>

    <!-- Load Lit and dependencies as modules -->
    <script type="module" nonce="${nonce}">
        // Import Lit core functionality
        import { LitElement, html, css } from '${litCoreUri}';
        import { customElement, property, state } from '${litDecoratorsUri}';
        import { classMap } from '${litDirectivesUri}/class-map.js';
        import { styleMap } from '${litDirectivesUri}/style-map.js';

        // Make Lit available globally for components
        window.LitElement = LitElement;
        window.html = html;
        window.css = css;
        window.customElement = customElement;
        window.property = property;
        window.state = state;
        window.classMap = classMap;
        window.styleMap = styleMap;
    </script>
</body>
</html>`;
    }

    private getDefaultValue(type: string): any {
        const defaults: Record<string, any> = {
            string: 'demo_value',
            number: 42,
            integer: 42,
            boolean: true,
            date: new Date().toISOString().split('T')[0],
            datetime: new Date().toISOString(),
            json: {},
            uuid: '00000000-0000-0000-0000-000000000000',
            email: 'test@example.com',
            url: 'https://example.com',
            null: null
        };
        return defaults[type] || 'demo_value';
    }

    private async exportConfiguration(config: any): Promise<void> {
        try {
            const Uri = vscode.Uri;
            const defaultUri = Uri.joinPath(Uri.file(this.getContextPath()), 'jinja2-config.json');

            const uri = await vscode.window.showSaveDialog({
                defaultUri,
                filters: {
                    'JSON': ['json'],
                    'All files': ['*']
                }
            });

            if (uri) {
                const content = JSON.stringify(config, null, 2);
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
                vscode.window.showInformationMessage('Configuration exported successfully');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to export configuration: ' + error);
        }
    }

    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private dispose(): void {
        // Clean up panel
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }

        // Clean up disposables
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];

        // Clean up promises
        if (this.rejectPromise) {
            this.rejectPromise(new Error('Editor was closed'));
            this.rejectPromise = undefined;
        }
        this.resolvePromise = undefined;
    }
}
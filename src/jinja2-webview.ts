import * as vscode from 'vscode';
import { Jinja2Variable } from './jinja2-processor';
import { VariableTypeInference, VariableInference, VariableType, TypeInferenceRule } from './jinja2-type-inference';
import { Jinja2ConditionProcessor, ConditionContext } from './jinja2-condition-processor';

/**
 * Jinja2模板Webview编辑器
 * 提供可视化的变量配置界面
 */
export class Jinja2WebviewEditor {
    private static readonly viewType = 'sqlsugar.jinja2Editor';
    private panel: vscode.WebviewPanel | undefined;
    private resolvePromise: ((values: Record<string, any>) => void) | undefined;
    private rejectPromise: ((reason?: any) => void) | undefined;

    /**
     * 显示Webview编辑器
     */
    public static showEditor(
        templateContent: string,
        variables: Jinja2Variable[],
        title: string = 'Jinja2模板编辑器'
    ): Promise<Record<string, any>> {
        return new Promise((resolve, reject) => {
            const editor = new Jinja2WebviewEditor();
            editor.resolvePromise = resolve;
            editor.rejectPromise = reject;
            editor.show(templateContent, variables, title);
        });
    }

    private show(templateContent: string, variables: Jinja2Variable[], title: string): void {
        // 创建或显示webview面板
        if (this.panel) {
            this.panel.reveal();
            this.updateContent(templateContent, variables);
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
                enableCommandUris: true
            }
        );

        this.panel.webview.html = this.getHtmlContent(templateContent, variables);
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
            case 'updateVariable':
                // 实时更新预览（不需要响应）
                break;

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

            case 'preview':
                // 显示预览
                if (message.sql) {
                    await this.showSQLPreview(message.sql);
                }
                break;

            case 'copyToClipboard':
                // 复制到剪贴板
                if (message.sql) {
                    await vscode.env.clipboard.writeText(message.sql);
                    vscode.window.showInformationMessage('SQL已复制到剪贴板');
                }
                break;

            case 'autoConfigCompleted':
                vscode.window.showInformationMessage('自动配置完成！');
                break;
        }
    }

    private updateContent(templateContent: string, variables: Jinja2Variable[]): void {
        if (!this.panel) {
            return;
        }

        this.panel.webview.html = this.getHtmlContent(templateContent, variables);
    }

    private getHtmlContent(templateContent: string, variables: Jinja2Variable[]): string {
        // 对每个变量进行智能类型推断
        const variableInferences = variables.map(v => ({
            ...v,
            inference: VariableTypeInference.inferVariableType(v.name, templateContent)
        }));

        const defaultValues = this.generateDefaultValues(variables);
        const templateJSON = JSON.stringify(templateContent);
        const variablesJSON = JSON.stringify(variableInferences);
        const defaultValuesJSON = JSON.stringify(defaultValues);

        return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Jinja2模板智能编辑器</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            height: 100vh;
            overflow: hidden;
        }

        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto 1fr auto;
            gap: 20px;
            height: 100%;
        }

        .header {
            grid-column: 1 / -1;
            text-align: center;
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .variables-section {
            display: flex;
            flex-direction: column;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .variables-header {
            background: var(--vscode-panel-background);
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .variables-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
        }

        .variable-group {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            transition: border-color 0.2s;
        }

        .variable-group:hover {
            border-color: var(--vscode-focusBorder);
        }

        .variable-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }

        .variable-info {
            flex: 1;
        }

        .variable-name {
            font-weight: bold;
            color: var(--vscode-foreground);
            font-size: 14px;
            margin-bottom: 2px;
        }

        .variable-type {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
        }

        .variable-confidence {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 3px;
            display: inline-block;
            margin-top: 2px;
        }

        .confidence-high {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .confidence-medium {
            background: var(--vscode-editorWarning-foreground);
            color: var(--vscode-editor-background);
        }

        .confidence-low {
            background: var(--vscode-errorForeground);
            color: var(--vscode-editor-background);
        }

        .variable-controls {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }

        .format-selector {
            flex: 1;
            padding: 4px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            font-size: 11px;
        }

        .input-wrapper {
            position: relative;
            margin-top: 8px;
        }

        .variable-input {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-size: 13px;
        }

        .variable-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .suggestions {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            max-height: 120px;
            overflow-y: auto;
            background: var(--vscode-dropdown-background);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 3px;
            z-index: 1000;
            display: none;
        }

        .suggestion-item {
            padding: 6px 8px;
            cursor: pointer;
            font-size: 12px;
            border-bottom: 1px solid var(--vscode-dropdown-border);
        }

        .suggestion-item:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .suggestion-item:last-child {
            border-bottom: none;
        }

        .preview-section {
            display: flex;
            flex-direction: column;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .preview-header {
            background: var(--vscode-panel-background);
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .preview-content {
            flex: 1;
            overflow-y: auto;
            padding: 15px;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            white-space: pre-wrap;
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            margin: 10px;
            border-radius: 4px;
        }

        .condition-info {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            margin: 10px 0;
        }

        .condition-item {
            margin-bottom: 4px;
            padding: 2px 0;
        }

        .condition-kept {
            color: var(--vscode-icon-foreground);
        }

        .condition-removed {
            color: var(--vscode-errorForeground);
            text-decoration: line-through;
        }

        .buttons {
            grid-column: 1 / -1;
            display: flex;
            gap: 10px;
            justify-content: center;
            padding: 15px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        }

        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .btn-danger {
            background: var(--vscode-errorForeground);
            color: var(--vscode-errorForeground);
        }

        .preview-actions {
            display: flex;
            gap: 5px;
        }

        .btn-small {
            padding: 4px 8px;
            font-size: 11px;
        }

        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }

        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-errorBackground);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            font-size: 12px;
        }

        .type-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 4px;
        }

        .type-string { background: #007acc; }
        .type-number { background: #098658; }
        .type-boolean { background: #0000ff; }
        .type-date { background: #ff8c00; }
        .type-datetime { background: #9400d3; }
        .type-email { background: #008000; }
        .type-url { background: #000080; }
        .type-json { background: #8b4513; }

        /* 类型快速选择按钮 */
        .type-quick-select {
            display: flex;
            gap: 4px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }

        .type-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 32px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .type-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }

        .type-btn.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .type-btn:active {
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Jinja2模板智能编辑器</h2>
            <p>智能变量类型推断 · 多格式输入器 · Python风格条件处理</p>
        </div>

        <div class="variables-section">
            <div class="variables-header">
                <span>智能变量配置 (${variables.length} 个变量)</span>
                <button class="btn btn-secondary btn-small" onclick="autoConfigure()">自动配置</button>
            </div>
            <div class="variables-content" id="variablesContent">
                <!-- 变量输入将在这里动态生成 -->
            </div>
        </div>

        <div class="preview-section">
            <div class="preview-header">
                <span>SQL预览 (智能条件处理)</span>
                <div class="preview-actions">
                    <button class="btn btn-secondary btn-small" onclick="refreshPreview()">刷新预览</button>
                    <button class="btn btn-secondary btn-small" onclick="copySQL()">复制SQL</button>
                </div>
            </div>
            <div class="preview-content" id="previewContent">
                <div class="loading">请配置变量值...</div>
            </div>
            <div id="conditionInfo"></div>
        </div>

        <div class="buttons">
            <button class="btn btn-secondary" onclick="autoConfigure()">智能配置</button>
            <button class="btn btn-secondary" onclick="cancel()">取消</button>
            <button class="btn btn-primary" onclick="submit()">生成并复制SQL</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let templateContent = ${templateJSON};
        let variables = ${variablesJSON};
        let defaultValues = ${defaultValuesJSON};
        let currentValues = { ...defaultValues };

        // 初始化页面
        function init() {
            renderVariables();
            refreshPreview();
        }

        // 渲染变量输入
        function renderVariables() {
            const container = document.getElementById('variablesContent');
            container.innerHTML = '';

            variables.forEach((variable, index) => {
                const inference = variable.inference;
                const group = document.createElement('div');
                group.className = 'variable-group';

                const header = document.createElement('div');
                header.className = 'variable-header';

                const info = document.createElement('div');
                info.className = 'variable-info';

                const nameDiv = document.createElement('div');
                nameDiv.className = 'variable-name';
                nameDiv.innerHTML = \`<span class="type-indicator type-\${inference.type}"></span>\${variable.name}\`;

                const typeDiv = document.createElement('div');
                typeDiv.className = 'variable-type';
                typeDiv.textContent = \`智能推断: \${inference.type}\${inference.subType ? ' · ' + inference.subType : ''}\`;

                const confidenceDiv = document.createElement('div');
                confidenceDiv.className = \`variable-confidence confidence-\${getConfidenceClass(inference.confidence)}\`;
                confidenceDiv.textContent = \`置信度: \${Math.round(inference.confidence * 100)}%\`;

                info.appendChild(nameDiv);
                info.appendChild(typeDiv);
                info.appendChild(confidenceDiv);

                header.appendChild(info);
                group.appendChild(header);

                // 格式选择器
                const controls = document.createElement('div');
                controls.className = 'variable-controls';

                // 类型快速选择按钮
                const typeQuickSelect = document.createElement('div');
                typeQuickSelect.className = 'type-quick-select';
                typeQuickSelect.id = \`type-quick-select-\${index}\`;

                // 初始化类型选择按钮（将在JavaScript中创建）

                const formatSelect = document.createElement('select');
                formatSelect.className = 'format-selector';
                formatSelect.innerHTML = getFormatOptions(inference);
                formatSelect.dataset.currentFormat = getBestFormatForValue(currentValues[variable.name] || defaultValues[variable.name] || '', inference);
                formatSelect.value = formatSelect.dataset.currentFormat;
                formatSelect.addEventListener('change', (e) => changeFormat(index, e.target.value));

                controls.appendChild(typeQuickSelect);
                controls.appendChild(formatSelect);
                group.appendChild(controls);

                // 输入区域
                const inputWrapper = document.createElement('div');
                inputWrapper.className = 'input-wrapper';

                const input = document.createElement('input');
                input.className = 'variable-input';
                input.placeholder = getPlaceholder(inference);
                input.value = currentValues[variable.name] || defaultValues[variable.name] || '';
                input.dataset.variableName = variable.name;
                input.dataset.variableIndex = index;

                // 添加建议下拉
                const suggestions = document.createElement('div');
                suggestions.className = 'suggestions';
                suggestions.id = \`suggestions-\${index}\`;

                input.addEventListener('input', (e) => {
                    currentValues[variable.name] = e.target.value;
                    showSuggestions(index, e.target.value, inference);
                    refreshPreview();
                });

                input.addEventListener('focus', (e) => {
                    showSuggestions(index, e.target.value, inference);
                });

                input.addEventListener('blur', (e) => {
                    setTimeout(() => hideSuggestions(index), 200);
                });

                inputWrapper.appendChild(input);
                inputWrapper.appendChild(suggestions);
                group.appendChild(inputWrapper);

                container.appendChild(group);
            });

            // 初始化类型选择按钮
            variables.forEach((variable, index) => {
                const inference = variable.inference;
                initTypeQuickSelect(index, inference.type);
            });

        }

        // 初始化类型选择按钮
        function initTypeQuickSelect(index, currentType) {
            const container = document.getElementById(\`type-quick-select-\${index}\`);
            if (!container) return;

            const types = [
                { type: 'string', emoji: '📝', label: '文本' },
                { type: 'integer', emoji: '🔢', label: '整数' },
                { type: 'number', emoji: '🔣', label: '小数' },
                { type: 'boolean', emoji: '✅', label: '布尔' },
                { type: 'date', emoji: '📅', label: '日期' },
                { type: 'time', emoji: '⏰', label: '时间' },
                { type: 'datetime', emoji: '📆', label: '日期时间' },
                { type: 'email', emoji: '📧', label: '邮箱' },
                { type: 'url', emoji: '🔗', label: '链接' },
                { type: 'uuid', emoji: '🆔', label: 'UUID' }
            ];

            let buttonsHTML = '';
            types.forEach(t => {
                const isActive = t.type === currentType ? 'active' : '';
                buttonsHTML += \`<button class="type-btn \${isActive}"
                                  onclick="changeVariableType(\${index}, '\${t.type}')"
                                  title="\${t.label}">
                                    \${t.emoji}
                                </button>\`;
            });
            container.innerHTML = buttonsHTML;
        }

        // 获取置信度样式类
        function getConfidenceClass(confidence) {
            if (confidence >= 0.8) return 'confidence-high';
            if (confidence >= 0.6) return 'confidence-medium';
            return 'confidence-low';
        }

        // 获取格式选项
        function getFormatOptions(inference) {
            let options;

            switch (inference.type) {
                case 'string':
                    options = ['Plain Text', 'Email', 'URL', 'Phone', 'JSON String', 'SQL String'];
                    break;
                case 'number':
                    options = ['Decimal', 'Integer', 'Scientific', 'Hexadecimal', 'Binary'];
                    break;
                case 'integer':
                    options = ['Decimal', 'Hexadecimal', 'Binary', 'Octal', 'Roman'];
                    break;
                case 'date':
                    options = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD', 'Unix Timestamp'];
                    break;
                case 'time':
                    options = ['HH:mm:ss', 'HH:mm', 'HH:mm:ss.SSS', '12-hour', 'Unix Time'];
                    break;
                case 'datetime':
                    options = ['YYYY-MM-DD HH:mm:ss', 'ISO 8601', 'RFC 2822', 'Unix Timestamp'];
                    break;
                case 'boolean':
                    options = ['true/false', '1/0', 'yes/no', 'on/off', 'enabled/disabled'];
                    break;
                default:
                    options = ['Default'];
            }

            return options.map(opt => \`<option value="\${opt}">\${opt}</option>\`).join('');
        }

        // 获取最适合的格式
        function getBestFormatForValue(value, inference) {
            if (!value) return 'Default';

            const type = inference.type;
            const strValue = String(value).toLowerCase();

            switch (type) {
                case 'string':
                    if (strValue.includes('@')) return 'Email';
                    if (strValue.startsWith('http') || strValue.startsWith('www')) return 'URL';
                    if (strValue.match(/^\d+$/)) return 'Phone';
                    try { JSON.parse(value); return 'JSON String'; } catch { }
                    return 'Plain Text';

                case 'number':
                case 'integer':
                    if (strValue.startsWith('0x')) return 'Hexadecimal';
                    if (strValue.startsWith('0b')) return 'Binary';
                    if (strValue.startsWith('0o')) return 'Octal';
                    if (strValue.includes('e')) return 'Scientific';
                    return 'Decimal';

                case 'date':
                    if (strValue.match(/^\d+$/)) return 'Unix Timestamp';
                    if (strValue.includes('/')) {
                        if (strValue.match(/^\d+\/\d+\/\d+$/)) {
                            return strValue.startsWith('4') ? 'YYYY/MM/DD' : 'MM/DD/YYYY';
                        }
                    }
                    return 'YYYY-MM-DD';

                case 'time':
                    if (strValue.match(/^\d+$/)) return 'Unix Time';
                    if (strValue.includes('am') || strValue.includes('pm')) return '12-hour';
                    if (strValue.length === 5) return 'HH:mm';
                    return 'HH:mm:ss';

                case 'datetime':
                    if (strValue.match(/^\d+$/)) return 'Unix Timestamp';
                    if (strValue.includes('T')) return 'ISO 8601';
                    return 'YYYY-MM-DD HH:mm:ss';

                case 'boolean':
                    if (value === '1' || value === '0') return '1/0';
                    if (value === 'yes' || value === 'no') return 'yes/no';
                    if (value === 'on' || value === 'off') return 'on/off';
                    if (value === 'enabled' || value === 'disabled') return 'enabled/disabled';
                    return 'true/false';

                default:
                    return 'Default';
            }
        }

        // 获取占位符
        function getPlaceholder(inference) {
            const type = inference.type;
            const subType = inference.subType;

            if (subType === 'user.id') return '例如: 1, 123, 999';
            if (subType === 'pagination.limit') return '例如: 10, 25, 50, 100';
            if (subType === 'pagination.offset') return '例如: 0, 10, 20';
            if (subType === 'age') return '例如: 18, 25, 42, 65';
            if (type === 'email') return '例如: user@example.com';
            if (type === 'url') return '例如: https://example.com';
            if (type === 'date') return '例如: 2024-01-01';
            if (type === 'time') return '例如: 14:30:00';
            if (type === 'datetime') return '例如: 2024-01-01 14:30:00';
            if (type === 'boolean') return 'true 或 false';
            if (type === 'number' || type === 'integer') return '输入数字...';
            return '输入值...';
        }

        // 显示建议
        function showSuggestions(index, inputValue, inference) {
            const suggestionsDiv = document.getElementById(\`suggestions-\${index}\`);
            if (!suggestionsDiv) return;

            const lowerInput = inputValue.toLowerCase();
            const relevantSuggestions = inference.suggestions.filter(s =>
                String(s).toLowerCase().includes(lowerInput)
            );

            if (relevantSuggestions.length === 0) {
                hideSuggestions(index);
                return;
            }

            suggestionsDiv.innerHTML = relevantSuggestions.slice(0, 5).map(suggestion =>
                \`<div class="suggestion-item" onclick="selectSuggestion(\${index}, '\${suggestion}')">\${suggestion}</div>\`
            ).join('');

            suggestionsDiv.style.display = 'block';
        }

        // 隐藏建议
        function hideSuggestions(index) {
            const suggestionsDiv = document.getElementById(\`suggestions-\${index}\`);
            if (suggestionsDiv) {
                suggestionsDiv.style.display = 'none';
            }
        }

        // 选择建议
        function selectSuggestion(index, value) {
            const input = document.querySelector(\`[data-variable-index="\${index}"]\`);
            if (input) {
                input.value = value;
                const variable = variables[index];
                currentValues[variable.name] = value;
                hideSuggestions(index);
                refreshPreview();
            }
        }

        // 更改格式
        function changeFormat(index, format) {
            const variable = variables[index];
            const currentValue = currentValues[variable.name] || defaultValues[variable.name];

            // 根据格式转换值
            const convertedValue = convertFormat(currentValue, format, variable.inference);

            currentValues[variable.name] = convertedValue;

            // 更新输入框
            const input = document.querySelector(\`[data-variable-index="\${index}"]\`);
            if (input) {
                input.value = convertedValue;
            }

            refreshPreview();
        }

        // 格式转换
        function convertFormat(value, format, inference) {
            if (value === '' || value === null || value === undefined) {
                return '';
            }

            const type = inference.type;

            switch (type) {
                case 'number':
                case 'integer':
                    const num = parseFloat(value);
                    if (isNaN(num)) return value;

                    switch (format) {
                        case 'Hexadecimal':
                            return '0x' + Math.round(num).toString(16).toUpperCase();
                        case 'Binary':
                            return '0b' + Math.round(num).toString(2);
                        case 'Octal':
                            return '0o' + Math.round(num).toString(8);
                        case 'Scientific':
                            return num.toExponential(6);
                        case 'Integer':
                            return Math.round(num).toString();
                        default:
                            return num.toString();
                    }

                case 'date':
                    let date;
                    if (typeof value === 'number' || /^\d+$/.test(value)) {
                        date = new Date(parseInt(value) * 1000);
                    } else {
                        date = new Date(value);
                    }
                    if (isNaN(date.getTime())) return value;

                    switch (format) {
                        case 'MM/DD/YYYY':
                            return (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
                                   date.getDate().toString().padStart(2, '0') + '/' +
                                   date.getFullYear();
                        case 'DD/MM/YYYY':
                            return date.getDate().toString().padStart(2, '0') + '/' +
                                   (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
                                   date.getFullYear();
                        case 'YYYY/MM/DD':
                            return date.getFullYear() + '/' +
                                   (date.getMonth() + 1).toString().padStart(2, '0') + '/' +
                                   date.getDate().toString().padStart(2, '0');
                        case 'Unix Timestamp':
                            return Math.floor(date.getTime() / 1000).toString();
                        default:
                            return date.toISOString().split('T')[0];
                    }

                case 'time':
                    switch (format) {
                        case 'HH:mm':
                            return value.length > 5 ? value.substring(0, 5) : value;
                        case 'HH:mm:ss.SSS':
                            const timeParts = value.split(':');
                            if (timeParts.length === 3) {
                                return value + '.' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                            }
                            return value + '.000';
                        case '12-hour':
                            const [hours, minutes, seconds] = value.split(':').map(Number);
                            const hour = hours || 0;
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            const displayHour = hour % 12 || 12;
                            const mins = minutes || 0;
                            return \`\${displayHour}:\${mins.toString().padStart(2, '0')} \${ampm}\`;
                        case 'Unix Time':
                            // 假设是今天的秒数
                            const now = new Date();
                            const [h, m, s] = value.split(':').map(Number);
                            const timeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, s || 0);
                            return Math.floor(timeDate.getTime() / 1000).toString();
                        default:
                            return value;
                    }

                case 'datetime':
                    let datetime;
                    if (typeof value === 'number' || /^\d+$/.test(value)) {
                        datetime = new Date(parseInt(value) * 1000);
                    } else {
                        datetime = new Date(value);
                    }
                    if (isNaN(datetime.getTime())) return value;

                    switch (format) {
                        case 'ISO 8601':
                            return datetime.toISOString();
                        case 'RFC 2822':
                            return datetime.toUTCString();
                        case 'Unix Timestamp':
                            return Math.floor(datetime.getTime() / 1000).toString();
                        default:
                            return datetime.getFullYear() + '-' +
                                   (datetime.getMonth() + 1).toString().padStart(2, '0') + '-' +
                                   datetime.getDate().toString().padStart(2, '0') + ' ' +
                                   datetime.getHours().toString().padStart(2, '0') + ':' +
                                   datetime.getMinutes().toString().padStart(2, '0') + ':' +
                                   datetime.getSeconds().toString().padStart(2, '0');
                    }

                case 'boolean':
                    const boolValue = typeof value === 'boolean' ? value :
                        ['true', '1', 'yes', 'on', 'enabled', 't', 'y'].includes(String(value).toLowerCase());

                    switch (format) {
                        case '1/0':
                            return boolValue ? '1' : '0';
                        case 'yes/no':
                            return boolValue ? 'yes' : 'no';
                        case 'on/off':
                            return boolValue ? 'on' : 'off';
                        case 'enabled/disabled':
                            return boolValue ? 'enabled' : 'disabled';
                        default:
                            return boolValue ? 'true' : 'false';
                    }

                case 'string':
                    switch (format) {
                        case 'Email':
                            if (!value.includes('@')) {
                                return value + '@example.com';
                            }
                            return value;
                        case 'URL':
                            if (!value.startsWith('http') && !value.startsWith('www')) {
                                return 'https://' + value;
                            }
                            if (value.startsWith('www')) {
                                return 'https://' + value;
                            }
                            return value;
                        case 'Phone':
                            // 移除非数字字符
                            const digits = value.replace(/\D/g, '');
                            if (digits.length === 11) {
                                return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                            }
                            return value;
                        case 'JSON String':
                            try {
                                const parsed = JSON.parse(value);
                                return JSON.stringify(parsed, null, 2);
                            } catch {
                                return JSON.stringify(value, null, 2);
                            }
                        case 'SQL String':
                            return value.replace(/'/g, "''");
                        default:
                            return value;
                    }

                default:
                    return value;
            }
        }

        // 获取变量值
        function getVariableValues() {
            const values = {};
            variables.forEach(variable => {
                const value = currentValues[variable.name] || defaultValues[variable.name] || '';
                values[variable.name] = value;
            });
            return values;
        }

        // 格式化SQL值
        function formatSQLValue(value, type) {
            if (value === '' || value === null || value === undefined) {
                return 'NULL';
            }

            switch (type) {
                case 'string':
                case 'email':
                case 'url':
                case 'date':
                case 'time':
                case 'datetime':
                    return "'" + String(value).replace(/'/g, "''") + "'";
                case 'number':
                case 'integer':
                    return String(value);
                case 'boolean':
                    const lowerValue = String(value).toLowerCase();
                    return ['true', '1', 'yes', 'on', 'enabled'].includes(lowerValue) ? 'TRUE' : 'FALSE';
                case 'null':
                    return 'NULL';
                default:
                    return "'" + String(value).replace(/'/g, "''") + "'";
            }
        }

        // 智能处理条件语句
        function processConditions(template, values) {
            // 模拟Python风格的条件处理
            let result = template;
            const conditionInfo = [];

            // 检测条件块
            const ifBlocks = template.match(/\\{%\\s*if\\s+([^%]+?)\\s*%\\}([\\s\\S]*?)\\{%\\s*endif\\s*%\\}/g);

            if (ifBlocks) {
                ifBlocks.forEach((block, index) => {
                    const conditionMatch = block.match(/\\{%\\s*if\\s+([^%]+?)\\s*%\\}([\\s\\S]*?)\\{%\\s*endif\\s*%\\}/);
                    if (conditionMatch) {
                        const condition = conditionMatch[1].trim();
                        const content = conditionMatch[2];

                        // 评估条件
                        const decision = evaluateCondition(condition, values);

                        conditionInfo.push({
                            condition: condition,
                            decision: decision.keep ? 'keep' : 'remove',
                            reason: decision.reason
                        });

                        if (decision.keep) {
                            // 保留内容，移除条件标签
                            const cleanContent = content
                                .replace(/\\{%\\s*else\\s*%\\}[\\s\\S]*?/gm, '')
                                .replace(/\\{%\\s*elif\\s+[^%]+?\\s*%\\}[\\s\\S]*?/gm, '');
                            result = result.replace(block, cleanContent.trim());
                        } else {
                            // 移除整个块
                            result = result.replace(block, '');
                        }
                    }
                });
            }

            return { processed: result.trim(), info: conditionInfo };
        }

        // 评估条件
        function evaluateCondition(condition, values) {
            const lowerCondition = condition.toLowerCase().trim();

            // 检查变量是否存在
            const varMatch = condition.match(/^\\s*([a-zA-Z_][a-zA-Z0-9_]*)\\s*$/);
            if (varMatch) {
                const varName = varMatch[1];
                const exists = values.hasOwnProperty(varName) && values[varName] !== '' && values[varName] !== null;
                return {
                    keep: exists,
                    reason: exists ? \`变量 \${varName} 存在且有值\` : \`变量 \${varName} 为空或不存在\`
                };
            }

            // 检查真值条件
            const truthyPatterns = [
                /\\b(is_|has_|can_|should_|enabled|active|visible|required)/,
                /\\s+!=\\s+['""]*\\s*['""]*$/,
                /\\s+>\\s+\\s*0\\s*$/
            ];

            for (const pattern of truthyPatterns) {
                if (pattern.test(condition)) {
                    return {
                        keep: true,
                        reason: '条件可能为真，保留块'
                    };
                }
            }

            // 检查空值条件
            const falsyPatterns = [
                /\\s+is\\s+(None|null|undefined)\\s*$/i,
                /\\s+==\\s+['""]*\\s*['""]*$/,
                /\\s+==\\s+(None|null|undefined)\\s*/i
            ];

            for (const pattern of falsyPatterns) {
                if (pattern.test(condition)) {
                    return {
                        keep: false,
                        reason: '条件检查空值，移除块'
                    };
                }
            }

            // 默认保留（保守策略）
            return {
                keep: true,
                reason: '无法确定条件，保守保留'
            };
        }

        // 生成预览SQL
        function generatePreviewSQL() {
            const values = getVariableValues();
            let sql = templateContent;

            // 首先处理条件语句
            const conditionResult = processConditions(sql, values);
            sql = conditionResult.processed;

            // 然后替换变量
            variables.forEach(variable => {
                const inference = variable.inference;
                const value = values[variable.name];
                const formattedValue = formatSQLValue(value, inference.type);
                const regex = new RegExp(\`\\\\{\\\\{\\\\s*\${variable.name}\\\\s*\\\\}\\\\}\`, 'g');
                sql = sql.replace(regex, formattedValue);
            });

            return { sql, conditionInfo: conditionResult.info };
        }

        // 刷新预览
        function refreshPreview() {
            const previewContent = document.getElementById('previewContent');
            const conditionInfoDiv = document.getElementById('conditionInfo');

            try {
                const { sql, conditionInfo } = generatePreviewSQL();
                previewContent.textContent = sql;
                previewContent.className = 'preview-content';

                // 显示条件处理信息
                if (conditionInfo.length > 0) {
                    conditionInfoDiv.innerHTML = '<div class="condition-info"><strong>条件处理结果:</strong>' +
                        conditionInfo.map(info =>
                            \`<div class="condition-item condition-\${info.decision}">\${info.condition} → \${info.reason}</div>\`
                        ).join('') + '</div>';
                } else {
                    conditionInfoDiv.innerHTML = '';
                }
            } catch (error) {
                previewContent.innerHTML = \`<div class="error">生成预览失败: \${error.message}</div>\`;
                conditionInfoDiv.innerHTML = '';
            }
        }

        // 自动配置
        function autoConfigure() {
            variables.forEach((variable, index) => {
                const inference = variable.inference;
                if (inference.suggestions.length > 0) {
                    // 选择第一个建议
                    const suggestion = inference.suggestions[0];
                    currentValues[variable.name] = suggestion;

                    // 更新输入框
                    const input = document.querySelector(\`[data-variable-index="\${index}"]\`);
                    if (input) {
                        input.value = suggestion;
                    }
                }
            });

            refreshPreview();
            vscode.postMessage({ command: 'autoConfigCompleted' });
        }

        // 更改变量类型
        function changeVariableType(index, newType) {
            const variable = variables[index];
            const oldValue = currentValues[variable.name] || defaultValues[variable.name] || '';

            // 更新变量的推断类型
            variable.inference.type = newType;

            // 根据新类型转换值
            const convertedValue = convertByType(oldValue, newType);
            currentValues[variable.name] = convertedValue;

            // 更新输入框
            const input = document.querySelector(\`[data-variable-index="\${index}"]\`);
            if (input) {
                input.value = convertedValue;
            }

            // 更新类型按钮状态
            const controls = input.closest('.variable-controls');
            if (controls) {
                const typeButtons = controls.querySelectorAll('.type-btn');
                typeButtons.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.getAttribute('onclick').includes(newType)) {
                        btn.classList.add('active');
                    }
                });
            }

            // 更新格式选择器
            const formatSelect = controls?.querySelector('.format-selector');
            if (formatSelect) {
                formatSelect.innerHTML = getFormatOptions(variable.inference);
                formatSelect.value = getBestFormatForValue(convertedValue, variable.inference);
            }

            refreshPreview();
        }

        // 根据类型转换值
        function convertByType(value, type) {
            if (value === '' || value === null || value === undefined) {
                return '';
            }

            switch (type) {
                case 'string':
                case 'email':
                case 'url':
                    return String(value);
                case 'integer':
                    const intVal = parseInt(value);
                    return isNaN(intVal) ? '0' : String(intVal);
                case 'number':
                    const numVal = parseFloat(value);
                    return isNaN(numVal) ? '0.0' : String(numVal);
                case 'boolean':
                    const lowerVal = String(value).toLowerCase();
                    return ['true', '1', 'yes', 'on', 'enabled'].includes(lowerVal) ? 'true' : 'false';
                case 'date':
                    return '2024-01-01';
                case 'time':
                    return '12:00:00';
                case 'datetime':
                    return '2024-01-01 12:00:00';
                case 'uuid':
                    return '550e8400-e29b-41d4-a716-446655440000';
                default:
                    return String(value);
            }
        }

        // 提交
        function submit() {
            const values = getVariableValues();
            const { sql } = generatePreviewSQL();

            vscode.postMessage({
                command: 'submit',
                values: values,
                sql: sql
            });
        }

        // 取消
        function cancel() {
            vscode.postMessage({ command: 'cancel' });
        }

        // 复制SQL
        function copySQL() {
            const { sql } = generatePreviewSQL();
            vscode.postMessage({
                command: 'copyToClipboard',
                sql: sql
            });
        }

        // 页面加载完成后初始化
        document.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>
        `;
    }

    private generateDefaultValues(variables: Jinja2Variable[]): Record<string, any> {
        const values: Record<string, any> = {};
        for (const variable of variables) {
            values[variable.name] = this.getSmartDefaultValue(variable);
        }
        return values;
    }

    private getSmartDefaultValue(variable: Jinja2Variable): any {
        const lowerName = variable.name.toLowerCase();

        switch (variable.type) {
            case 'string':
                if (lowerName.includes('name')) {return 'demo_name';}
                if (lowerName.includes('email')) {return 'demo@example.com';}
                if (lowerName.includes('id')) {return 'demo_id';}
                if (lowerName.includes('status')) {return 'active';}
                if (lowerName.includes('date') || lowerName.includes('time')) {return '2024-01-01';}
                return 'demo_value';

            case 'number':
            case 'integer':
                if (lowerName.includes('limit')) {return 10;}
                if (lowerName.includes('offset')) {return 0;}
                if (lowerName.includes('age')) {return 25;}
                if (lowerName.includes('count')) {return 1;}
                if (lowerName.includes('id')) {return 123;}
                return 42;

            case 'boolean':
                if (lowerName.includes('is_') || lowerName.includes('has_') || lowerName.includes('can_')) {
                    return true;
                }
                return false;

            case 'date':
                return '2024-01-01';

            case 'time':
                return '14:30:00';

            case 'datetime':
                return '2024-01-01 14:30:00';

            case 'json':
                return '{"key": "value"}';

            case 'uuid':
                return '550e8400-e29b-41d4-a716-446655440000';

            case 'email':
                return 'demo@example.com';

            case 'url':
                return 'https://example.com';

            case 'null':
                return null;

            default:
                return 'demo_value';
        }
    }

    private async showSQLPreview(sql: string): Promise<void> {
        const document = await vscode.workspace.openTextDocument({
            content: sql,
            language: 'sql'
        });
        await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Active });
    }
}
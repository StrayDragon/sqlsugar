import * as vscode from 'vscode';
import { TypeInferenceRule, VariableType } from './jinja2-type-inference';

/**
 * Jinja2变量类型推断配置管理器
 * 支持用户自定义正则映射规则
 */
export class Jinja2TypeInferenceConfig {
    private static readonly CONFIG_SECTION = 'sqlsugar.jinja2TypeInference';

    /**
     * 获取用户配置的类型推断规则
     */
    public static async getUserConfiguredRules(): Promise<TypeInferenceRule[]> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        return customRules.map(rule => ({
            name: rule.name,
            pattern: this.compilePattern(rule.pattern),
            type: rule.type,
            confidence: rule.confidence || 0.8,
            description: rule.description,
            subType: rule.subType,
            format: rule.format
        }));
    }

    /**
     * 编译正则表达式模式
     */
    private static compilePattern(pattern: string | RegExp): RegExp {
        if (pattern instanceof RegExp) {
            return pattern;
        }

        try {
            // 支持简单的正则表达式字符串
            if (pattern.startsWith('/') && pattern.endsWith('/')) {
                const flags = pattern.slice(pattern.lastIndexOf('/') + 1);
                const patternStr = pattern.slice(1, pattern.lastIndexOf('/'));
                return new RegExp(patternStr, flags);
            }

            // 否则作为包含模式处理
            return new RegExp(pattern, 'i');
        } catch (error) {
            vscode.window.showErrorMessage(`无效的正则表达式: ${pattern}`);
            return new RegExp(pattern, 'i');
        }
    }

    /**
     * 添加用户自定义规则
     */
    public static async addCustomRule(rule: TypeInferenceRule): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        customRules.push(rule);
        await config.update('customRules', customRules, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`已添加类型推断规则: ${rule.name}`);
    }

    /**
     * 删除用户自定义规则
     */
    public static async removeCustomRule(ruleName: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        const filteredRules = customRules.filter(rule => rule.name !== ruleName);
        await config.update('customRules', filteredRules, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`已删除类型推断规则: ${ruleName}`);
    }

    /**
     * 显示配置界面
     */
    public static async showConfigUI(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        const items = customRules.map(rule => ({
            label: rule.name,
            description: `${rule.type} (${rule.confidence})`,
            detail: rule.description,
            rule: rule
        }));

        const selected = await vscode.window.showQuickPick([
            ...items,
            { label: '+ 添加新规则', description: '创建自定义类型推断规则' },
            { label: '- 删除规则', description: '删除现有规则' }
        ], {
            placeHolder: '选择操作或查看现有规则'
        });

        if (!selected) {
            return;
        }

        if (selected.label === '+ 添加新规则') {
            await this.showAddRuleDialog();
        } else if (selected.label === '- 删除规则') {
            await this.showDeleteRuleDialog();
        } else if ('rule' in selected) {
            await this.showEditRuleDialog(selected.rule);
        }
    }

    /**
     * 显示添加规则对话框
     */
    private static async showAddRuleDialog(): Promise<void> {
        const name = await vscode.window.showInputBox({
            prompt: '规则名称',
            placeHolder: '例如: 用户ID规则'
        });

        if (!name) {return;}

        const pattern = await vscode.window.showInputBox({
            prompt: '匹配模式 (正则表达式或字符串)',
            placeHolder: '例如: /.*_?id$/i 或 user_id',
            validateInput: (value) => {
                if (!value) {return '请输入匹配模式';}
                try {
                    this.compilePattern(value);
                    return null;
                } catch {
                    return '无效的正则表达式';
                }
            }
        });

        if (!pattern) {return;}

        const typeItems: vscode.QuickPickItem[] = [
            { label: 'string', description: '字符串' },
            { label: 'number', description: '数字' },
            { label: 'integer', description: '整数' },
            { label: 'boolean', description: '布尔值' },
            { label: 'date', description: '日期' },
            { label: 'time', description: '时间' },
            { label: 'datetime', description: '日期时间' },
            { label: 'json', description: 'JSON' },
            { label: 'email', description: '邮箱' },
            { label: 'url', description: 'URL' },
            { label: 'uuid', description: 'UUID' }
        ];

        const typeSelected = await vscode.window.showQuickPick(typeItems, {
            placeHolder: '选择变量类型'
        });

        if (!typeSelected) {return;}

        const type = typeSelected.label as VariableType;

        const confidence = await vscode.window.showInputBox({
            prompt: '置信度 (0-1)',
            placeHolder: '0.8',
            validateInput: (value) => {
                const num = parseFloat(value);
                if (isNaN(num) || num < 0 || num > 1) {
                    return '请输入0到1之间的数字';
                }
                return null;
            }
        });

        if (!confidence) {return;}

        const description = await vscode.window.showInputBox({
            prompt: '规则描述 (可选)',
            placeHolder: '例如: 匹配用户ID字段'
        });

        const subType = await vscode.window.showInputBox({
            prompt: '子类型 (可选)',
            placeHolder: '例如: user.id'
        });

        const format = await vscode.window.showInputBox({
            prompt: '默认格式 (可选)',
            placeHolder: '例如: YYYY-MM-DD'
        });

        const rule: TypeInferenceRule = {
            name,
            pattern: this.compilePattern(pattern),
            type,
            confidence: parseFloat(confidence),
            description: description || undefined,
            subType: subType || undefined,
            format: format || undefined
        };

        await this.addCustomRule(rule);
    }

    /**
     * 显示删除规则对话框
     */
    private static async showDeleteRuleDialog(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        if (customRules.length === 0) {
            vscode.window.showInformationMessage('没有自定义规则可删除');
            return;
        }

        const items = customRules.map(rule => ({
            label: rule.name,
            description: `${rule.type} (${rule.confidence})`,
            detail: rule.description,
            ruleName: rule.name
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: '选择要删除的规则'
        });

        if (selected) {
            await this.removeCustomRule(selected.ruleName);
        }
    }

    /**
     * 显示编辑规则对话框
     */
    private static async showEditRuleDialog(rule: TypeInferenceRule): Promise<void> {
        const actions = ['编辑置信度', '编辑描述', '删除规则'];
        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: '选择操作'
        });

        if (!selected) {return;}

        switch (selected) {
            case '编辑置信度':
                const newConfidence = await vscode.window.showInputBox({
                    prompt: '新置信度 (0-1)',
                    value: rule.confidence.toString(),
                    validateInput: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num) || num < 0 || num > 1) {
                            return '请输入0到1之间的数字';
                        }
                        return null;
                    }
                });

                if (newConfidence) {
                    await this.updateRuleField(rule.name, 'confidence', parseFloat(newConfidence));
                }
                break;

            case '编辑描述':
                const newDescription = await vscode.window.showInputBox({
                    prompt: '新描述',
                    value: rule.description || ''
                });

                if (newDescription !== undefined) {
                    await this.updateRuleField(rule.name, 'description', newDescription || undefined);
                }
                break;

            case '删除规则':
                await this.removeCustomRule(rule.name);
                break;
        }
    }

    /**
     * 更新规则字段
     */
    private static async updateRuleField(ruleName: string, field: string, value: any): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        const ruleIndex = customRules.findIndex(rule => rule.name === ruleName);
        if (ruleIndex === -1) {
            vscode.window.showErrorMessage(`未找到规则: ${ruleName}`);
            return;
        }

        (customRules[ruleIndex] as any)[field] = value;
        await config.update('customRules', customRules, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(`已更新规则: ${ruleName}`);
    }

    /**
     * 导出配置到文件
     */
    public static async exportConfig(): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
        const customRules = config.get<TypeInferenceRule[]>('customRules', []);

        if (customRules.length === 0) {
            vscode.window.showInformationMessage('没有自定义规则可导出');
            return;
        }

        const uri = await vscode.window.showSaveDialog({
            filters: {
                'JSON': ['json'],
                'All files': ['*']
            },
            defaultUri: vscode.Uri.file('jinja2-type-rules.json')
        });

        if (uri) {
            const content = JSON.stringify({
                version: '1.0.0',
                description: 'SQLSugar Jinja2类型推断规则配置',
                rules: customRules
            }, null, 2);

            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
            vscode.window.showInformationMessage(`配置已导出到: ${uri.fsPath}`);
        }
    }

    /**
     * 从文件导入配置
     */
    public static async importConfig(): Promise<void> {
        const uri = await vscode.window.showOpenDialog({
            filters: {
                'JSON': ['json'],
                'All files': ['*']
            },
            canSelectMany: false
        });

        if (!uri || uri.length === 0) {return;}

        try {
            const content = await vscode.workspace.fs.readFile(uri[0]);
            const config = JSON.parse(content.toString());

            if (!config.rules || !Array.isArray(config.rules)) {
                throw new Error('无效的配置文件格式');
            }

            const rules = config.rules.map((rule: any) => ({
                name: rule.name,
                pattern: this.compilePattern(rule.pattern),
                type: rule.type,
                confidence: rule.confidence || 0.8,
                description: rule.description,
                subType: rule.subType,
                format: rule.format
            }));

            const vscodeConfig = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
            await vscodeConfig.update('customRules', rules, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage(`成功导入 ${rules.length} 条规则`);
        } catch (error) {
            vscode.window.showErrorMessage(`导入失败: ${error}`);
        }
    }

    /**
     * 重置为默认配置
     */
    public static async resetToDefault(): Promise<void> {
        const result = await vscode.window.showWarningMessage(
            '确定要重置为默认配置吗？这将删除所有自定义规则。',
            { modal: true },
            '确定', '取消'
        );

        if (result === '确定') {
            const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
            await config.update('customRules', [], vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('已重置为默认配置');
        }
    }
}
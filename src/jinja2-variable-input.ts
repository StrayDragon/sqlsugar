import * as vscode from 'vscode';

import { Jinja2Variable } from './jinja2-nunjucks-processor';

/**
 * 变量值的类型联合
 */
import { Jinja2VariableValue } from './jinja2-editor/types.js';

/**
 * 变量配置上下文的类型
 */
type VariableConfigContext = Record<string, Jinja2VariableValue>;

/**
 * 变量值输入界面
 * 提供类型选择和自定义值输入
 */
export class Jinja2VariableInput {
  /**
   * 显示变量配置界面
   */
  public static async configureVariables(
    variables: Jinja2Variable[]
  ): Promise<VariableConfigContext | undefined> {
    const context: VariableConfigContext = {};

    for (const variable of variables) {
      const result = await this.configureVariable(variable);
      if (result === undefined) {
        return undefined; // 用户取消
      }
      context[variable.name] = result;
    }

    return context;
  }

  /**
   * 配置单个变量
   */
  private static async configureVariable(variable: Jinja2Variable): Promise<Jinja2VariableValue | undefined> {
    // 创建类型选择和值输入的界面
    const typeOptions = [
      { label: '📝 String', value: 'string', description: 'Text value' },
      { label: '🔢 Number', value: 'number', description: 'Numeric value' },
      { label: '📅 Date', value: 'date', description: 'Date value (YYYY-MM-DD)' },
    ];

    // 首先选择类型
    const selectedType = await vscode.window.showQuickPick(typeOptions, {
      placeHolder: `Select type for "${variable.name}"`,
      title: `Configure Variable: ${variable.name}`,
      canPickMany: false,
    });

    if (!selectedType) {
      return undefined; // 用户取消
    }

    // 然后输入值
    const type = selectedType.value as 'string' | 'number' | 'date';
    return await this.inputValue(variable.name, type, variable.defaultValue);
  }

  /**
   * 输入变量值
   */
  private static async inputValue(
    variableName: string,
    type: 'string' | 'number' | 'date' | 'boolean',
    defaultValue?: Jinja2VariableValue
  ): Promise<Jinja2VariableValue | undefined> {
    const placeholder = this.formatDefaultValue(type, defaultValue);
    const prompt = this.getInputPrompt(type);

    switch (type) {
      case 'string':
        return await vscode.window.showInputBox({
          title: `Enter string value for "${variableName}"`,
          placeHolder: placeholder,
          prompt: `Enter a text value for ${variableName}`,
        });

      case 'number':
        const numberResult = await vscode.window.showInputBox({
          title: `Enter number value for "${variableName}"`,
          placeHolder: placeholder,
          prompt: `Enter a numeric value for ${variableName}`,
          validateInput: value => {
            if (!value) {
              return 'Please enter a number';
            }
            if (isNaN(Number(value))) {
              return 'Please enter a valid number';
            }
            return null;
          },
        });
        return numberResult ? Number(numberResult) : undefined;

      case 'date':
        const dateResult = await vscode.window.showInputBox({
          title: `Enter date value for "${variableName}"`,
          placeHolder: placeholder,
          prompt: `Enter a date in YYYY-MM-DD format for ${variableName}`,
          validateInput: value => {
            if (!value) {
              return 'Please enter a date';
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
              return 'Please enter date in YYYY-MM-DD format';
            }
            if (isNaN(Date.parse(value))) {
              return 'Please enter a valid date';
            }
            return null;
          },
        });
        return dateResult;

      case 'boolean':
        const booleanOptions = [
          { label: '✅ True', value: true },
          { label: '❌ False', value: false },
        ];
        const booleanResult = await vscode.window.showQuickPick(booleanOptions, {
          placeHolder: `Select boolean value for "${variableName}"`,
          title: `Select Boolean Value for "${variableName}"`,
        });
        return booleanResult?.value;

      default:
        return undefined;
    }
  }

  /**
   * 格式化默认值显示
   */
  private static formatDefaultValue(
    type: 'string' | 'number' | 'date' | 'boolean',
    defaultValue?: Jinja2VariableValue
  ): string {
    if (defaultValue === undefined) {
      switch (type) {
        case 'string':
          return 'demo_text';
        case 'number':
          return '42';
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'boolean':
          return 'true';
      }
    }
    return String(defaultValue);
  }

  /**
   * 获取输入提示
   */
  private static getInputPrompt(type: 'string' | 'number' | 'date' | 'boolean'): string {
    switch (type) {
      case 'string':
        return 'Enter any text value';
      case 'number':
        return 'Enter a number (integer or decimal)';
      case 'date':
        return 'Enter date in YYYY-MM-DD format';
      case 'boolean':
        return 'Select true or false';
    }
  }

  /**
   * 快速模式 - 使用默认类型
   */
  public static async quickConfigure(variables: Jinja2Variable[]): Promise<VariableConfigContext> {
    const context: VariableConfigContext = {};

    for (const variable of variables) {
      context[variable.name] = variable.defaultValue;
    }

    return context;
  }

  /**
   * 智能模式 - 自动推断类型但允许修改
   */
  public static async smartConfigure(
    variables: Jinja2Variable[]
  ): Promise<VariableConfigContext | undefined> {
    const context: VariableConfigContext = {};

    for (const variable of variables) {
      // 提供选项：使用默认值、修改类型、自定义输入
      const options = [
        {
          label: `Use default: ${this.formatDefaultValue(variable.type, variable.defaultValue)} (${variable.type})`,
          value: 'default',
        },
        {
          label: 'Change type',
          value: 'change_type',
        },
        {
          label: 'Custom input',
          value: 'custom',
        },
      ];

      const choice = await vscode.window.showQuickPick(options, {
        placeHolder: `Configure "${variable.name}"`,
        title: `Variable Configuration: ${variable.name}`,
      });

      if (!choice) {
        return undefined; // 用户取消
      }

      let value: Jinja2VariableValue;

      switch (choice.value) {
        case 'default':
          value = variable.defaultValue;
          break;

        case 'change_type':
          const newType = await this.showTypePicker(variable.type);
          if (!newType) {
            return undefined;
          }
          value = await this.inputValue(
            variable.name,
            newType,
            this.getDefaultValueForType(newType)
          );
          if (value === undefined) {
            return undefined;
          }
          break;

        case 'custom':
          value = await this.inputValue(variable.name, variable.type, variable.defaultValue);
          if (value === undefined) {
            return undefined;
          }
          break;
      }

      context[variable.name] = value;
    }

    return context;
  }

  /**
   * 显示类型选择器
   */
  private static async showTypePicker(
    currentType: 'string' | 'number' | 'date' | 'boolean'
  ): Promise<'string' | 'number' | 'date' | 'boolean' | undefined> {
    const typeOptions = [
      { label: '📝 String', value: 'string' as const, description: 'Text value' },
      { label: '🔢 Number', value: 'number' as const, description: 'Numeric value' },
      { label: '📅 Date', value: 'date' as const, description: 'Date value (YYYY-MM-DD)' },
      { label: '✅ Boolean', value: 'boolean' as const, description: 'True/False value' },
    ];

    const selected = await vscode.window.showQuickPick(typeOptions, {
      placeHolder: `Select type (current: ${currentType})`,
      title: 'Select Variable Type',
    });

    return selected?.value;
  }

  /**
   * 获取类型的默认值
   */
  private static getDefaultValueForType(type: 'string' | 'number' | 'date' | 'boolean'): Jinja2VariableValue {
    switch (type) {
      case 'number':
        return 42;
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'boolean':
        return true;
      default:
        return 'demo_value';
    }
  }
}

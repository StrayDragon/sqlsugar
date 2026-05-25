import { LanguageHandler } from '../features/inline-sql/language-handler';
import { Jinja2NunjucksProcessor } from '../features/jinja2/processor';
import type { LanguageProvider, InferenceProvider, InferenceResult } from './provider-registry';

/**
 * 适配现有 LanguageHandler 为 LanguageProvider 接口
 */
export class LanguageHandlerAdapter implements LanguageProvider {
  readonly id = 'builtin-language-handler';
  readonly name = 'Built-in Language Handler';
  readonly supportedLanguageIds = [
    'python', 'javascript', 'typescript',
    'javascriptreact', 'typescriptreact', 'markdown',
  ];

  constructor(private handler: LanguageHandler) {}

  detectQuoteType(text: string): string {
    return this.handler.detectQuoteType(text);
  }

  stripQuotes(text: string): string {
    return this.handler.stripQuotes(text);
  }

  wrapContent(content: string, originalQuoted: string): string {
    return this.handler.wrapLikeIntelligent(originalQuoted, content, 'generic');
  }

  looksLikeSQL(text: string): boolean {
    return this.handler.looksLikeSQL(text);
  }
}

/**
 * 适配现有推断逻辑为 InferenceProvider 接口
 */
export class PatternInferenceAdapter implements InferenceProvider {
  readonly id = 'builtin-pattern-inference';
  readonly name = 'Pattern-based Inference';
  readonly priority = 40;

  private processor: Jinja2NunjucksProcessor;

  constructor() {
    this.processor = Jinja2NunjucksProcessor.getInstance();
  }

  inferType(variableName: string): InferenceResult | null {
    const variables = this.processor.extractVariables(`{{ ${variableName} }}`);
    if (variables.length === 0) return null;

    const v = variables[0];
    return {
      type: v.type,
      defaultValue: v.defaultValue,
      confidence: 0.6,
      source: this.id,
    };
  }
}

/**
 * Provider 基础接口
 */
export interface Provider {
  readonly id: string;
  readonly name: string;
  dispose?(): void;
}

/**
 * 语言 Provider — 处理特定编程语言的 SQL 字符串检测和引号逻辑
 */
export interface LanguageProvider extends Provider {
  readonly supportedLanguageIds: string[];
  detectQuoteType(text: string): string;
  stripQuotes(text: string): string;
  wrapContent(content: string, originalQuoted: string): string;
  looksLikeSQL(text: string): boolean;
}

/**
 * 推断 Provider — 根据变量名推断类型
 */
export interface InferenceProvider extends Provider {
  readonly priority: number;
  inferType(variableName: string, context?: Record<string, unknown>): InferenceResult | null;
}

export interface InferenceResult {
  type: string;
  defaultValue?: unknown;
  confidence: number;
  source: string;
}

/**
 * Provider 注册表 — 管理所有 Provider 实例
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry | undefined;
  private providers = new Map<string, Provider[]>();

  private constructor() {}

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public register<T extends Provider>(category: string, provider: T): void {
    const list = this.providers.get(category) || [];
    list.push(provider);
    this.providers.set(category, list);
  }

  public get<T extends Provider>(category: string): T[] {
    return (this.providers.get(category) || []) as T[];
  }

  public getById<T extends Provider>(category: string, id: string): T | undefined {
    const list = this.providers.get(category) || [];
    return list.find(p => p.id === id) as T | undefined;
  }

  public unregister(category: string, id: string): void {
    const list = this.providers.get(category) || [];
    const idx = list.findIndex(p => p.id === id);
    if (idx >= 0) {
      const removed = list.splice(idx, 1)[0];
      removed.dispose?.();
    }
    this.providers.set(category, list);
  }

  public clear(): void {
    this.providers.forEach(list => list.forEach(p => p.dispose?.()));
    this.providers.clear();
  }

  public static resetInstance(): void {
    if (ProviderRegistry.instance) {
      ProviderRegistry.instance.clear();
      ProviderRegistry.instance = undefined;
    }
  }
}

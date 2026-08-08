import type { TemplateVariable } from './processor';
import type { LanguageType } from '../inline-sql/language-handler';
import { LanguageHandler } from '../inline-sql/language-handler';

/**
 * Build variable descriptors for named `:param` placeholders (SQLAlchemy-style).
 */
export function buildNamedParamVariables(paramNames: string[]): TemplateVariable[] {
  return paramNames.map(name => ({
    name,
    type: 'string' as const,
    description: `named parameter: :${name}`,
    paramPattern: `:${name}`,
  }));
}

/**
 * Wrap template or rendered SQL for write-back into the host-language string literal.
 */
export function wrapForSourceWriteBack(
  originalQuoted: string,
  content: string,
  language: LanguageType,
  languageHandler: LanguageHandler = new LanguageHandler()
): string {
  return languageHandler.wrapLikeIntelligent(originalQuoted, content, language);
}

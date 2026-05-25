import { TemplateRegistry } from './registry';
import { builtinCRUDTemplates } from './builtin/crud';

export function createDefaultRegistry(): TemplateRegistry {
  const registry = new TemplateRegistry();
  builtinCRUDTemplates.forEach(t => registry.register(t));
  return registry;
}

export { TemplateRegistry } from './registry';
export type { SQLTemplate, TemplateParam, TemplateParamType, TemplateFixture } from './types';

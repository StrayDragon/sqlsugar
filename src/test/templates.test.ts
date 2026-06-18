import { describe, it, expect } from 'vitest';
import { createDefaultRegistry, TemplateRegistry } from '../features/templates';
import { builtinCRUDTemplates } from '../features/templates/builtin/crud';

describe('TemplateRegistry', () => {
  it('should load builtin templates', () => {
    const registry = createDefaultRegistry();
    expect(registry.size).toBe(builtinCRUDTemplates.length);
  });

  it('should find templates by tag', () => {
    const registry = createDefaultRegistry();
    const crud = registry.findByTag('crud');
    expect(crud.length).toBeGreaterThan(0);
    crud.forEach(t => expect(t.tags).toContain('crud'));
  });

  it('should search templates by query', () => {
    const registry = createDefaultRegistry();
    const results = registry.search('pagina');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('paginated');
  });

  it('should get template by name', () => {
    const registry = createDefaultRegistry();
    const t = registry.get('select-basic');
    expect(t).toBeDefined();
    expect(t!.body).toContain('SELECT');
  });

  it('should find by dialect (universal matches all)', () => {
    const registry = createDefaultRegistry();
    const mysql = registry.findByDialect('mysql');
    expect(mysql.length).toBe(registry.size);
  });

  it('should register custom templates', () => {
    const registry = new TemplateRegistry();
    registry.register({
      name: 'custom-query',
      description: 'Test',
      tags: ['test'],
      dialect: 'postgresql',
      params: [],
      body: 'SELECT 1',
    });
    expect(registry.size).toBe(1);
    expect(registry.findByDialect('mysql')).toHaveLength(0);
    expect(registry.findByDialect('postgresql')).toHaveLength(1);
  });
});

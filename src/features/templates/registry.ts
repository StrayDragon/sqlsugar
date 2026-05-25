import type { SQLTemplate } from './types';

export class TemplateRegistry {
  private templates = new Map<string, SQLTemplate>();

  register(template: SQLTemplate): void {
    this.templates.set(template.name, template);
  }

  get(name: string): SQLTemplate | undefined {
    return this.templates.get(name);
  }

  getAll(): SQLTemplate[] {
    return Array.from(this.templates.values());
  }

  findByTag(tag: string): SQLTemplate[] {
    return this.getAll().filter(t => t.tags.includes(tag));
  }

  findByDialect(dialect: SQLTemplate['dialect']): SQLTemplate[] {
    return this.getAll().filter(t => t.dialect === dialect || t.dialect === 'universal');
  }

  search(query: string): SQLTemplate[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some(tag => tag.toLowerCase().includes(lower))
    );
  }

  get size(): number {
    return this.templates.size;
  }
}

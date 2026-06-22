/**
 * For-Loop Overlay Interaction Tests
 *
 * Verifies the (revised) extraction model for for-loops:
 *  - Only the iterable collection variable is user-editable (highlighted, clickable)
 *  - Loop variables (cat) and their properties (cat.id, cat.is_active) are
 *    derived from the collection and therefore NOT exposed as separate variables
 *  - The collection variable is typed as `array` with precise highlight position
 */

import { describe, it, expect } from 'vitest';
import { parseTemplate, findVariableAtPosition } from '../features/templated-sql/ui/utils/template-parser';

describe('For-Loop Overlay (parseTemplate)', () => {
  it('should expose only the collection as editable (basic for loop)', () => {
    const template = '{% for item in items %}{{ item }}{% endfor %}';
    const result = parseTemplate(template);

    const names = result.variables.map(v => v.name);
    expect(names).toContain('items');
    // Loop variable `item` and its usages must NOT be editable on their own
    expect(names).not.toContain('item');

    const collectionVar = result.variables.find(v => v.name === 'items');
    expect(collectionVar?.type).toBe('array');
    expect(collectionVar?.context?.semanticContext).toBe('array');
  });

  it('should highlight only `categories` from for loop with condition', () => {
    const template = '{% for cat in categories if cat.is_active %}{{ cat.id }}{% endfor %}';
    const result = parseTemplate(template);

    const names = result.variables.map(v => v.name);
    expect(names).toContain('categories');
    expect(names).not.toContain('cat');
    expect(names).not.toContain('cat.id');
    expect(names).not.toContain('cat.is_active');

    const categoriesVar = result.variables.find(v => v.name === 'categories');
    expect(categoriesVar?.type).toBe('array');
    // element properties are collected so a meaningful sample can be generated
    expect(categoriesVar?.elementProperties).toEqual(expect.arrayContaining(['id', 'is_active']));
  });

  it('should expose only the collection for destructuring for loop', () => {
    const template = '{% for key, value in items %}{{ key }}: {{ value }}{% endfor %}';
    const result = parseTemplate(template);

    const names = result.variables.map(v => v.name);
    expect(names).toContain('items');
    expect(names).not.toContain('key');
    expect(names).not.toContain('value');
  });

  it('should correctly highlight the real-world 03-loops template', () => {
    const template = `-- 带过滤的循环
SELECT * FROM products
WHERE category_id IN (
    {% for cat in categories if cat.is_active %}
        {{ cat.id }}{% if not loop.last %}, {% endif %}
    {% endfor %}
)
{% if min_price %}
    AND price >= {{ min_price }}
{% endif %}
{% if max_price %}
    AND price <= {{ max_price }}
{% endif %};`;
    const result = parseTemplate(template);

    const names = result.variables.map(v => v.name);
    // Only the iterable + the unrelated scalars are editable
    expect(names).toEqual(expect.arrayContaining(['categories', 'min_price', 'max_price']));
    expect(names).not.toContain('cat');
    expect(names).not.toContain('cat.id');
    expect(names).not.toContain('cat.is_active');
    expect(names).not.toContain('loop.last');

    const categoriesVar = result.variables.find(v => v.name === 'categories');
    expect(categoriesVar?.type).toBe('array');
  });

  it('should compute precise position for the collection variable', () => {
    const template = '{% for cat in categories if cat.is_active %}{{ cat.id }}{% endfor %}';
    const result = parseTemplate(template);

    const categoriesVar = result.variables.find(v => v.name === 'categories')!;
    // The position must wrap exactly the word `categories` (not the whole for-tag)
    const slice = template.substring(categoriesVar.position.startIndex, categoriesVar.position.endIndex);
    expect(slice).toBe('categories');
  });

  it('should not infinite loop on a large template', () => {
    const parts: string[] = [];
    for (let i = 0; i < 50; i++) {
      parts.push(`{{ var_${i} }}`);
    }
    const template = parts.join(' ');
    const start = Date.now();
    const result = parseTemplate(template);
    const elapsed = Date.now() - start;

    expect(result.variables.length).toBe(50);
    expect(elapsed).toBeLessThan(2000);
  });

  it('should find the collection variable by position', () => {
    const template = '{% for item in items %}{{ item }}{% endfor %}';
    const result = parseTemplate(template);

    const itemsIndex = template.indexOf('items');
    const found = findVariableAtPosition(result.variables, itemsIndex);
    expect(found).toBeDefined();
    expect(found?.name).toBe('items');
  });

  it('should generate a clean highlighted HTML for the for-loop', () => {
    const template = '{% for cat in categories %}{{ cat.id }}{% endfor %}';
    const result = parseTemplate(template);
    // `categories` is wrapped exactly once, and `cat`/`cat.id` are not wrapped
    expect(result.highlightedHTML).toContain('data-variable=&quot;categories&quot;');
    expect(result.highlightedHTML).not.toContain('data-variable=&quot;cat&quot;');
    expect(result.highlightedHTML).not.toContain('data-variable=&quot;cat.id&quot;');
  });
});

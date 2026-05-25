import type { ORMProvider, TableSchema, ColumnInfo, RelationInfo } from './types';

const DJANGO_TYPE_MAP: Record<string, string> = {
  'CharField': 'string', 'TextField': 'string', 'SlugField': 'string', 'EmailField': 'string', 'URLField': 'string', 'FilePathField': 'string',
  'IntegerField': 'number', 'BigIntegerField': 'number', 'SmallIntegerField': 'number', 'PositiveIntegerField': 'number', 'FloatField': 'number', 'DecimalField': 'number',
  'BooleanField': 'boolean', 'NullBooleanField': 'boolean',
  'DateField': 'date', 'DateTimeField': 'date', 'TimeField': 'date',
  'JSONField': 'json',
  'UUIDField': 'string', 'BinaryField': 'string', 'FileField': 'string', 'ImageField': 'string',
};

export class DjangoProvider implements ORMProvider {
  readonly id = 'django';
  readonly name = 'Django';
  readonly framework = 'django';
  readonly filePattern = ['**/models.py', '**/models/*.py'];

  async discoverModels(workspacePath: string): Promise<string[]> {
    void workspacePath;
    return [];
  }

  parseModel(_filePath: string, content: string): TableSchema[] {
    const schemas: TableSchema[] = [];
    const classRegex = /class\s+(\w+)\s*\(\s*(?:models\.Model|AbstractUser|AbstractBaseUser)[^)]*\)\s*:/g;
    let classMatch;

    while ((classMatch = classRegex.exec(content)) !== null) {
      const className = classMatch[1];
      const classStart = classMatch.index + classMatch[0].length;
      const classBody = this.extractClassBody(content, classStart);

      const tableName = this.extractTableName(classBody, className);
      const columns = this.extractColumns(classBody);
      const relations = this.extractRelations(classBody);

      schemas.push({ tableName, className, columns, relations, filePath: _filePath });
    }
    return schemas;
  }

  private extractClassBody(content: string, startOffset: number): string {
    const lines = content.substring(startOffset).split('\n');
    const bodyLines: string[] = [];
    let baseIndent: number | null = null;

    for (const line of lines) {
      if (line.trim() === '') { bodyLines.push(line); continue; }
      const indent = line.length - line.trimStart().length;
      if (baseIndent === null) { baseIndent = indent; }
      if (indent < baseIndent && line.trim() !== '') break;
      bodyLines.push(line);
    }
    return bodyLines.join('\n');
  }

  private extractTableName(body: string, className: string): string {
    const metaMatch = body.match(/class\s+Meta[^:]*:\s*\n\s*db_table\s*=\s*['"](\w+)['"]/);
    if (metaMatch) return metaMatch[1];
    return className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
  }

  private extractColumns(body: string): ColumnInfo[] {
    const columns: ColumnInfo[] = [];
    const fieldRegex = /(\w+)\s*=\s*models\.(\w+)\(/g;
    let match;

    while ((match = fieldRegex.exec(body)) !== null) {
      const [, name, fieldType] = match;
      if (['ForeignKey', 'OneToOneField', 'ManyToManyField'].includes(fieldType)) continue;
      const mappedType = DJANGO_TYPE_MAP[fieldType] || 'string';
      columns.push({ name, type: mappedType, nullable: true, primaryKey: name === 'id' });
    }
    return columns;
  }

  private extractRelations(body: string): RelationInfo[] {
    const relations: RelationInfo[] = [];
    const fkRegex = /(\w+)\s*=\s*models\.ForeignKey\(\s*['"]?(\w+)['"]?/g;
    const m2mRegex = /(\w+)\s*=\s*models\.ManyToManyField\(\s*['"]?(\w+)['"]?/g;
    let match;

    while ((match = fkRegex.exec(body)) !== null) {
      relations.push({ name: match[1], targetTable: match[2], type: 'foreign-key' });
    }
    while ((match = m2mRegex.exec(body)) !== null) {
      relations.push({ name: match[1], targetTable: match[2], type: 'many-to-many' });
    }
    return relations;
  }
}

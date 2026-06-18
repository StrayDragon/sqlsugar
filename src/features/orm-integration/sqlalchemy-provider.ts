import type { ORMProvider, TableSchema, ColumnInfo, RelationInfo } from './types';

const COLUMN_TYPE_MAP: Record<string, string> = {
  'Integer': 'number', 'BigInteger': 'number', 'SmallInteger': 'number', 'Float': 'number', 'Numeric': 'number',
  'String': 'string', 'Text': 'string', 'Unicode': 'string', 'UnicodeText': 'string', 'VARCHAR': 'string',
  'Boolean': 'boolean',
  'DateTime': 'date', 'Date': 'date', 'Time': 'date',
  'JSON': 'json', 'JSONB': 'json',
  'LargeBinary': 'string', 'BLOB': 'string',
  'Enum': 'string', 'UUID': 'string',
};

export class SQLAlchemyProvider implements ORMProvider {
  readonly id = 'sqlalchemy';
  readonly name = 'SQLAlchemy';
  readonly framework = 'sqlalchemy';
  readonly filePattern = ['**/models.py', '**/models/*.py', '**/model.py'];

  async discoverModels(workspacePath: string): Promise<string[]> {

    void workspacePath;
    return [];
  }

  parseModel(_filePath: string, content: string): TableSchema[] {
    const schemas: TableSchema[] = [];
    const classRegex = /class\s+(\w+)\s*\([^)]*(?:Base|Model|db\.Model)[^)]*\)\s*:/g;
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
    const tableMatch = body.match(/__tablename__\s*=\s*['"](\w+)['"]/);
    if (tableMatch) return tableMatch[1];
    return className.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's';
  }

  private extractColumns(body: string): ColumnInfo[] {
    const columns: ColumnInfo[] = [];
    const colRegex = /(\w+)\s*=\s*(?:db\.)?Column\(\s*(?:db\.)?(\w+)(?:\([^)]*\))?\s*(?:,\s*([^)]*))?\)/g;
    let match;

    while ((match = colRegex.exec(body)) !== null) {
      const [, name, rawType, options = ''] = match;
      columns.push({
        name,
        type: COLUMN_TYPE_MAP[rawType] || 'string',
        nullable: !options.includes('nullable=False'),
        primaryKey: options.includes('primary_key=True'),
      });
    }
    return columns;
  }

  private extractRelations(body: string): RelationInfo[] {
    const relations: RelationInfo[] = [];
    const relRegex = /(\w+)\s*=\s*(?:db\.)?relationship\(\s*['"](\w+)['"]/g;
    let match;

    while ((match = relRegex.exec(body)) !== null) {
      relations.push({ name: match[1], targetTable: match[2], type: 'one-to-many' });
    }

    const fkRegex = /(\w+)\s*=\s*(?:db\.)?Column\([^)]*ForeignKey\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = fkRegex.exec(body)) !== null) {
      relations.push({ name: match[1], targetTable: match[2].split('.')[0], type: 'foreign-key' });
    }

    return relations;
  }
}

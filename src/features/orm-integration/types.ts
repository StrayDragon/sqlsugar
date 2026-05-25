import type { Provider } from '../../core/provider-registry';

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
}

export interface RelationInfo {
  name: string;
  targetTable: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'foreign-key';
}

export interface TableSchema {
  tableName: string;
  className: string;
  columns: ColumnInfo[];
  relations: RelationInfo[];
  filePath: string;
}

export interface ORMProvider extends Provider {
  readonly framework: string;
  readonly filePattern: string[];
  discoverModels(workspacePath: string): Promise<string[]>;
  parseModel(filePath: string, content: string): TableSchema[];
}

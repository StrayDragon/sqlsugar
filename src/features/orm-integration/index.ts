import { ProviderRegistry } from '../../core/provider-registry';
import { SQLAlchemyProvider } from './sqlalchemy-provider';
import { DjangoProvider } from './django-provider';

export function registerORMProviders(): void {
  const registry = ProviderRegistry.getInstance();
  registry.register('orm', new SQLAlchemyProvider());
  registry.register('orm', new DjangoProvider());
}

export type { ORMProvider, TableSchema, ColumnInfo, RelationInfo } from './types';
export { SQLAlchemyProvider } from './sqlalchemy-provider';
export { DjangoProvider } from './django-provider';

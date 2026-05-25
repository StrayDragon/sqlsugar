import type { SQLTemplate } from '../types';

export const builtinCRUDTemplates: SQLTemplate[] = [
  {
    name: 'select-basic',
    description: '基础 SELECT 查询',
    tags: ['select', 'crud', 'basic'],
    dialect: 'universal',
    params: [
      { name: 'table_name', type: 'string', required: true },
      { name: 'columns', type: 'array', required: false, default: ['*'] },
      { name: 'where_clause', type: 'optional', required: false },
    ],
    body: `SELECT {{ columns | join(', ') }}
FROM {{ table_name }}
{% if where_clause %}WHERE {{ where_clause }}{% endif %}`,
  },
  {
    name: 'insert-basic',
    description: '基础 INSERT 语句',
    tags: ['insert', 'crud', 'basic'],
    dialect: 'universal',
    params: [
      { name: 'table_name', type: 'string', required: true },
      { name: 'columns', type: 'array', required: true },
      { name: 'values', type: 'array', required: true },
    ],
    body: `INSERT INTO {{ table_name }} ({{ columns | join(', ') }})
VALUES ({{ values | join(', ') }})`,
  },
  {
    name: 'update-basic',
    description: '基础 UPDATE 语句',
    tags: ['update', 'crud', 'basic'],
    dialect: 'universal',
    params: [
      { name: 'table_name', type: 'string', required: true },
      { name: 'set_clause', type: 'string', required: true },
      { name: 'where_clause', type: 'string', required: true },
    ],
    body: `UPDATE {{ table_name }}
SET {{ set_clause }}
WHERE {{ where_clause }}`,
  },
  {
    name: 'delete-basic',
    description: '基础 DELETE 语句',
    tags: ['delete', 'crud', 'basic'],
    dialect: 'universal',
    params: [
      { name: 'table_name', type: 'string', required: true },
      { name: 'where_clause', type: 'string', required: true },
    ],
    body: `DELETE FROM {{ table_name }}
WHERE {{ where_clause }}`,
  },
  {
    name: 'select-paginated',
    description: '分页查询（OFFSET 方式）',
    tags: ['select', 'pagination', 'basic'],
    dialect: 'universal',
    params: [
      { name: 'table_name', type: 'string', required: true },
      { name: 'columns', type: 'array', required: false, default: ['*'] },
      { name: 'order_by', type: 'string', required: true },
      { name: 'page_size', type: 'number', required: false, default: 20 },
      { name: 'offset', type: 'number', required: false, default: 0 },
    ],
    body: `SELECT {{ columns | join(', ') }}
FROM {{ table_name }}
ORDER BY {{ order_by }}
LIMIT {{ page_size }}
OFFSET {{ offset }}`,
  },
  {
    name: 'select-aggregate',
    description: '聚合查询',
    tags: ['select', 'aggregate', 'group-by'],
    dialect: 'universal',
    params: [
      { name: 'table_name', type: 'string', required: true },
      { name: 'group_column', type: 'string', required: true },
      { name: 'agg_function', type: 'enum', required: true, options: ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'] },
      { name: 'agg_column', type: 'string', required: true },
    ],
    body: `SELECT {{ group_column }}, {{ agg_function }}({{ agg_column }}) as result
FROM {{ table_name }}
GROUP BY {{ group_column }}`,
  },
];

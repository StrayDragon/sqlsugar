-- Pyformat 参数风格示例 (psycopg2 / 'demo_param')
-- Pyformat Parameter Style Example (psycopg2)

-- 基础 Pyformat 参数
SELECT id, name, email
FROM users
WHERE id = 'sample_id'
  AND status = 'demo_status'
  AND created_at > 'demo_start_date';

-- 带 Jinja2 条件的 Pyformat 参数
SELECT * FROM orders
WHERE 1=1

  AND user_id = 'sample_id'

  AND status = 'demo_order_status'

  AND created_at BETWEEN 'demo_start_date' AND 'demo_end_date'

ORDER BY created_at DESC
LIMIT 'demo_limit';

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES ('Sample Name', 'sample_id', 'demo_price', 'demo_stock_quantity');

-- UPDATE 语句
UPDATE users
SET email = 'demo_new_email',
    phone = 'demo_phone_number',
    updated_at = 'demo_current_timestamp'
WHERE id = 'sample_id';

-- 动态表名和列名 (结合 Jinja2)
SELECT id, name, created_at
FROM 示例名称
WHERE 1=1

    AND items = %(filter_items)s

ORDER BY demo_sort_column
LIMIT 'demo_limit';

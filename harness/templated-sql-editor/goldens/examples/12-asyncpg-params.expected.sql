-- Asyncpg 参数风格示例 (PostgreSQL 'demo_1', 'demo_2'...)
-- Asyncpg Parameter Style Example (PostgreSQL)

-- 基础 Asyncpg 参数
SELECT id, name, email
FROM users
WHERE id = 'demo_1'
  AND status = 'demo_2'
  AND created_at > 'demo_3';

-- 带 Jinja2 条件的 Asyncpg 参数
SELECT * FROM orders
WHERE 1=1

  AND user_id = 'demo_1'

  AND status = 'demo_2'

  AND created_at BETWEEN 'demo_3' AND 'demo_4'

ORDER BY created_at DESC
LIMIT 'demo_5';

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES ('demo_1', 'demo_2', 'demo_3', 'demo_4');

-- UPDATE 语句
UPDATE users
SET email = 'demo_1',
    phone = 'demo_2',
    updated_at = 'demo_3'
WHERE id = 'demo_4';

-- 复杂查询 - 窗口函数
SELECT
    user_id,
    order_id,
    total_amount,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
FROM orders
WHERE created_at > 'demo_1'
  AND status = 'demo_2'

  AND total_amount >= 'demo_3'

ORDER BY user_id, rn;

-- 批量操作 (使用数组参数)
SELECT * FROM users
WHERE id = ANY('demo_1'::int[])
  AND status = 'demo_2'
ORDER BY created_at DESC;

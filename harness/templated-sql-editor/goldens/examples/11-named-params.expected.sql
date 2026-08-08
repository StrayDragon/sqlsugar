-- Named 参数风格示例 (SQLAlchemy / 'demo_param')
-- Named Parameter Style Example (SQLAlchemy)

-- 基础 Named 参数
SELECT id, name, email
FROM users
WHERE id = 'sample_id'
  AND status = 'demo_status'
  AND created_at > 'demo_start_date';

-- 带 Jinja2 条件的 Named 参数
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

-- 复杂查询 - 多表关联
SELECT
    u.name AS user_name,
    o.order_id,
    o.total_amount,
    p.payment_status
FROM users u
INNER JOIN orders o ON u.id = o.user_id
LEFT JOIN payments p ON o.id = p.order_id
WHERE u.id = 'sample_id'
  AND o.created_at > 'demo_since_date'

  AND p.payment_status = 'demo_payment_status'

ORDER BY o.created_at DESC;

-- Asyncpg 参数风格示例 (PostgreSQL $1, $2...)
-- Asyncpg Parameter Style Example (PostgreSQL)

-- 基础 Asyncpg 参数
SELECT id, name, email
FROM users
WHERE id = $1
  AND status = $2
  AND created_at > $3;

-- 带 Jinja2 条件的 Asyncpg 参数
SELECT * FROM orders
WHERE 1=1
{% if filter_by_user %}
  AND user_id = $1
{% endif %}
{% if filter_by_status %}
  AND status = $2
{% endif %}
{% if date_range %}
  AND created_at BETWEEN $3 AND $4
{% endif %}
ORDER BY created_at DESC
LIMIT $5;

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES ($1, $2, $3, $4);

-- UPDATE 语句
UPDATE users
SET email = $1,
    phone = $2,
    updated_at = $3
WHERE id = $4;

-- 复杂查询 - 窗口函数
SELECT
    user_id,
    order_id,
    total_amount,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
FROM orders
WHERE created_at > $1
  AND status = $2
{% if min_amount %}
  AND total_amount >= $3
{% endif %}
ORDER BY user_id, rn;

-- 批量操作 (使用数组参数)
SELECT * FROM users
WHERE id = ANY($1::int[])
  AND status = $2
ORDER BY created_at DESC;

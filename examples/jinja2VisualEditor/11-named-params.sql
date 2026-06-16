-- Named 参数风格示例 (SQLAlchemy / :param)
-- Named Parameter Style Example (SQLAlchemy)

-- 基础 Named 参数
SELECT id, name, email
FROM users
WHERE id = :user_id
  AND status = :status
  AND created_at > :start_date;

-- 带 Jinja2 条件的 Named 参数
SELECT * FROM orders
WHERE 1=1
{% if filter_by_user %}
  AND user_id = :user_id
{% endif %}
{% if filter_by_status %}
  AND status = :order_status
{% endif %}
{% if date_range %}
  AND created_at BETWEEN :start_date AND :end_date
{% endif %}
ORDER BY created_at DESC
LIMIT :limit;

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES (:product_name, :category_id, :price, :stock_quantity);

-- UPDATE 语句
UPDATE users
SET email = :new_email,
    phone = :phone_number,
    updated_at = :current_timestamp
WHERE id = :user_id;

-- 复杂查询 - 多表关联
SELECT
    u.name AS user_name,
    o.order_id,
    o.total_amount,
    p.payment_status
FROM users u
INNER JOIN orders o ON u.id = o.user_id
LEFT JOIN payments p ON o.id = p.order_id
WHERE u.id = :user_id
  AND o.created_at > :since_date
{% if payment_status %}
  AND p.payment_status = :payment_status
{% endif %}
ORDER BY o.created_at DESC;

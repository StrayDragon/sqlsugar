-- Numeric 参数风格示例 (Oracle / :1, :2...)
-- Numeric Parameter Style Example (Oracle)

-- 基础 Numeric 参数
SELECT id, name, email
FROM users
WHERE id = :1
  AND status = :2
  AND created_at > :3;

-- 带 Jinja2 条件的 Numeric 参数
SELECT * FROM orders
WHERE 1=1
{% if filter_by_user %}
  AND user_id = :1
{% endif %}
{% if filter_by_status %}
  AND status = :2
{% endif %}
{% if date_range %}
  AND created_at BETWEEN :3 AND :4
{% endif %}
ORDER BY created_at DESC
FETCH FIRST :5 ROWS ONLY;

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES (:1, :2, :3, :4);

-- UPDATE 语句
UPDATE users
SET email = :1,
    phone = :2,
    updated_at = :3
WHERE id = :4;

-- 分页查询 (Oracle 12c+)
SELECT * FROM (
    SELECT t.*, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
    FROM orders t
    WHERE status = :1
    {% if user_id %}
      AND user_id = :2
    {% endif %}
)
WHERE rn BETWEEN :3 AND :4;

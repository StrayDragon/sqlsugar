-- Numeric 参数风格示例 (Oracle / 'demo_1', 'demo_2'...)
-- Numeric Parameter Style Example (Oracle)

-- 基础 Numeric 参数
SELECT id, name, email
FROM users
WHERE id = 'demo_1'
  AND status = 'demo_2'
  AND created_at > 'demo_3';

-- 带 Jinja2 条件的 Numeric 参数
SELECT * FROM orders
WHERE 1=1

  AND user_id = 'demo_1'

  AND status = 'demo_2'

  AND created_at BETWEEN 'demo_3' AND 'demo_4'

ORDER BY created_at DESC
FETCH FIRST 'demo_5' ROWS ONLY;

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES ('demo_1', 'demo_2', 'demo_3', 'demo_4');

-- UPDATE 语句
UPDATE users
SET email = 'demo_1',
    phone = 'demo_2',
    updated_at = 'demo_3'
WHERE id = 'demo_4';

-- 分页查询 (Oracle 12c+)
SELECT * FROM (
    SELECT t.*, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS rn
    FROM orders t
    WHERE status = 'demo_1'

      AND user_id = 'demo_2'

)
WHERE rn BETWEEN 'demo_3' AND 'demo_4';

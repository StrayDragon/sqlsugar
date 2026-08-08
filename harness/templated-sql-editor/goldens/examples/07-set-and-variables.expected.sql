-- 变量设置和使用
-- Set Variables and Usage

-- 设置简单变量

-- 设置复杂变量

-- 使用变量构建查询
SELECT * FROM users
WHERE status = 'active'

    AND (
        username LIKE '%demo_search_term%'
        OR email LIKE '%demo_search_term%'
    )

ORDER BY created_at DESC
LIMIT 100 OFFSET 0;

-- 条件设置变量

SELECT
    product_id,
    name,
    price,
    created_at
FROM products
WHERE is_active = 1

    AND category = 'default'

ORDER BY id ASC;

-- 设置列表变量

SELECT
    order_id,
    user_id,
    status,
    total_amount
FROM orders
WHERE status IN (

        'pending',

        'processing',

        'completed',

        'cancelled'

)

    -- 普通用户只能看到自己的订单
    AND user_id = 123

ORDER BY created_at DESC;

-- 使用 set 块设置多行内容

SELECT * FROM products

    WHERE is_deleted = 0
    AND is_active = 1

'

    AND created_at >= ''''2026-08-08''''

    AND created_at <= ''''2026-09-07''''

'

    AND price >= 99.99

ORDER BY created_at DESC;

-- 变量作用域示例

SELECT * FROM (
    SELECT
        user_id,
        username,

        'active' as status
    FROM users
    WHERE status = 'active'
    LIMIT 50
) as active_users;

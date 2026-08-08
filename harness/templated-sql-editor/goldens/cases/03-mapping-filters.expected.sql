-- 复杂的循环和条件控制
-- Advanced Loops and Conditionals

-- 基础循环
SELECT * FROM orders
WHERE 1=1

    AND status IN (

        'alpha',

        'beta'

    )

    AND created_at > ''2026-08-08''

ORDER BY created_at DESC;

-- 带过滤的循环
SELECT * FROM products
WHERE category_id IN (

        ,

)

    AND price >= 99.99

    AND price <= 99.99
;

-- 嵌套循环和条件
SELECT
    u.user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE 1=1

            AND u.status = 'active'

            AND u.region = 'cn'

            AND o.status = 'completed'

ORDER BY o.created_at DESC
LIMIT 25;

-- 使用 else 子句
SELECT * FROM inventory
WHERE 1=1

    AND warehouse_id IN (

        1,

        2,

        3

    )

AND stock_quantity > demo_min_stock;

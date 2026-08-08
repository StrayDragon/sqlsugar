-- 复杂的循环和条件控制
-- Advanced Loops and Conditionals

-- 基础循环
SELECT * FROM orders
WHERE 1=1

    AND status IN (

        'pending',

        'paid',

        'shipped'

    )

    AND created_at > ''2024-06-01''

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

            AND u.0 = 'd'

            AND u.1 = 'e'

            AND u.2 = 'm'

            AND u.3 = 'o'

            AND u.4 = '_'

            AND u.5 = 'u'

            AND u.6 = 's'

            AND u.7 = 'e'

            AND u.8 = 'r'

            AND u.9 = '_'

            AND u.10 = 'f'

            AND u.11 = 'i'

            AND u.12 = 'l'

            AND u.13 = 't'

            AND u.14 = 'e'

            AND u.15 = 'r'

            AND u.16 = 's'

ORDER BY o.created_at DESC
LIMIT demo_limit;

-- 使用 else 子句
SELECT * FROM inventory
WHERE 1=1

    AND warehouse_id IN (

        1,

        2,

        3

    )

AND stock_quantity > demo_min_stock;

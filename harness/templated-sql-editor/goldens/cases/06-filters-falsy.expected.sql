-- 高级测试表达式
-- Advanced Test Expressions

-- 使用 defined 测试
SELECT * FROM orders
WHERE 1=1

    AND user_id = 123

    AND status = 'active'

    AND total_amount >= 99.99

    AND total_amount <= 99.99
    ;

-- 使用 divisibleby 测试
SELECT
    order_id,
    user_id,
    total_amount,

    'Large Batch' as batch_type

FROM orders
WHERE created_at > ''2026-08-08''
LIMIT 100;

-- 使用 odd/even 测试（通过 loop 对象）
SELECT
    product_id,
    name,
    price
FROM products
WHERE category_id IN (

        1,

        2,

        3

)
ORDER BY name;

-- 组合多个测试
SELECT * FROM users
WHERE 1=1

    AND username = '示例名称'

        AND age = 25

    AND email = 'demo_email'

    ;

-- 使用 in 测试
SELECT * FROM products
WHERE 1=1

    AND category = 'electronics'

    AND is_premium = 1

    AND status = 'active'
    ;

-- 复杂的条件组合
SELECT
    order_id,
    user_id,
    status,
    total_amount
FROM orders
WHERE

        1=1

ORDER BY created_at DESC;

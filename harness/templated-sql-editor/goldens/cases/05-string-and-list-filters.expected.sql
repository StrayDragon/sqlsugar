-- 复杂过滤器组合
-- Complex Filters Combination

-- 字符串处理过滤器链
SELECT
    'WIRELESS MOUSE' as formatted_name,
    'A compact Bluetooth mouse for travel' as short_desc,
    'sale, accessory' as tag_list
FROM products
WHERE
    -- 使用 lower 过滤器进行不区分大小写的搜索
    LOWER(name) LIKE LOWER('%Mouse%')

    AND category IN (

            'PERIPHERALS',

            'OFFICE'

    )
    ;

-- 数字和默认值过滤器
SELECT
    product_id,
    name,
    price * 42 as discounted_price,
    stock_quantity
FROM products
WHERE
    price BETWEEN 99.99 AND 99.99
    AND stock_quantity >= demo_min_stock

    AND is_featured = NaN

ORDER BY price 42
LIMIT 100 OFFSET 0;

-- 列表过滤器
SELECT
    user_id,
    username,
    email
FROM users
WHERE

    user_id IN (7, 8, 9)

    AND user_id NOT IN (1)

    AND role IN (

            'admin',

            'editor'

    )
    ;

-- 使用 safe 过滤器（注意：在 SQL 中要小心使用）
SELECT * FROM customers
WHERE
    status = 'active'

    ORDER BY created_at DESC

LIMIT 50;

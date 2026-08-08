-- Filter 块的使用
-- Filter Blocks Usage

-- 使用 filter 块应用过滤器到整个内容块

SELECT * FROM USERS
WHERE USERNAME = '示例名称'

-- 使用多个过滤器链（Nunjucks filter 块单过滤器；链用嵌套块表达）

SELECT
        USER_ID,
        USERNAME,
        EMAIL
    FROM USERS
    WHERE STATUS = 'ACTIVE'

-- 在 SQL 注释中使用 filter
/*

GENERATED QUERY FOR USER: 示例名称
DATE: '2026-08-08'

*/

SELECT * FROM orders
WHERE user_id = 123;

-- 使用 filter 块格式化字符串
SELECT
    demo_table_prefix_users as table_name,
    COUNT(*) as user_count
FROM demo_table_prefix_users
WHERE is_active = 1;

-- 组合 filter 块和变量

SELECT
user_id,
    username,
    email,
    created_at,
    updated_at

FROM users
WHERE 1=1

    AND status = 'active'

ORDER BY created_at DESC;

-- 使用 filter 块处理复杂的 WHERE 条件
SELECT * FROM products
WHERE 1=1
AND category = 'default'

    AND price >= 99.99

    AND price <= 99.99

    AND tags && ARRAY[

            'premium',

            'sale'

    ]
ORDER BY price ASC;

-- 使用 filter 块格式化 JSON 字段
SELECT
    order_id,
    jsonb_build_object(
            'user_id', user_id,
            'username', username,
            'email', email
        ) as user_info
FROM orders o
JOIN users u ON o.user_id = u.user_id
WHERE o.status = '42';

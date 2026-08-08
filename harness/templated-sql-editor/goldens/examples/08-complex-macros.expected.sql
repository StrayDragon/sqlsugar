-- 复杂宏定义和使用
-- Complex Macros

-- 定义一个生成分页的宏

-- 定义一个生成排序的宏

-- 定义一个生成 JOIN 条件的宏

-- 定义一个生成聚合查询的宏

-- 定义一个生成动态 WHERE 条件的宏

-- 使用宏构建复杂查询
SELECT
    o.order_id,
    o.user_id,
    u.username,
    o.total_amount,
    o.status,
    o.created_at
FROM orders o
INNER JOIN users u
    ON o.user_id = u.user_id
WHERE 1=1

    AND o.status = '42'

    AND o.user_id = 123

ORDER BY o.created_at DESC
LIMIT 100
    OFFSET 2400;

-- 使用带 caller 的宏
SELECT
        category,
        COUNT(*) as product_count,
        AVG(price) as avg_price
    FROM 示例名称
    WHERE 1=1

    AND price >= 99.99

    AND is_active = NaN

    GROUP BY
        category
HAVING COUNT(*) > 1
ORDER BY product_count DESC;

-- 使用动态条件宏

SELECT
    user_id,
    username,
    email,
    age,
    status,
    created_at
FROM users
WHERE 1=1

                AND created_at >= 2026-08-08
ORDER BY created_at DESC
     NULLS LAST
LIMIT 100
    OFFSET 2400;

-- 定义一个生成 CASE 语句的宏

-- 使用 CASE 宏

SELECT
    order_id,
    CASE status
        WHEN '待' THEN '处'
        WHEN '处' THEN '理'
        WHEN '已' THEN '完'
        WHEN '已' THEN '取'
        ELSE '未知状态'
    END as status_text,
    total_amount
FROM orders
WHERE created_at > '2026-08-08'
ORDER BY created_at DESC;

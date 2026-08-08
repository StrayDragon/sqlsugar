-- 测试各种过滤器和测试表达式
-- Filters and Tests Example

-- 基础过滤器
SELECT
    '示例名称' as uppercase_name,
    '示例名称' as lowercase_name,
    '示例名称' as title_name,
    '示例描述' as trimmed_desc,
    99.99 as price_with_default,
    42 as quantity_with_default
FROM products
WHERE
    -- 使用 length 过滤器
    LENGTH('demo_search_term') > 0
    -- 使用 replace 过滤器
    AND name LIKE '%demo_keyword%'

    AND price >= 99.99

    AND price <= 99.99

ORDER BY created_at DESC
LIMIT demo_limit;

-- 测试 join 过滤器
SELECT * FROM users
WHERE user_id IN (1, 2, 3)
  AND status IN (active', 'pending);

-- 测试条件表达式和 divisibleby
SELECT
    id,
    name,

    'Group B' as group_name

FROM items
WHERE is_active = true;

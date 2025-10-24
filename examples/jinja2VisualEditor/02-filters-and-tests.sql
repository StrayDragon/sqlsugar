-- 测试各种过滤器和测试表达式
-- Filters and Tests Example

-- 基础过滤器
SELECT
    '{{ user_name | upper }}' as uppercase_name,
    '{{ user_name | lower }}' as lowercase_name,
    '{{ user_name | title }}' as title_name,
    '{{ description | trim }}' as trimmed_desc,
    {{ price | default(0) }} as price_with_default,
    {{ quantity | default(1, true) }} as quantity_with_default
FROM products
WHERE
    -- 使用 length 过滤器
    LENGTH('{{ search_term | trim }}') > 0
    -- 使用 replace 过滤器
    AND name LIKE '%{{ keyword | replace(" ", "%") }}%'
    {% if min_price is defined %}
    AND price >= {{ min_price }}
    {% endif %}
    {% if max_price is defined %}
    AND price <= {{ max_price }}
    {% endif %}
ORDER BY created_at DESC
LIMIT {{ limit | default(10) }};

-- 测试 join 过滤器
SELECT * FROM users
WHERE user_id IN ({{ user_ids | join(', ') }})
  AND status IN ({{ statuses | join("', '") | safe }});

-- 测试条件表达式和 divisibleby
SELECT
    id,
    name,
    {% if loop.index is divisibleby(3) %}
    'Group A' as group_name
    {% else %}
    'Group B' as group_name
    {% endif %}
FROM items
WHERE is_active = true;


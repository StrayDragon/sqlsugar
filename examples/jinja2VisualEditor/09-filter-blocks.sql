-- Filter 块的使用
-- Filter Blocks Usage

-- 使用 filter 块应用过滤器到整个内容块
{% filter upper %}
SELECT * FROM users
WHERE username = '{{ username }}'
{% endfilter %}

-- 使用多个过滤器链
{% filter trim | upper %}
    SELECT
        user_id,
        username,
        email
    FROM users
    WHERE status = 'active'
{% endfilter %}

-- 在 SQL 注释中使用 filter
/*
{% filter upper %}
Generated query for user: {{ username }}
Date: {{ current_date }}
{% endfilter %}
*/

SELECT * FROM orders
WHERE user_id = {{ user_id }};

-- 使用 filter 块格式化字符串
SELECT
    {% filter trim %}
        {{ table_prefix }}_users
    {% endfilter %} as table_name,
    COUNT(*) as user_count
FROM {% filter trim %}{{ table_prefix }}_users{% endfilter %}
WHERE is_active = 1;

-- 组合 filter 块和变量
{% set formatted_columns %}
{% filter trim %}
    user_id,
    username,
    email,
    created_at,
    updated_at
{% endfilter %}
{% endset %}

SELECT {{ formatted_columns }}
FROM users
WHERE 1=1
    {% if status %}
    AND status = '{{ status }}'
    {% endif %}
ORDER BY created_at DESC;

-- 使用 filter 块处理复杂的 WHERE 条件
SELECT * FROM products
WHERE 1=1
{% filter trim %}
    {% if category %}
    AND category = '{{ category }}'
    {% endif %}
    {% if min_price %}
    AND price >= {{ min_price }}
    {% endif %}
    {% if max_price %}
    AND price <= {{ max_price }}
    {% endif %}
    {% if tags %}
    AND tags && ARRAY[
        {% for tag in tags %}
            '{{ tag }}'{% if not loop.last %}, {% endif %}
        {% endfor %}
    ]
    {% endif %}
{% endfilter %}
ORDER BY price ASC;

-- 使用 filter 块格式化 JSON 字段
SELECT
    order_id,
    {% filter trim %}
        jsonb_build_object(
            'user_id', user_id,
            'username', username,
            'email', email
        )
    {% endfilter %} as user_info
FROM orders o
JOIN users u ON o.user_id = u.user_id
WHERE o.status = '{{ order_status | default("completed") }}';


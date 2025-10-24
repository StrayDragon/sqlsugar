-- 复杂过滤器组合
-- Complex Filters Combination

-- 字符串处理过滤器链
SELECT
    '{{ product_name | trim | upper | replace("_", " ") }}' as formatted_name,
    '{{ description | trim | truncate(100) }}' as short_desc,
    '{{ tags | join(", ") }}' as tag_list
FROM products
WHERE
    -- 使用 lower 过滤器进行不区分大小写的搜索
    LOWER(name) LIKE LOWER('%{{ search_keyword | trim }}%')
    {% if category_names %}
    AND category IN (
        {% for cat in category_names %}
            '{{ cat | upper }}'{% if not loop.last %}, {% endif %}
        {% endfor %}
    )
    {% endif %};

-- 数字和默认值过滤器
SELECT
    product_id,
    name,
    price * {{ discount_rate | default(1.0) }} as discounted_price,
    stock_quantity
FROM products
WHERE
    price BETWEEN {{ min_price | default(0) }} AND {{ max_price | default(999999) }}
    AND stock_quantity >= {{ min_stock | default(1) }}
    {% if is_featured is defined %}
    AND is_featured = {{ is_featured | int }}
    {% endif %}
ORDER BY price {{ sort_order | default('ASC') }}
LIMIT {{ page_size | default(20) }} OFFSET {{ (page | default(1) - 1) * page_size | default(20) }};

-- 列表过滤器
SELECT
    user_id,
    username,
    email
FROM users
WHERE
    {% if user_ids and user_ids | length > 0 %}
    user_id IN ({{ user_ids | join(', ') }})
    {% else %}
    1=1
    {% endif %}
    {% if excluded_ids and excluded_ids | length > 0 %}
    AND user_id NOT IN ({{ excluded_ids | join(', ') }})
    {% endif %}
    {% if roles %}
    AND role IN (
        {% for role in roles %}
            '{{ role | trim | lower }}'{% if not loop.last %}, {% endif %}
        {% endfor %}
    )
    {% endif %};

-- 使用 safe 过滤器（注意：在 SQL 中要小心使用）
SELECT * FROM {{ table_name | default('users') }}
WHERE
    {{ custom_where_clause | default('1=1') }}
    {% if sort_column %}
    ORDER BY {{ sort_column }} {{ sort_direction | default('ASC') }}
    {% endif %}
LIMIT {{ limit | default(100) }};


-- 高级测试表达式
-- Advanced Test Expressions

-- 使用 defined 测试
SELECT * FROM orders
WHERE 1=1
    {% if user_id is defined and user_id %}
    AND user_id = {{ user_id }}
    {% endif %}
    {% if status is defined %}
    AND status = '{{ status }}'
    {% endif %}
    {% if min_amount is defined and min_amount is not none %}
    AND total_amount >= {{ min_amount }}
    {% endif %}
    {% if max_amount is defined and max_amount is not none %}
    AND total_amount <= {{ max_amount }}
    {% endif %};

-- 使用 divisibleby 测试
SELECT
    order_id,
    user_id,
    total_amount,
    {% if batch_size is divisibleby(10) %}
    'Large Batch' as batch_type
    {% elif batch_size is divisibleby(5) %}
    'Medium Batch' as batch_type
    {% else %}
    'Small Batch' as batch_type
    {% endif %}
FROM orders
WHERE created_at > '{{ cutoff_date }}'
LIMIT {{ batch_size | default(100) }};

-- 使用 odd/even 测试（通过 loop 对象）
SELECT
    product_id,
    name,
    price
FROM products
WHERE category_id IN (
    {% for cat_id in category_ids %}
        {{ cat_id }}{% if not loop.last %}, {% endif %}
    {% endfor %}
)
ORDER BY name;

-- 组合多个测试
SELECT * FROM users
WHERE 1=1
    {% if username is defined and username %}
    AND username = '{{ username }}'
    {% endif %}
    {% if age is defined %}
        {% if age is number %}
        AND age = {{ age }}
        {% endif %}
    {% endif %}
    {% if email is defined and email %}
    AND email = '{{ email }}'
    {% endif %}
    {% if is_active is defined %}
        {% if is_active is sameas true %}
        AND is_active = 1
        {% elif is_active is sameas false %}
        AND is_active = 0
        {% endif %}
    {% endif %};

-- 使用 in 测试
SELECT * FROM products
WHERE 1=1
    {% if 'electronics' in categories %}
    AND category = 'electronics'
    {% endif %}
    {% if 'premium' in tags %}
    AND is_premium = 1
    {% endif %}
    {% if selected_status in ['active', 'pending', 'processing'] %}
    AND status = '{{ selected_status }}'
    {% endif %};

-- 复杂的条件组合
SELECT
    order_id,
    user_id,
    status,
    total_amount
FROM orders
WHERE
    {% if filters is defined and filters %}
        {% if 'status' in filters and filters.status %}
        status = '{{ filters.status }}'
        {% endif %}
        {% if 'min_amount' in filters and filters.min_amount is defined %}
        AND total_amount >= {{ filters.min_amount }}
        {% endif %}
        {% if 'max_amount' in filters and filters.max_amount is defined %}
        AND total_amount <= {{ filters.max_amount }}
        {% endif %}
        {% if 'user_ids' in filters and filters.user_ids | length > 0 %}
        AND user_id IN ({{ filters.user_ids | join(', ') }})
        {% endif %}
    {% else %}
        1=1
    {% endif %}
ORDER BY created_at DESC;


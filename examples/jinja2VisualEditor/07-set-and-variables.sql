-- 变量设置和使用
-- Set Variables and Usage

-- 设置简单变量
{% set default_limit = 100 %}
{% set default_offset = 0 %}
{% set active_status = 'active' %}

-- 设置复杂变量
{% set pagination_limit = limit | default(default_limit) %}
{% set pagination_offset = offset | default(default_offset) %}

-- 使用变量构建查询
SELECT * FROM users
WHERE status = '{{ active_status }}'
    {% if search_term %}
    AND (
        username LIKE '%{{ search_term }}%'
        OR email LIKE '%{{ search_term }}%'
    )
    {% endif %}
ORDER BY created_at DESC
LIMIT {{ pagination_limit }} OFFSET {{ pagination_offset }};

-- 条件设置变量
{% if sort_by == 'name' %}
    {% set order_column = 'name' %}
{% elif sort_by == 'date' %}
    {% set order_column = 'created_at' %}
{% elif sort_by == 'price' %}
    {% set order_column = 'price' %}
{% else %}
    {% set order_column = 'id' %}
{% endif %}

{% set order_direction = sort_direction | default('ASC') | upper %}

SELECT
    product_id,
    name,
    price,
    created_at
FROM products
WHERE is_active = 1
    {% if category %}
    AND category = '{{ category }}'
    {% endif %}
ORDER BY {{ order_column }} {{ order_direction }};

-- 设置列表变量
{% set valid_statuses = ['pending', 'processing', 'completed', 'cancelled'] %}
{% set admin_roles = ['admin', 'super_admin', 'moderator'] %}

SELECT
    order_id,
    user_id,
    status,
    total_amount
FROM orders
WHERE status IN (
    {% for status in valid_statuses %}
        '{{ status }}'{% if not loop.last %}, {% endif %}
    {% endfor %}
)
    {% if user_role in admin_roles %}
    -- 管理员可以看到所有订单
    {% else %}
    -- 普通用户只能看到自己的订单
    AND user_id = {{ current_user_id }}
    {% endif %}
ORDER BY created_at DESC;

-- 使用 set 块设置多行内容
{% set base_where_clause %}
    WHERE is_deleted = 0
    AND is_active = 1
{% endset %}

{% set date_filter %}
    {% if start_date %}
    AND created_at >= '{{ start_date }}'
    {% endif %}
    {% if end_date %}
    AND created_at <= '{{ end_date }}'
    {% endif %}
{% endset %}

SELECT * FROM products
{{ base_where_clause }}
{{ date_filter }}
    {% if min_price %}
    AND price >= {{ min_price }}
    {% endif %}
ORDER BY created_at DESC;

-- 变量作用域示例
{% set global_limit = 50 %}

SELECT * FROM (
    SELECT
        user_id,
        username,
        {% set local_status = 'active' %}
        '{{ local_status }}' as status
    FROM users
    WHERE status = '{{ local_status }}'
    LIMIT {{ global_limit }}
) as active_users;


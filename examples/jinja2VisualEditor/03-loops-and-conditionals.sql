-- 复杂的循环和条件控制
-- Advanced Loops and Conditionals

-- 基础循环
SELECT * FROM orders
WHERE 1=1
{% for status in order_statuses %}
    {% if loop.first %}
    AND status IN (
    {% endif %}
        '{{ status }}'{% if not loop.last %},{% endif %}
    {% if loop.last %}
    )
    {% endif %}
{% endfor %}
{% if created_after %}
    AND created_at > '{{ created_after }}'
{% endif %}
ORDER BY created_at DESC;

-- 带过滤的循环
SELECT * FROM products
WHERE category_id IN (
    {% for cat in categories if cat.is_active %}
        {{ cat.id }}{% if not loop.last %}, {% endif %}
    {% endfor %}
)
{% if min_price %}
    AND price >= {{ min_price }}
{% endif %}
{% if max_price %}
    AND price <= {{ max_price }}
{% endif %};

-- 嵌套循环和条件
SELECT
    u.user_id,
    u.username,
    o.order_id,
    o.total_amount
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE 1=1
{% if user_filters %}
    {% for filter_key, filter_value in user_filters %}
        {% if filter_value %}
            AND u.{{ filter_key }} = '{{ filter_value }}'
        {% endif %}
    {% endfor %}
{% endif %}
{% if order_filters %}
    {% for filter_key, filter_value in order_filters %}
        {% if filter_value %}
            AND o.{{ filter_key }} = '{{ filter_value }}'
        {% endif %}
    {% endfor %}
{% endif %}
ORDER BY o.created_at DESC
LIMIT {{ limit | default(100) }};

-- 使用 else 子句
SELECT * FROM inventory
WHERE 1=1
{% for warehouse_id in warehouse_ids %}
    {% if loop.first %}
    AND warehouse_id IN (
    {% endif %}
        {{ warehouse_id }}{% if not loop.last %}, {% endif %}
    {% if loop.last %}
    )
    {% endif %}
{% else %}
    -- 如果没有仓库ID，返回所有仓库
    AND 1=1
{% endfor %}
AND stock_quantity > {{ min_stock | default(0) }};


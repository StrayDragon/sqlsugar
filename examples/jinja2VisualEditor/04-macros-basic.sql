-- 宏定义和使用示例
-- Macros Example

-- 定义一个生成 WHERE 条件的宏
{% macro where_clause(field, operator, value, value_type='string') -%}
    {% if value is defined and value %}
        {% if value_type == 'string' %}
            AND {{ field }} {{ operator }} '{{ value }}'
        {% else %}
            AND {{ field }} {{ operator }} {{ value }}
        {% endif %}
    {% endif %}
{%- endmacro %}

-- 定义一个生成日期范围条件的宏
{% macro date_range(field, start_date, end_date) -%}
    {% if start_date %}
        AND {{ field }} >= '{{ start_date }}'
    {% endif %}
    {% if end_date %}
        AND {{ field }} <= '{{ end_date }}'
    {% endif %}
{%- endmacro %}

-- 定义一个生成 IN 子句的宏
{% macro in_clause(field, values) -%}
    {% if values and values | length > 0 %}
        AND {{ field }} IN (
        {% for value in values %}
            '{{ value }}'{% if not loop.last %}, {% endif %}
        {% endfor %}
        )
    {% endif %}
{%- endmacro %}

-- 使用宏构建查询
SELECT
    user_id,
    username,
    email,
    created_at,
    status
FROM users
WHERE 1=1
    {{ where_clause('username', 'LIKE', username_pattern, 'string') }}
    {{ where_clause('age', '>=', min_age, 'number') }}
    {{ where_clause('age', '<=', max_age, 'number') }}
    {{ date_range('created_at', start_date, end_date) }}
    {{ in_clause('status', user_statuses) }}
    {{ where_clause('is_active', '=', is_active, 'number') }}
ORDER BY created_at DESC
LIMIT {{ limit | default(50) }};

-- 使用宏的另一个示例
SELECT
    order_id,
    user_id,
    total_amount,
    order_date,
    status
FROM orders
WHERE 1=1
    {{ where_clause('status', '=', order_status, 'string') }}
    {{ date_range('order_date', order_start_date, order_end_date) }}
    {{ where_clause('total_amount', '>=', min_amount, 'number') }}
    {{ in_clause('payment_method', payment_methods) }}
ORDER BY order_date DESC;


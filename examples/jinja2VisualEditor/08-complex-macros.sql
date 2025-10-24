-- 复杂宏定义和使用
-- Complex Macros

-- 定义一个生成分页的宏
{% macro pagination(page, page_size) -%}
    LIMIT {{ page_size | default(20) }}
    OFFSET {{ ((page | default(1)) - 1) * (page_size | default(20)) }}
{%- endmacro %}

-- 定义一个生成排序的宏
{% macro order_by(column, direction='ASC', nulls_position='') -%}
    ORDER BY {{ column }} {{ direction | upper }}
    {%- if nulls_position %}
     NULLS {{ nulls_position | upper }}
    {%- endif %}
{%- endmacro %}

-- 定义一个生成 JOIN 条件的宏
{% macro join_table(join_type, table_name, alias, on_condition) -%}
    {{ join_type | upper }} JOIN {{ table_name }} {{ alias }}
    ON {{ on_condition }}
{%- endmacro %}

-- 定义一个生成聚合查询的宏
{% macro aggregate_select(fields, group_by_fields) -%}
    SELECT
    {%- for field in fields %}
        {{ field }}{% if not loop.last %},{% endif %}
    {%- endfor %}
    FROM {{ table_name }}
    WHERE 1=1
    {{ caller() }}
    {%- if group_by_fields %}
    GROUP BY
    {%- for field in group_by_fields %}
        {{ field }}{% if not loop.last %},{% endif %}
    {%- endfor %}
    {%- endif %}
{%- endmacro %}

-- 定义一个生成动态 WHERE 条件的宏
{% macro dynamic_where(conditions) -%}
    {%- for condition in conditions %}
        {%- if condition.value is defined and condition.value %}
            {%- if condition.type == 'string' %}
                AND {{ condition.field }} {{ condition.operator | default('=') }} '{{ condition.value }}'
            {%- elif condition.type == 'number' %}
                AND {{ condition.field }} {{ condition.operator | default('=') }} {{ condition.value }}
            {%- elif condition.type == 'list' %}
                AND {{ condition.field }} IN (
                {%- for val in condition.value %}
                    '{{ val }}'{% if not loop.last %}, {% endif %}
                {%- endfor %}
                )
            {%- elif condition.type == 'range' %}
                {%- if condition.value.min is defined %}
                AND {{ condition.field }} >= {{ condition.value.min }}
                {%- endif %}
                {%- if condition.value.max is defined %}
                AND {{ condition.field }} <= {{ condition.value.max }}
                {%- endif %}
            {%- endif %}
        {%- endif %}
    {%- endfor %}
{%- endmacro %}

-- 使用宏构建复杂查询
SELECT
    o.order_id,
    o.user_id,
    u.username,
    o.total_amount,
    o.status,
    o.created_at
FROM orders o
{{ join_table('INNER', 'users', 'u', 'o.user_id = u.user_id') }}
WHERE 1=1
    {% if order_status %}
    AND o.status = '{{ order_status }}'
    {% endif %}
    {% if user_id %}
    AND o.user_id = {{ user_id }}
    {% endif %}
{{ order_by('o.created_at', 'DESC') }}
{{ pagination(page, page_size) }};

-- 使用带 caller 的宏
{% call aggregate_select(['category', 'COUNT(*) as product_count', 'AVG(price) as avg_price'], ['category']) %}
    {% if min_price %}
    AND price >= {{ min_price }}
    {% endif %}
    {% if is_active is defined %}
    AND is_active = {{ is_active | int }}
    {% endif %}
{% endcall %}
HAVING COUNT(*) > {{ min_count | default(0) }}
{{ order_by('product_count', 'DESC') }};

-- 使用动态条件宏
{% set search_conditions = [
    {'field': 'username', 'operator': 'LIKE', 'value': username_pattern, 'type': 'string'},
    {'field': 'age', 'operator': '>=', 'value': min_age, 'type': 'number'},
    {'field': 'status', 'operator': 'IN', 'value': statuses, 'type': 'list'},
    {'field': 'created_at', 'value': {'min': start_date, 'max': end_date}, 'type': 'range'}
] %}

SELECT
    user_id,
    username,
    email,
    age,
    status,
    created_at
FROM users
WHERE 1=1
{{ dynamic_where(search_conditions) }}
{{ order_by('created_at', 'DESC', 'LAST') }}
{{ pagination(page, page_size) }};

-- 定义一个生成 CASE 语句的宏
{% macro case_when(field, mappings, default_value) -%}
    CASE {{ field }}
    {%- for key, value in mappings %}
        WHEN '{{ key }}' THEN '{{ value }}'
    {%- endfor %}
        ELSE '{{ default_value }}'
    END
{%- endmacro %}

-- 使用 CASE 宏
{% set status_mappings = [
    ('pending', '待处理'),
    ('processing', '处理中'),
    ('completed', '已完成'),
    ('cancelled', '已取消')
] %}

SELECT
    order_id,
    {{ case_when('status', status_mappings, '未知状态') }} as status_text,
    total_amount
FROM orders
WHERE created_at > '{{ start_date | default('2024-01-01') }}'
{{ order_by('created_at', 'DESC') }};


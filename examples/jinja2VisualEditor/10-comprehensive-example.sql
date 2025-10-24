-- 综合示例：电商订单查询系统
-- Comprehensive Example: E-commerce Order Query System

-- ============================================
-- 宏定义区域
-- ============================================

{% macro safe_where(field, operator, value, value_type='string') -%}
    {%- if value is defined and value is not none %}
        {%- if value_type == 'string' %}
            AND {{ field }} {{ operator }} '{{ value | trim }}'
        {%- elif value_type == 'number' %}
            AND {{ field }} {{ operator }} {{ value }}
        {%- elif value_type == 'list' and value | length > 0 %}
            AND {{ field }} IN (
            {%- for item in value %}
                {%- if value_type == 'string_list' %}
                '{{ item }}'
                {%- else %}
                {{ item }}
                {%- endif %}
                {%- if not loop.last %}, {% endif %}
            {%- endfor %}
            )
        {%- endif %}
    {%- endif %}
{%- endmacro %}

{% macro date_range_filter(field, start, end, include_time=false) -%}
    {%- if start %}
        {%- if include_time %}
            AND {{ field }} >= '{{ start }}'
        {%- else %}
            AND DATE({{ field }}) >= '{{ start }}'
        {%- endif %}
    {%- endif %}
    {%- if end %}
        {%- if include_time %}
            AND {{ field }} <= '{{ end }}'
        {%- else %}
            AND DATE({{ field }}) <= '{{ end }}'
        {%- endif %}
    {%- endif %}
{%- endmacro %}

{% macro pagination_clause(page, page_size, max_limit=1000) -%}
    {%- set safe_page_size = [page_size | default(20), max_limit] | min %}
    {%- set safe_page = page | default(1) %}
    LIMIT {{ safe_page_size }}
    OFFSET {{ (safe_page - 1) * safe_page_size }}
{%- endmacro %}

{% macro sort_clause(sort_by, sort_order, allowed_columns) -%}
    {%- if sort_by and sort_by in allowed_columns %}
        ORDER BY {{ sort_by }} {{ sort_order | default('ASC') | upper }}
    {%- else %}
        ORDER BY created_at DESC
    {%- endif %}
{%- endmacro %}

-- ============================================
-- 变量设置区域
-- ============================================

{% set allowed_sort_columns = ['order_id', 'created_at', 'total_amount', 'status', 'user_id'] %}
{% set default_page_size = 50 %}
{% set max_page_size = 500 %}

{% set status_filter_enabled = order_statuses and order_statuses | length > 0 %}
{% set user_filter_enabled = user_ids and user_ids | length > 0 %}
{% set date_filter_enabled = start_date or end_date %}
{% set amount_filter_enabled = min_amount or max_amount %}

-- ============================================
-- 主查询
-- ============================================

WITH order_stats AS (
    SELECT
        o.order_id,
        o.user_id,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at,
        COUNT(oi.item_id) as item_count,
        SUM(oi.quantity) as total_quantity
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE 1=1
        -- 状态过滤
        {% if status_filter_enabled %}
        AND o.status IN (
            {% for status in order_statuses %}
                '{{ status | trim | lower }}'{% if not loop.last %}, {% endif %}
            {% endfor %}
        )
        {% endif %}

        -- 用户过滤
        {{ safe_where('o.user_id', 'IN', user_ids, 'list') }}

        -- 日期范围过滤
        {{ date_range_filter('o.created_at', start_date, end_date, include_time) }}

        -- 金额范围过滤
        {% if min_amount is defined and min_amount is not none %}
        AND o.total_amount >= {{ min_amount }}
        {% endif %}
        {% if max_amount is defined and max_amount is not none %}
        AND o.total_amount <= {{ max_amount }}
        {% endif %}

        -- 支付方式过滤
        {{ safe_where('o.payment_method', 'IN', payment_methods, 'string_list') }}

        -- 配送方式过滤
        {% if shipping_method %}
        AND o.shipping_method = '{{ shipping_method }}'
        {% endif %}

        -- 是否包含优惠券
        {% if has_coupon is defined %}
            {% if has_coupon %}
            AND o.coupon_id IS NOT NULL
            {% else %}
            AND o.coupon_id IS NULL
            {% endif %}
        {% endif %}

        -- 软删除过滤
        AND o.is_deleted = 0

    GROUP BY o.order_id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at
),

user_info AS (
    SELECT
        u.user_id,
        u.username,
        u.email,
        u.user_level,
        u.total_orders,
        u.total_spent
    FROM users u
    WHERE u.is_active = 1
        {% if user_level %}
        AND u.user_level = '{{ user_level }}'
        {% endif %}
        {% if min_total_spent %}
        AND u.total_spent >= {{ min_total_spent }}
        {% endif %}
)

-- 最终结果集
SELECT
    os.order_id,
    os.user_id,
    ui.username,
    ui.email,
    ui.user_level,
    os.total_amount,
    os.status,
    os.item_count,
    os.total_quantity,
    os.created_at,
    os.updated_at,
    -- 计算折扣率
    {% if calculate_discount %}
    CASE
        WHEN ui.user_level = 'vip' THEN os.total_amount * 0.9
        WHEN ui.user_level = 'gold' THEN os.total_amount * 0.95
        ELSE os.total_amount
    END as discounted_amount,
    {% endif %}
    -- 状态显示名称
    CASE os.status
        WHEN 'pending' THEN '待支付'
        WHEN 'paid' THEN '已支付'
        WHEN 'processing' THEN '处理中'
        WHEN 'shipped' THEN '已发货'
        WHEN 'delivered' THEN '已送达'
        WHEN 'completed' THEN '已完成'
        WHEN 'cancelled' THEN '已取消'
        WHEN 'refunded' THEN '已退款'
        ELSE '未知状态'
    END as status_display
FROM order_stats os
INNER JOIN user_info ui ON os.user_id = ui.user_id
WHERE 1=1
    -- 订单项数量过滤
    {% if min_items %}
    AND os.item_count >= {{ min_items }}
    {% endif %}
    {% if max_items %}
    AND os.item_count <= {{ max_items }}
    {% endif %}

    -- 总数量过滤
    {% if min_total_quantity %}
    AND os.total_quantity >= {{ min_total_quantity }}
    {% endif %}

-- 排序
{{ sort_clause(sort_by, sort_order, allowed_sort_columns) }}

-- 分页
{{ pagination_clause(page, page_size, max_page_size) }};

-- ============================================
-- 统计查询（可选）
-- ============================================

{% if include_statistics %}

-- 订单统计
SELECT
    COUNT(DISTINCT o.order_id) as total_orders,
    COUNT(DISTINCT o.user_id) as unique_users,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_amount,
    MIN(o.total_amount) as min_order_amount,
    MAX(o.total_amount) as max_order_amount,
    -- 按状态统计
    {% for status in ['pending', 'paid', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'] %}
    SUM(CASE WHEN o.status = '{{ status }}' THEN 1 ELSE 0 END) as {{ status }}_count{% if not loop.last %},{% endif %}
    {% endfor %}
FROM orders o
WHERE 1=1
    {{ date_range_filter('o.created_at', start_date, end_date, include_time) }}
    AND o.is_deleted = 0;

{% endif %}


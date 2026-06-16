-- 混合参数风格示例
-- Mixed Parameter Styles Example

-- ============================================
-- 场景1: Jinja2 + Named (SQLAlchemy 风格)
-- 适用于: 使用 SQLAlchemy ORM 的 Python 项目
-- ============================================
SELECT
    u.id,
    u.name,
    u.email,
    COUNT(o.id) AS order_count
FROM {{ table_name | default('users') }} u
LEFT JOIN orders o ON u.id = o.user_id
WHERE 1=1
{% if filter_by_status %}
  AND u.status = :user_status
{% endif %}
{% if filter_by_role %}
  AND u.role = :user_role
{% endif %}
{% if date_range %}
  AND u.created_at BETWEEN :start_date AND :end_date
{% endif %}
GROUP BY u.id, u.name, u.email
{% if having_count %}
HAVING COUNT(o.id) >= :min_order_count
{% endif %}
ORDER BY u.created_at DESC
LIMIT :limit;

-- ============================================
-- 场景2: Jinja2 + Asyncpg (异步 PostgreSQL)
-- 适用于: 使用 asyncpg 的异步 Python 项目
-- ============================================
SELECT
    p.id,
    p.title,
    p.content,
    u.username AS author
FROM posts p
INNER JOIN users u ON p.author_id = u.id
WHERE 1=1
{% if category_id %}
  AND p.category_id = $1
{% endif %}
{% if search_term %}
  AND (p.title ILIKE $2 OR p.content ILIKE $3)
{% endif %}
{% if date_filter %}
  AND p.created_at > $4
{% endif %}
{% if featured_only %}
  AND p.is_featured = true
{% endif %}
ORDER BY p.created_at DESC
LIMIT $5;

-- ============================================
-- 场景3: Jinja2 + Pyformat (psycopg2 风格)
-- 适用于: 使用 psycopg2 的同步 Python 项目
-- ============================================
INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    created_at
) VALUES (
    %(user_id)s,
    %(action)s,
    {{ resource_type | sql_quote }},
    %(resource_id)s,
    %(details)s,
    %(ip_address)s,
    NOW()
);

-- ============================================
-- 场景4: Jinja2 + Numeric (Oracle 风格)
-- 适用于: Oracle 数据库项目
-- ============================================
SELECT
    e.employee_id,
    e.first_name,
    e.last_name,
    d.department_name,
    e.salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id
WHERE 1=1
{% if department_id %}
  AND e.department_id = :1
{% endif %}
{% if min_salary %}
  AND e.salary >= :2
{% endif %}
{% if max_salary %}
  AND e.salary <= :3
{% endif %}
{% if hire_date_after %}
  AND e.hire_date > :4
{% endif %}
ORDER BY e.salary DESC
OFFSET :5 ROWS FETCH NEXT :6 ROWS ONLY;

-- ============================================
-- 场景5: 全混合 - 动态查询构建器风格
-- 适用于: 需要高度灵活的查询场景
-- ============================================
WITH filtered_orders AS (
    SELECT
        o.id,
        o.user_id,
        o.total_amount,
        o.status,
        o.created_at
    FROM orders o
    WHERE 1=1
    {% if order_status %}
      AND o.status = :order_status        -- Named: SQLAlchemy 兼容
    {% endif %}
    {% if date_from %}
      AND o.created_at >= :date_from      -- Named
    {% endif %}
    {% if date_to %}
      AND o.created_at <= :date_to        -- Named
    {% endif %}
),
user_stats AS (
    SELECT
        user_id,
        COUNT(*) AS order_count,
        SUM(total_amount) AS total_spent
    FROM filtered_orders
    GROUP BY user_id
)
SELECT
    u.id,
    u.name,
    u.email,
    us.order_count,
    us.total_spent,
    CASE
        WHEN us.total_spent > 1000 THEN 'VIP'
        WHEN us.total_spent > 500 THEN 'Gold'
        ELSE 'Regular'
    END AS tier
FROM users u
INNER JOIN user_stats us ON u.id = us.user_id
WHERE 1=1
{% if min_orders %}
  AND us.order_count >= $1               -- Asyncpg
{% endif %}
{% if min_spent %}
  AND us.total_spent >= $2               -- Asyncpg
{% endif %}
{% if user_tier %}
  AND CASE
    WHEN us.total_spent > 1000 THEN 'VIP'
    WHEN us.total_spent > 500 THEN 'Gold'
    ELSE 'Regular'
  END = %(tier)s                         -- Pyformat
{% endif %}
ORDER BY us.total_spent DESC
LIMIT {{ limit | default(50) }};          -- Jinja2 变量

-- ============================================
-- 场景6: 存储过程调用 (混合风格)
-- 适用于: 复杂的数据库操作
-- ============================================
{% if use_stored_proc %}
-- 使用存储过程
CALL process_order(
    :order_id,           -- Named
    :user_id,            -- Named
    %(payment_method)s,  -- Pyformat
    $1                   -- Asyncpg (输出参数)
);
{% else %}
-- 使用内联 SQL
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT
    :order_id,
    p.id,
    $1,
    p.price * (1 - COALESCE(d.discount_rate, 0))
FROM products p
LEFT JOIN discounts d ON p.id = d.product_id
    AND d.valid_from <= CURRENT_DATE
    AND d.valid_until >= CURRENT_DATE
WHERE p.id = %(product_id)s;
{% endif %}

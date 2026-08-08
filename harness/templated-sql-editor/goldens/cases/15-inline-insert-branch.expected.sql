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
FROM 示例名称 u
LEFT JOIN orders o ON u.id = o.user_id
WHERE 1=1

  AND u.status = 'demo_user_status'

  AND u.role = 'demo_user_role'

  AND u.created_at BETWEEN 'demo_start_date' AND 'demo_end_date'

GROUP BY u.id, u.name, u.email

HAVING COUNT(o.id) >= 'demo_min_order_count'

ORDER BY u.created_at DESC
LIMIT 'demo_limit';

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

  AND p.category_id = 3

  AND (p.title ILIKE 'demo_2' OR p.content ILIKE 'demo_3')

  AND p.created_at > 'demo_4'

  AND p.is_featured = true

ORDER BY p.created_at DESC
LIMIT 'demo_5';

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
    'sample_id',
    'demo_action',
    'default',
    'sample_id',
    'demo_details',
    'demo_ip_address',
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

  AND e.department_id = 3

  AND e.salary >= 'demo_2'

  AND e.salary <= 'demo_3'

  AND e.hire_date > 'demo_4'

ORDER BY e.salary DESC
OFFSET 'demo_5' ROWS FETCH NEXT 'demo_6' ROWS ONLY;

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

      AND o.status = 'demo_order_status'        -- Named: SQLAlchemy 兼容

      AND o.created_at >= 'demo_date_from'      -- Named

      AND o.created_at <= 'demo_date_to'        -- Named

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

  AND us.order_count >= 3               -- Asyncpg

  AND us.total_spent >= 'demo_2'               -- Asyncpg

  AND CASE
    WHEN us.total_spent > 1000 THEN 'VIP'
    WHEN us.total_spent > 500 THEN 'Gold'
    ELSE 'Regular'
  END = 'demo_tier'                         -- Pyformat

ORDER BY us.total_spent DESC
LIMIT demo_limit;          -- Jinja2 变量

-- ============================================
-- 场景6: 存储过程调用 (混合风格)
-- 适用于: 复杂的数据库操作
-- ============================================

-- 使用内联 SQL
INSERT INTO order_items (order_id, product_id, quantity, price)
SELECT
    2002,
    p.id,
    3,
    p.price * (1 - COALESCE(d.discount_rate, 0))
FROM products p
LEFT JOIN discounts d ON p.id = d.product_id
    AND d.valid_from <= CURRENT_DATE
    AND d.valid_until >= CURRENT_DATE
WHERE p.id = 88;

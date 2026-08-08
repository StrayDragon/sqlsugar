-- 综合示例：电商订单查询系统
-- Comprehensive Example: E-commerce Order Query System

-- ============================================
-- 宏定义区域
-- ============================================

-- ============================================
-- 变量设置区域
-- ============================================

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

        AND o.status IN (

                'alpha',

                'beta'

        )

        -- 用户过滤

        -- 日期范围过滤

            AND o.created_at >= '2026-08-08'
            AND o.created_at <= '2026-09-07'

        -- 金额范围过滤

        AND o.total_amount >= 99.99

        AND o.total_amount <= 99.99

        -- 支付方式过滤

        -- 配送方式过滤

        AND o.shipping_method = 'demo_shipping_method'

        -- 是否包含优惠券

            AND o.coupon_id IS NOT NULL

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

        AND u.user_level = '1'

        AND u.total_spent >= 99.99

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

    CASE
        WHEN ui.user_level = 'vip' THEN os.total_amount * 0.9
        WHEN ui.user_level = 'gold' THEN os.total_amount * 0.95
        ELSE os.total_amount
    END as discounted_amount,

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

    AND os.item_count >= demo_min_items

    AND os.item_count <= demo_max_items

    -- 总数量过滤

    AND os.total_quantity >= 1

-- 排序

        ORDER BY created_at DESC

-- 分页

    LIMIT 100
    OFFSET 2400;

-- ============================================
-- 统计查询（可选）
-- ============================================

-- 订单统计
SELECT
    COUNT(DISTINCT o.order_id) as total_orders,
    COUNT(DISTINCT o.user_id) as unique_users,
    SUM(o.total_amount) as total_revenue,
    AVG(o.total_amount) as avg_order_amount,
    MIN(o.total_amount) as min_order_amount,
    MAX(o.total_amount) as max_order_amount,
    -- 按状态统计

    SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending_count,

    SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END) as paid_count,

    SUM(CASE WHEN o.status = 'processing' THEN 1 ELSE 0 END) as processing_count,

    SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) as shipped_count,

    SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,

    SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_count,

    SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,

    SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) as refunded_count

FROM orders o
WHERE 1=1

            AND o.created_at >= '2026-08-08'
            AND o.created_at <= '2026-09-07'
    AND o.is_deleted = 0;

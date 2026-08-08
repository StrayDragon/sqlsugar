-- 宏定义和使用示例
-- Macros Example

-- 定义一个生成 WHERE 条件的宏

-- 定义一个生成日期范围条件的宏

-- 定义一个生成 IN 子句的宏

-- 使用宏构建查询
SELECT
    user_id,
    username,
    email,
    created_at,
    status
FROM users
WHERE 1=1

            AND username LIKE '示例名称'

            AND age >= 25

            AND age <= 25

        AND created_at >= ''2026-08-08''

        AND created_at <= ''2026-09-07''

        AND status IN (

            'a',

            'c',

            't',

            'i',

            'v',

            'e'

        )

            AND is_active = true

ORDER BY created_at DESC
LIMIT demo_limit;

-- 使用宏的另一个示例
SELECT
    order_id,
    user_id,
    total_amount,
    order_date,
    status
FROM orders
WHERE 1=1

            AND status = '42'

        AND order_date >= '42'

        AND order_date <= '42'

            AND total_amount >= 99.99

        AND payment_method IN (

            'd',

            'e',

            'm',

            'o',

            '_',

            'p',

            'a',

            'y',

            'm',

            'e',

            'n',

            't',

            '_',

            'm',

            'e',

            't',

            'h',

            'o',

            'd',

            's'

        )

ORDER BY order_date DESC;

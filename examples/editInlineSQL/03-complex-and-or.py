def get_complex_query():
    query = """
            SELECT user_id,
                   user_name,
                   email_address,
                   created_date
            FROM user_accounts
            WHERE status = 'active'
              AND created_date >= '2024-01-01'
            """
    return query

def get_complex_query_edited():
    query = """
            SELECT user_id,
                   user_name,
                   email_address,
                   phone_number,
                   created_date
            FROM user_accounts
            WHERE status = 'active'
              AND created_date >= '2024-01-01'
              AND email_verified = TRUE
            ORDER BY created_date DESC
            LIMIT 1000
            """
    return query

def get_nested_query():
    query = """
            WITH active_users AS (
                SELECT user_id,
                       user_name,
                       email_address
                FROM user_accounts
                WHERE status = 'active'
                  AND created_date >= '2024-01-01'
            )
            SELECT u.user_id,
                   u.user_name,
                   u.email_address,
                   COUNT(o.order_id) as order_count
            FROM active_users u
            LEFT JOIN orders o ON u.user_id = o.user_id
            WHERE u.user_name LIKE '%john%'
               OR u.email_address LIKE '%john%'
            GROUP BY u.user_id, u.user_name, u.email_address
            HAVING COUNT(o.order_id) > 0
            ORDER BY order_count DESC
            """
    return query

def get_nested_query_edited():
    query = """
            WITH active_users AS (
                SELECT user_id,
                       user_name,
                       email_address,
                       phone_number
                FROM user_accounts
                WHERE status = 'active'
                  AND created_date >= '2024-01-01'
                  AND email_verified = TRUE
            ),
            user_orders AS (
                SELECT user_id,
                       COUNT(order_id) as order_count,
                       SUM(total_amount) as total_spent
                FROM orders
                WHERE order_date >= '2024-01-01'
                  AND status = 'completed'
                GROUP BY user_id
            )
            SELECT u.user_id,
                   u.user_name,
                   u.email_address,
                   u.phone_number,
                   COALESCE(o.order_count, 0) as order_count,
                   COALESCE(o.total_spent, 0) as total_spent
            FROM active_users u
            LEFT JOIN user_orders o ON u.user_id = o.user_id
            WHERE u.user_name LIKE '%john%'
               OR u.email_address LIKE '%john%'
               OR u.phone_number LIKE '%john%'
            GROUP BY u.user_id, u.user_name, u.email_address, u.phone_number
            HAVING COALESCE(o.total_spent, 0) > 100
            ORDER BY o.total_spent DESC
            LIMIT 1000
            """
    return query
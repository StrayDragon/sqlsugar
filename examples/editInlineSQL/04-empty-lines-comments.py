def get_user_query():
    query = """
            SELECT user_id,
                   user_name,
                   email_address,
                   created_date
            FROM user_accounts
            WHERE status = 'active'
              AND created_date >= '2024-01-01'

            -- Only include users with verified email
              AND email_verified = TRUE
            """
    return query

def get_user_query_edited():
    query = """
            SELECT user_id,
                   user_name,
                   email_address,
                   phone_number,
                   created_date
            FROM user_accounts
            WHERE status = 'active'
              AND created_date >= '2024-01-01'

            -- Only include users with verified email
              AND email_verified = TRUE

            -- Include users from specific departments
              AND department_id IN (1, 2, 3)

            ORDER BY created_date DESC
            LIMIT 1000
            """
    return query

def get_analytics_query():
    query = """
            -- Monthly user analytics report
            -- Generated for management review

            SELECT
                   DATE_TRUNC('month', created_date) as month,
                   COUNT(*) as new_users,
                   COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                   AVG(CASE WHEN total_orders > 0 THEN total_orders ELSE NULL END) as avg_orders
            FROM user_accounts
            WHERE created_date >= '2024-01-01'

            -- Exclude test accounts
              AND is_test_account = FALSE

            GROUP BY DATE_TRUNC('month', created_date)
            ORDER BY month DESC

            -- Limit to last 12 months
            LIMIT 12
            """
    return query

def get_analytics_query_edited():
    query = """
            -- Monthly user analytics report
            -- Generated for management review
            -- Updated to include department breakdown

            SELECT
                   DATE_TRUNC('month', created_date) as month,
                   COUNT(*) as new_users,
                   COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                   AVG(CASE WHEN total_orders > 0 THEN total_orders ELSE NULL END) as avg_orders,
                   department_id,
                   COUNT(DISTINCT department_id) as department_count
            FROM user_accounts
            WHERE created_date >= '2024-01-01'

            -- Exclude test accounts
              AND is_test_account = FALSE

            -- Include only paying customers
              AND subscription_tier IN ('premium', 'enterprise')

            GROUP BY DATE_TRUNC('month', created_date), department_id
            HAVING COUNT(*) > 5

            ORDER BY month DESC, department_count DESC

            -- Limit to last 12 months
            LIMIT 24
            """
    return query
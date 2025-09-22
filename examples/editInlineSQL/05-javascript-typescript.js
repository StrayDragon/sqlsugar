function getUserQuery(userId) {
    const query = `
        SELECT id,
               name,
               email,
               created_at
        FROM users
        WHERE id = ${userId}
          AND active = true
    `;
    return query;
}

function getUserQueryEdited(userId, departmentId) {
    const query = `
        SELECT id,
               name,
               email,
               phone_number,
               created_at
        FROM users
        WHERE id = ${userId}
          AND active = true
          ${departmentId ? `AND department_id = ${departmentId}` : ''}
        ORDER BY created_at DESC
    `;
    return query;
}

class UserRepository {
    constructor(db) {
        this.db = db;
    }

    async getUsersByDepartment(departmentId, limit = 10) {
        const query = `
            SELECT u.id,
                   u.name,
                   u.email,
                   u.created_at,
                   COUNT(o.id) as order_count
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.department_id = ${departmentId}
              AND u.active = true
              AND u.created_at >= '2024-01-01'
            GROUP BY u.id, u.name, u.email, u.created_at
            HAVING COUNT(o.id) > 0
            ORDER BY order_count DESC
            LIMIT ${limit}
        `;

        const result = await this.db.query(query);
        return result.rows;
    }

    async getUsersByDepartmentEdited(departmentId, limit = 10, minOrders = 0) {
        const query = `
            SELECT u.id,
                   u.name,
                   u.email,
                   u.phone_number,
                   u.created_at,
                   COUNT(o.id) as order_count,
                   COALESCE(SUM(o.total_amount), 0) as total_spent
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.department_id = ${departmentId}
              AND u.active = true
              AND u.created_at >= '2024-01-01'
              AND u.email_verified = true
            GROUP BY u.id, u.name, u.email, u.phone_number, u.created_at
            HAVING COUNT(o.id) > ${minOrders}
               AND COALESCE(SUM(o.total_amount), 0) > 100
            ORDER BY total_spent DESC
            LIMIT ${limit}
        `;

        const result = await this.db.query(query);
        return result.rows;
    }
}

// React component example
function UserSearchComponent({ departmentId, onResults }) {
    const [loading, setLoading] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState('');

    const handleSearch = async () => {
        setLoading(true);
        try {
            const query = `
                SELECT id,
                       name,
                       email,
                       created_at
                FROM users
                WHERE department_id = ${departmentId}
                  AND active = true
                  AND (name ILIKE '%${searchTerm}%' OR email ILIKE '%${searchTerm}%')
                ORDER BY name ASC
                LIMIT 50
            `;

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const users = await response.json();
            onResults(users);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchEdited = async () => {
        setLoading(true);
        try {
            const query = `
                SELECT id,
                       name,
                       email,
                       phone_number,
                       created_at
                FROM users
                WHERE department_id = ${departmentId}
                  AND active = true
                  AND email_verified = true
                  AND (name ILIKE '%${searchTerm}%'
                       OR email ILIKE '%${searchTerm}%'
                       OR phone_number ILIKE '%${searchTerm}%')
                ORDER BY name ASC
                LIMIT 100
            `;

            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const users = await response.json();
            onResults(users);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return React.createElement('div', { className: 'user-search' },
        React.createElement('input', {
            type: 'text',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            placeholder: 'Search users...'
        }),
        React.createElement('button', {
            onClick: handleSearch,
            disabled: loading
        }, loading ? 'Searching...' : 'Search')
    );
}
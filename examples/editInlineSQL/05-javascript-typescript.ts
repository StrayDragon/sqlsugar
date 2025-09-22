interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
}

function getUserQuery(userId: number): string {
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

function getUserQueryEdited(userId: number, departmentId?: number): string {
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
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    async getUsersByDepartment(departmentId: number, limit: number = 10): Promise<User[]> {
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

    async getUsersByDepartmentEdited(departmentId: number, limit: number = 10, minOrders: number = 0): Promise<User[]> {
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
interface UserSearchProps {
    departmentId: number;
    onResults: (users: User[]) => void;
}

function UserSearchComponent({ departmentId, onResults }: UserSearchProps) {
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    return (
        <div className="user-search">
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users..."
            />
            <button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
            </button>
        </div>
    );
}
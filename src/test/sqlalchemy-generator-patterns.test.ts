import * as assert from 'assert';
import { SQLLogParser, ParsedSQL } from '../sql-log-parser';

suite('SQLAlchemy Generator Pattern Tests', () => {

	// === Timestamped Log Formats ===
	test('Parse timestamped INFO log format', () => {
		const logText = `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine BEGIN (implicit)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse timestamped INFO log');
		assert.strictEqual(parsed!.originalSQL, 'BEGIN (implicit)');
		assert.strictEqual(parsed!.placeholderType, 'none');
	});

	test('Parse timestamped log with parameters', () => {
		const logText = `2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse timestamped log with parameters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 5);
		assert.deepStrictEqual(parsed!.parameters, ['Electronics', 1000, 'Books', 50, 10]);
	});

	// === Raw SQL and No Key Patterns ===
	test('Parse raw SQL pattern', () => {
		const logText = `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse raw SQL pattern');
		assert.strictEqual(parsed!.originalSQL, '');
		assert.strictEqual(parsed!.placeholderType, 'none');
	});

	test('Parse no key pattern with parameters', () => {
		const logText = `2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse no key pattern');
		assert.strictEqual(parsed!.originalSQL, '');
		assert.strictEqual(parsed!.placeholderType, 'none');
	});

	// === Complex SQL with Subqueries and EXISTS ===
	test('Parse complex SQL with EXISTS subquery', () => {
		const logText = `2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE EXISTS (SELECT count(reviews.id) AS count_1
FROM reviews
WHERE reviews.product_id = products.id
HAVING avg(reviews.rating) > ?)
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (4,)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse complex SQL with EXISTS subquery');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 1);
		assert.strictEqual(parsed!.parameters[0], 4);
	});

	test('Parse complex SQL with HAVING clause', () => {
		const logText = `2025-09-15 22:37:56,913 INFO sqlalchemy.engine.Engine SELECT users.name, orders.id, orders.total_amount, count(order_items.id) as item_count
FROM users JOIN orders ON users.id = orders.user_id JOIN order_items ON orders.id = order_items.order_id
WHERE users.is_active = 1 GROUP BY users.id, orders.id
HAVING count(order_items.id) > ?
2025-09-15 22:37:56,913 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (0,)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse complex SQL with HAVING clause');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 1);
		assert.strictEqual(parsed!.parameters[0], 0);
	});

	// === Multi-line SQL Statements ===
	test('Parse multi-line CREATE TABLE statement', () => {
		const logText = `2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine
CREATE TABLE users (
	id INTEGER NOT NULL,
	name VARCHAR(100) NOT NULL,
	email VARCHAR(255) NOT NULL,
	age INTEGER NOT NULL,
	is_active BOOLEAN NOT NULL,
	created_at DATETIME NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (email)
)

2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse multi-line CREATE TABLE');
		assert.ok(parsed!.originalSQL.includes('CREATE TABLE users'));
		assert.ok(parsed!.originalSQL.includes('PRIMARY KEY (id)'));
	});

	test('Parse multi-line window function query', () => {
		const logText = `2025-09-15 22:37:56,918 INFO sqlalchemy.engine.Engine
            SELECT
                p.name,
                p.price,
                p.category,
                RANK() OVER (PARTITION BY p.category ORDER BY p.price DESC) as price_rank
            FROM products p
            ORDER BY p.category, price_rank

2025-09-15 22:37:56,918 INFO sqlalchemy.engine.Engine [generated in 0.00007s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse multi-line window function query');
		assert.ok(parsed!.originalSQL.includes('RANK() OVER'));
		assert.ok(parsed!.originalSQL.includes('PARTITION BY'));
	});

	// === JSON Operations and Date Functions ===
	test('Parse JSON operation with json_extract', () => {
		const logText = `2025-09-15 22:37:56,926 INFO sqlalchemy.engine.Engine
            SELECT * FROM products
            WHERE json_extract(metadata, '$.brand') = 'Apple'

2025-09-15 22:37:56,926 INFO sqlalchemy.engine.Engine [generated in 0.00015s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse JSON operation');
		assert.ok(parsed!.originalSQL.includes('json_extract'));
		assert.ok(parsed!.originalSQL.includes("'Apple'"));
	});

	test('Parse date functions query', () => {
		const logText = `2025-09-15 22:37:56,926 INFO sqlalchemy.engine.Engine
            SELECT
                DATE(order_date) as order_date,
                COUNT(*) as daily_orders,
                SUM(total_amount) as daily_revenue
            FROM orders
            WHERE order_date >= date('now', '-7 days')
            GROUP BY DATE(order_date)
            ORDER BY order_date

2025-09-15 22:37:56,927 INFO sqlalchemy.engine.Engine [generated in 0.00009s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse date functions query');
		assert.ok(parsed!.originalSQL.includes('DATE(order_date)'));
		assert.ok(parsed!.originalSQL.includes("date('now', '-7 days')"));
	});

	// === CTE and Recursive Queries ===
	test('Parse CTE with recursive query', () => {
		const logText = `2025-09-15 22:37:56,928 INFO sqlalchemy.engine.Engine
            WITH RECURSIVE category_tree AS (
                SELECT id, name, parent_id, name as path
                FROM categories
                WHERE parent_id IS NULL
                UNION ALL
                SELECT c.id, c.name, c.parent_id, ct.path || ' > ' || c.name
                FROM categories c
                JOIN category_tree ct ON c.parent_id = ct.id
            )
            SELECT * FROM category_tree ORDER BY path

2025-09-15 22:37:56,928 INFO sqlalchemy.engine.Engine [generated in 0.00007s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse CTE with recursive query');
		assert.ok(parsed!.originalSQL.includes('WITH RECURSIVE'));
		assert.ok(parsed!.originalSQL.includes('UNION ALL'));
	});

	// === Various Parameter Formats ===
	test('Parse dictionary-style parameters', () => {
		const logText = `2025-09-15 22:37:56,930 INFO sqlalchemy.engine.Engine
            SELECT name, price, category
            FROM products
            WHERE price BETWEEN ? AND ?
            AND category = ?
            ORDER BY price

2025-09-15 22:37:56,930 INFO sqlalchemy.engine.Engine [generated in 0.00007s] (100, 1000, 'Electronics')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse dictionary-style parameters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 3);
		assert.deepStrictEqual(parsed!.parameters, [100, 1000, 'Electronics']);
	});

	test('Parse IN clause parameters', () => {
		const logText = `2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.id IN (?, ?, ?)
2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine [generated in 0.00010s] (1, 2, 3)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse IN clause parameters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 3);
		assert.deepStrictEqual(parsed!.parameters, [1, 2, 3]);
	});

	test('Parse mixed parameter types', () => {
		const logText = `2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine
            SELECT u.name, u.email, o.total_amount, o.status
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE u.is_active = ?
            AND o.status IN (?, ?)
            AND o.total_amount > ?

2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine [generated in 0.00007s] (True, 'completed', 'pending', 100.0)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse mixed parameter types');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 4);
		assert.deepStrictEqual(parsed!.parameters, [true, 'completed', 'pending', 100.0]);
	});

	// === Large Numbers and Edge Cases ===
	test('Parse large number parameters', () => {
		const logText = `2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine SELECT ? as test_num
2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine [generated in 0.00006s] (999999999999999,)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse large number parameters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 1);
		assert.strictEqual(parsed!.parameters[0], 999999999999999);
	});

	test('Parse empty parameter list', () => {
		const logText = `2025-09-15 22:37:56,918 INFO sqlalchemy.engine.Engine ROLLBACK`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse empty parameter list');
		assert.strictEqual(parsed!.originalSQL, 'ROLLBACK');
		assert.strictEqual(parsed!.placeholderType, 'none');
	});

	// === Complex Aggregate Queries ===
	test('Parse aggregate functions with GROUP BY', () => {
		const logText = `2025-09-15 22:37:56,922 INFO sqlalchemy.engine.Engine SELECT products.category, count(products.id) AS product_count, avg(products.price) AS avg_price, sum(products.stock) AS total_stock
FROM products GROUP BY products.category
HAVING count(products.id) > ?
2025-09-15 22:37:56,922 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (0,)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse aggregate functions with GROUP BY');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 1);
		assert.strictEqual(parsed!.parameters[0], 0);
	});

	test('Parse complex aggregation with JOIN', () => {
		const logText = `2025-09-15 22:37:56,923 INFO sqlalchemy.engine.Engine
            SELECT
                u.name,
                COUNT(o.id) as order_count,
                COALESCE(SUM(o.total_amount), 0) as total_spent,
                COALESCE(AVG(o.total_amount), 0) as avg_order_value,
                MAX(o.order_date) as last_order_date
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            WHERE u.is_active = true
            GROUP BY u.id, u.name
            ORDER BY total_spent DESC

2025-09-15 22:37:56,923 INFO sqlalchemy.engine.Engine [generated in 0.00007s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse complex aggregation with JOIN');
		assert.ok(parsed!.originalSQL.includes('COUNT(o.id)'));
		assert.ok(parsed!.originalSQL.includes('COALESCE'));
		assert.ok(parsed!.originalSQL.includes('LEFT JOIN'));
	});

	// === Edge Cases and Special Patterns ===
	test('Parse BEGIN and COMMIT statements', () => {
		const logText = `2025-09-15 22:37:56,921 INFO sqlalchemy.engine.Engine BEGIN (implicit)
2025-09-15 22:37:56,925 INFO sqlalchemy.engine.Engine ROLLBACK`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse BEGIN statement');
		assert.strictEqual(parsed!.originalSQL, 'BEGIN (implicit)');
	});

	test('Parse subquery with correlated EXISTS', () => {
		const logText = `2025-09-15 22:37:56,935 INFO sqlalchemy.engine.Engine SELECT users.id, users.name, users.email, users.age, users.is_active, users.created_at
FROM users
WHERE NOT (EXISTS (SELECT 1
FROM user_profiles
WHERE users.id = user_profiles.user_id))
2025-09-15 22:37:56,935 INFO sqlalchemy.engine.Engine [generated in 0.00007s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse subquery with correlated EXISTS');
		assert.ok(parsed!.originalSQL.includes('NOT (EXISTS'));
		assert.ok(parsed!.originalSQL.includes('user_profiles'));
	});

	test('Parse PRAGMA statements', () => {
		const logText = `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine PRAGMA main.table_info("users")
2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse PRAGMA statements');
		assert.strictEqual(parsed!.originalSQL, 'PRAGMA main.table_info("users")');
	});

	// === Complex Multi-line Parameter Handling ===
	test('Parse complex WHERE clause with OR and AND', () => {
		const logText = `2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse complex WHERE clause');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 5);
		assert.deepStrictEqual(parsed!.parameters, ['Electronics', 1000, 'Books', 50, 10]);

		// Verify the injected SQL is correct
		assert.ok(parsed!.injectedSQL.includes("products.category = 'Electronics'"));
		assert.ok(parsed!.injectedSQL.includes("products.price > 1000"));
		assert.ok(parsed!.injectedSQL.includes("OR products.category = 'Books'"));
	});

	// === Performance Statistics Parsing ===
	test('Parse log with detailed performance stats', () => {
		const logText = `2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine SELECT COUNT(*) FROM users WHERE is_active = ?
2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine [generated in 0.00023s] (True,)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse log with performance stats');
		assert.strictEqual(parsed!.originalSQL, 'SELECT COUNT(*) FROM users WHERE is_active = ?');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 1);
		assert.strictEqual(parsed!.parameters[0], true);
	});

	test('Parse multiple consecutive logs correctly', () => {
		const logText = `2025-09-15 22:37:56,921 INFO sqlalchemy.engine.Engine BEGIN (implicit)
2025-09-15 22:37:56,922 INFO sqlalchemy.engine.Engine SELECT products.category, count(products.id) AS product_count FROM products GROUP BY products.category
2025-09-15 22:37:56,925 INFO sqlalchemy.engine.Engine ROLLBACK`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse multiple consecutive logs');
		// Should pick the first meaningful SQL query
		assert.strictEqual(parsed!.originalSQL, 'BEGIN (implicit)');
	});

	// === NULL and Special Value Handling ===
	test('Parse queries with NULL values in parameters', () => {
		const logText = `2025-09-15 22:37:56,935 INFO sqlalchemy.engine.Engine SELECT name FROM users WHERE name = '' OR email = ''
2025-09-15 22:37:56,935 INFO sqlalchemy.engine.Engine [generated in 0.00006s] ()`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse queries with empty strings');
		assert.strictEqual(parsed!.originalSQL, "SELECT name FROM users WHERE name = '' OR email = ''");
		assert.strictEqual(parsed!.placeholderType, 'none');
	});

});
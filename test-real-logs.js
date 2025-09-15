#!/usr/bin/env node

const { SQLLogParser } = require('./dist/sql-log-parser.js');

// Test cases from actual SQLAlchemy logs
const testCases = [
    {
        name: 'Simple SELECT with parameters',
        log: `2025-09-15 22:37:56,922 INFO sqlalchemy.engine.Engine SELECT products.category, count(products.id) AS product_count, avg(products.price) AS avg_price, sum(products.stock) AS total_stock
FROM products GROUP BY products.category
HAVING count(products.id) > ?
2025-09-15 22:37:56,922 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (0,)`,
        expectedParams: [0]
    },
    {
        name: 'Complex WHERE with OR/AND',
        log: `2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)`,
        expectedParams: ['Electronics', 1000, 'Books', 50, 10]
    },
    {
        name: 'List parameters',
        log: `2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.id IN (?, ?, ?)
2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine [generated in 0.00010s] (1, 2, 3)`,
        expectedParams: [1, 2, 3]
    },
    {
        name: 'Mixed parameter types',
        log: `2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine
            SELECT u.name, u.email, o.total_amount, o.status
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE u.is_active = ?
            AND o.status IN (?, ?)
            AND o.total_amount > ?

2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine [generated in 0.00007s] (True, 'completed', 'pending', 100.0)`,
        expectedParams: [true, 'completed', 'pending', 100.0]
    },
    {
        name: 'Large number',
        log: `2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine SELECT ? as test_num
2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine [generated in 0.00006s] (999999999999999,)`,
        expectedParams: [999999999999999]
    },
    {
        name: 'Complex subquery with EXISTS',
        log: `2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE EXISTS (SELECT count(reviews.id) AS count_1
FROM reviews
WHERE reviews.product_id = products.id
HAVING avg(reviews.rating) > ?)
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (4,)`,
        expectedParams: [4]
    },
    {
        name: 'Multi-line CREATE TABLE',
        log: `2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine
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

2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()`,
        expectedParams: []
    }
];

console.log('Testing SQL Log Parser with real SQLAlchemy logs...\n');

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);

    try {
        const result = SQLLogParser.processSelectedText(testCase.log);

        if (result) {
            console.log(`  ✅ Original SQL: ${result.originalSQL.substring(0, 100)}...`);
            console.log(`  ✅ Placeholder type: ${result.placeholderType}`);
            console.log(`  ✅ Parameters: [${result.parameters.join(', ')}]`);

            // Check if parameters match expected
            const paramsMatch = JSON.stringify(result.parameters) === JSON.stringify(testCase.expectedParams);
            if (paramsMatch) {
                console.log(`  ✅ Parameters match expected values`);
                passedTests++;
            } else {
                console.log(`  ❌ Parameters mismatch. Expected: [${testCase.expectedParams.join(', ')}], Got: [${result.parameters.join(', ')}]`);
            }

            console.log(`  ✅ Injected SQL: ${result.injectedSQL.substring(0, 100)}...`);
        } else {
            console.log(`  ❌ Failed to parse log`);
        }
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
    }

    console.log('');
}

console.log(`Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The parser handles real SQLAlchemy logs correctly.');
} else {
    console.log('⚠️  Some tests failed. The parser may need further improvements.');
}
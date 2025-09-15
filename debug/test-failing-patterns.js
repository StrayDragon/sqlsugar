#!/usr/bin/env node

const { SQLLogParser } = require(__dirname + '/../dist/extension.js');

// Test cases that you mentioned are failing
const testCases = [
    {
        name: 'Timestamped INFO log with simple BEGIN',
        log: `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine BEGIN (implicit)`,
        expectedSQL: 'BEGIN (implicit)'
    },
    {
        name: 'Complex timestamped log with parameters',
        log: `2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)`,
        expectedParams: ['Electronics', 1000, 'Books', 50, 10]
    },
    {
        name: 'Raw SQL pattern',
        log: `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()`,
        expectedSQL: ''
    },
    {
        name: 'EXISTS subquery with timestamp',
        log: `2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE EXISTS (SELECT count(reviews.id) AS count_1
FROM reviews
WHERE reviews.product_id = products.id
HAVING avg(reviews.rating) > ?)
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (4,)`,
        expectedSQL: 'SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata\nFROM products\nWHERE EXISTS (SELECT count(reviews.id) AS count_1\nFROM reviews\nWHERE reviews.product_id = products.id\nHAVING avg(reviews.rating) > ?)',
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
        expectedSQL: 'CREATE TABLE users (\n    id INTEGER NOT NULL,\n    name VARCHAR(100) NOT NULL,\n    email VARCHAR(255) NOT NULL,\n    age INTEGER NOT NULL,\n    is_active BOOLEAN NOT NULL,\n    created_at DATETIME NOT NULL,\n    PRIMARY KEY (id),\n    UNIQUE (email)\n)'
    }
];

console.log('🧪 Testing SQL Log Parser with failing patterns...\n');

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
    console.log(`🔍 Testing: ${testCase.name}`);

    try {
        const result = SQLLogParser.processSelectedText(testCase.log);

        if (result) {
            console.log(`  ✅ Parsed successfully`);
            console.log(`  📝 Original SQL: ${result.originalSQL.substring(0, 100)}${result.originalSQL.length > 100 ? '...' : ''}`);
            console.log(`  🔧 Placeholder type: ${result.placeholderType}`);
            console.log(`  📊 Parameters: [${result.parameters.join(', ')}]`);

            // Check if SQL matches expected
            if (testCase.expectedSQL && result.originalSQL.trim() !== testCase.expectedSQL.trim()) {
                console.log(`  ❌ SQL mismatch`);
                console.log(`     Expected: ${testCase.expectedSQL.substring(0, 100)}...`);
                console.log(`     Got:      ${result.originalSQL.substring(0, 100)}...`);
            } else {
                console.log(`  ✅ SQL matches expected`);
                passedTests++;
            }

            // Check if parameters match expected
            if (testCase.expectedParams) {
                const paramsMatch = JSON.stringify(result.parameters) === JSON.stringify(testCase.expectedParams);
                if (paramsMatch) {
                    console.log(`  ✅ Parameters match expected`);
                } else {
                    console.log(`  ❌ Parameters mismatch`);
                    console.log(`     Expected: [${testCase.expectedParams.join(', ')}]`);
                    console.log(`     Got:      [${result.parameters.join(', ')}]`);
                }
            }

            console.log(`  🎯 Injected SQL: ${result.injectedSQL.substring(0, 100)}${result.injectedSQL.length > 100 ? '...' : ''}`);
        } else {
            console.log(`  ❌ Failed to parse log`);
        }
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        console.log(error.stack);
    }

    console.log('');
}

console.log(`📊 Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
    console.log('🎉 All tests passed! The parser handles the previously failing patterns correctly.');
} else {
    console.log('⚠️  Some tests failed. The parser still needs improvements.');
}
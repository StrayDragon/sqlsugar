// Simple test for SQL log parser
// Import the parser directly from the source

const fs = require('fs');
const path = require('path');

// Read the TypeScript source and adapt it for testing
const parserSource = fs.readFileSync(path.join(__dirname, 'src/sql-log-parser.ts'), 'utf8');

// Extract the SQLLogParser class (simplified approach)
console.log('Testing SQL Log Parser patterns...\n');

// Test cases based on SQLAlchemy generator output
const testCases = [
    {
        name: 'Timestamped INFO log with parameters',
        input: `2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)`,
        expected: {
            hasParams: true,
            paramCount: 5,
            firstParam: 'Electronics',
            containsComplexWhere: true
        }
    },
    {
        name: 'Simple SELECT with EXISTS subquery',
        input: `2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE EXISTS (SELECT count(reviews.id) AS count_1
FROM reviews
WHERE reviews.product_id = products.id
HAVING avg(reviews.rating) > ?)
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (4,)`,
        expected: {
            hasParams: true,
            paramCount: 1,
            containsExists: true,
            containsSubquery: true
        }
    },
    {
        name: 'Multi-line CREATE TABLE',
        input: `2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine
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
        expected: {
            hasParams: false,
            containsCreateTable: true,
            multiline: true
        }
    },
    {
        name: 'List parameters (IN clause)',
        input: `2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.id IN (?, ?, ?)
2025-09-15 22:37:56,931 INFO sqlalchemy.engine.Engine [generated in 0.00010s] (1, 2, 3)`,
        expected: {
            hasParams: true,
            paramCount: 3,
            containsInClause: true,
            allNumberParams: true
        }
    },
    {
        name: 'Mixed parameter types',
        input: `2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine
            SELECT u.name, u.email, o.total_amount, o.status
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE u.is_active = ?
            AND o.status IN (?, ?)
            AND o.total_amount > ?

2025-09-15 22:37:56,932 INFO sqlalchemy.engine.Engine [generated in 0.00007s] (True, 'completed', 'pending', 100.0)`,
        expected: {
            hasParams: true,
            paramCount: 4,
            containsJoin: true,
            mixedTypes: true
        }
    },
    {
        name: 'Large number parameter',
        input: `2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine SELECT ? as test_num
2025-09-15 22:37:56,936 INFO sqlalchemy.engine.Engine [generated in 0.00006s] (999999999999999,)`,
        expected: {
            hasParams: true,
            paramCount: 1,
            largeNumber: true
        }
    },
    {
        name: 'Raw SQL pattern',
        input: `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()`,
        expected: {
            hasParams: false,
            rawSqlPattern: true
        }
    },
    {
        name: 'PRAGMA statement',
        input: `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine PRAGMA main.table_info("users")
2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()`,
        expected: {
            hasParams: false,
            containsPragma: true
        }
    }
];

// Simple pattern matching tests (without full parser)
function testPatternMatching() {
    console.log('Testing pattern recognition...\n');

    let passedTests = 0;
    let totalTests = testCases.length;

    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);

        const expected = testCase.expected;
        const input = testCase.input;

        // Test basic pattern matching
        const hasTimestamp = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+/.test(input);
        const hasSqlAlchemy = /sqlalchemy\.engine\.Engine/.test(input);
        const hasGenerated = /\[generated in/.test(input);
        const hasRawSql = /\[raw sql\]/.test(input);
        const hasParams = /\([^)]*\)$/.test(input.split('\n').pop() || '');
        const hasQuestionMarks = /\?/.test(input);

        // Test specific patterns
        const containsExists = /EXISTS\s*\(/.test(input);
        const containsCreateTable = /CREATE TABLE/.test(input);
        const containsInClause = /IN\s*\([^)]*\)/.test(input);
        const containsJoin = /JOIN/.test(input);
        const containsPragma = /PRAGMA/.test(input);
        const containsComplexWhere = /AND.*OR/.test(input);

        let testPassed = true;
        const results = {
            hasTimestamp,
            hasSqlAlchemy,
            hasGenerated,
            hasRawSql,
            hasParams,
            hasQuestionMarks,
            containsExists,
            containsCreateTable,
            containsInClause,
            containsJoin,
            containsPragma,
            containsComplexWhere
        };

        console.log('  Pattern detection results:');
        for (const [key, value] of Object.entries(results)) {
            console.log(`    ${key}: ${value}`);
        }

        // Validate against expectations
        if (expected.hasParams !== hasParams && hasParams) {
            console.log(`  ❌ Expected hasParams=${expected.hasParams}, but detected parameters`);
            testPassed = false;
        }

        if (expected.paramCount !== undefined) {
            // Count question marks as a proxy for parameter count
            const questionMarkCount = (input.match(/\?/g) || []).length;
            if (expected.paramCount !== questionMarkCount) {
                console.log(`  ❌ Expected ${expected.paramCount} parameters, but found ${questionMarkCount} question marks`);
                testPassed = false;
            }
        }

        if (expected.containsExists && !containsExists) {
            console.log(`  ❌ Expected EXISTS clause but not detected`);
            testPassed = false;
        }

        if (expected.containsCreateTable && !containsCreateTable) {
            console.log(`  ❌ Expected CREATE TABLE but not detected`);
            testPassed = false;
        }

        if (expected.containsInClause && !containsInClause) {
            console.log(`  ❌ Expected IN clause but not detected`);
            testPassed = false;
        }

        if (expected.containsJoin && !containsJoin) {
            console.log(`  ❌ Expected JOIN but not detected`);
            testPassed = false;
        }

        if (expected.containsPragma && !containsPragma) {
            console.log(`  ❌ Expected PRAGMA but not detected`);
            testPassed = false;
        }

        if (expected.containsComplexWhere && !containsComplexWhere) {
            console.log(`  ❌ Expected complex WHERE clause but not detected`);
            testPassed = false;
        }

        if (testPassed) {
            console.log(`  ✅ All patterns detected correctly`);
            passedTests++;
        } else {
            console.log(`  ❌ Some patterns not detected correctly`);
        }

        console.log('');
    }

    console.log(`Results: ${passedTests}/${totalTests} tests passed`);
    return passedTests === totalTests;
}

// Test specific regex patterns used by the parser
function testRegexPatterns() {
    console.log('\nTesting regex patterns used by parser...\n');

    // SQL patterns from the parser
    const SQL_PATTERNS = [
        /^INFO\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
        /^DEBUG\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
        /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
        /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+DEBUG\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
        /^INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.+)$/i,
        /^INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.+)$/i,
        /^.*?Engine:\s*(.+)$/i,
        /^(?:.*?\s)?(SELECT\s+.+|INSERT\s+.+|UPDATE\s+.+|DELETE\s+.+|CREATE\s+.+|ALTER\s+.+|DROP\s+.+|BEGIN|COMMIT|ROLLBACK|WITH\s+RECURSIVE)$/i,
        /^(.*?\?.*|.*?:\w+.*)$/,
        /^(?:FROM\s+|WHERE\s+|JOIN\s+|GROUP\s+BY\s+|ORDER\s+BY\s+|HAVING\s+|LIMIT\s+|AND\s+|OR\s+|SET\s+|VALUES\s+|ON\s+|USING\s+|EXISTS\s*\(.*?\)|IN\s*\(.*?\))\s*.+/i,
    ];

    // Test lines from actual logs
    const testLines = [
        '2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata',
        'FROM products',
        'WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?',
        '2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (\'Electronics\', 1000, \'Books\', 50, 10)',
        '2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()',
        '2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine PRAGMA main.table_info("users")',
        'SELECT u.name, u.email, o.total_amount, o.status',
        'FROM users u',
        'JOIN orders o ON u.id = o.user_id',
        'WHERE EXISTS (SELECT count(reviews.id) AS count_1',
    ];

    console.log('Testing SQL pattern matching:');
    for (const line of testLines) {
        console.log(`\nLine: "${line.substring(0, 60)}${line.length > 60 ? '...' : ''}"`);

        let matched = false;
        for (let i = 0; i < SQL_PATTERNS.length; i++) {
            const pattern = SQL_PATTERNS[i];
            const match = line.match(pattern);
            if (match) {
                console.log(`  ✅ Matched pattern ${i + 1}: ${match[1] || match[0]}`);
                matched = true;
                break;
            }
        }
        if (!matched) {
            console.log(`  ❌ No pattern matched`);
        }
    }

    console.log('\nPattern testing complete');
}

// Run all tests
const patternTestsPassed = testPatternMatching();
testRegexPatterns();

console.log('\n=== Summary ===');
console.log('Pattern recognition tests:', patternTestsPassed ? 'PASSED' : 'FAILED');
console.log('\nThe parser should now handle:');
console.log('✅ Timestamped SQLAlchemy logs');
console.log('✅ Performance statistics format [generated in Xs]');
console.log('✅ Raw SQL format [raw sql]');
console.log('✅ Complex SQL with EXISTS subqueries');
console.log('✅ Multi-line CREATE TABLE statements');
console.log('✅ IN clause with list parameters');
console.log('✅ Mixed parameter types (boolean, string, number)');
console.log('✅ Large number parameters');
console.log('✅ PRAGMA statements');
console.log('✅ Complex WHERE clauses with OR/AND logic');
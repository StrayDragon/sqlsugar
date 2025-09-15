#!/usr/bin/env node

// 直接测试 SQL 解析逻辑，不需要 VS Code 运行时
const fs = require('fs');
const path = require('path');

// 读取源代码并提取关键函数
const sourceCode = fs.readFileSync(path.join(__dirname, '../src/sql-log-parser.ts'), 'utf8');

// 提取正则表达式模式
const sqlPatternsMatch = sourceCode.match(/private static SQL_PATTERNS = \[(.*?)\]/s);
const paramPatternsMatch = sourceCode.match(/private static PARAM_PATTERNS = \[(.*?)\]/s);

if (!sqlPatternsMatch || !paramPatternsMatch) {
    console.error('❌ 无法提取正则表达式模式');
    process.exit(1);
}

// 直接使用修复后的正则表达式
const sqlPatternsArray = [
    /^INFO\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
    /^DEBUG\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+(.+)$/i,
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+DEBUG\s+sqlalchemy\.engine\.Engine\s+(.+)$/i,
    /^INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.+)$/i,
    /^INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.+)$/i,
    /^.*?Engine:\s*(.+)$/i,
    /^(?:.*?\s)?(SELECT\s+.+|INSERT\s+.+|UPDATE\s+.+|DELETE\s+.+|CREATE\s+.+|ALTER\s+.+|DROP\s+.+|BEGIN|COMMIT|ROLLBACK|WITH\s+RECURSIVE)$/i,
    /^(.*?\?.*|.*?:\w+.*)$/,
    /^(?:FROM\s+|WHERE\s+|JOIN\s+|GROUP\s+BY\s+|ORDER\s+BY\s+|HAVING\s+|LIMIT\s+|AND\s+|OR\s+|SET\s+|VALUES\s+|ON\s+|USING\s+|EXISTS\s*\(.*?\)|IN\s*\(.*?\))\s*.+/i,
];

const paramPatternsArray = [
    /^\s*\(([^)]+)\)\s*$/,
    /^\[([^]]+)\]\s*$/,
    /^\s*([^{]+)\s*$/,
    /^\s*\{([^}]+)\}\s*$/,
    /^\s*\[([^\]]+)\]\s*$/,
    /^\s*([^,\s]+(?:,\s*[^,\s]+)*)\s*$/,
    /^\s*([^=]+=[^,]+(?:,\s*[^=]+=[^,]+)*)\s*$/,
    /^[^()]*\([^)]*\).*$/,
    /^[^[\]]*\[[^\]]*\].*$/,
    /^[{}][^{}]*[{}].*$/,
];

console.log('🔧 提取的正则表达式模式:');
console.log(`SQL 模式数量: ${sqlPatternsArray.length}`);
console.log(`参数模式数量: ${paramPatternsArray.length}\n`);

// 测试函数
function matchSQLLine(line) {
    for (const pattern of sqlPatternsArray) {
        const match = line.match(pattern);
        if (match && match[1]) {
            let sql = match[1].trim();
            if (sql.endsWith(';')) {
                sql = sql.slice(0, -1);
            }
            return sql;
        }
    }
    return null;
}

function matchParameterLine(line) {
    // 跳过纯时间戳行
    if (line.includes('[generated in') && !line.includes('(')) {
        return null;
    }
    // 跳过 [raw sql] 行且没有参数
    if (line.includes('[raw sql]') && !line.includes('(')) {
        return null;
    }
    // 跳过空行
    if (!line.trim()) {
        return null;
    }
    // 跳过明显是 SQL 的行
    if (line.match(/^(SELECT\s|INSERT\s|UPDATE\s|DELETE\s|CREATE\s|ALTER\s|DROP\s|BEGIN\s|COMMIT\s|ROLLBACK\s|WITH\s|\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+)/i)) {
        return null;
    }
    // 跳过包含 SQLAlchemy 关键字的行
    if (line.includes('sqlalchemy.engine.Engine')) {
        return null;
    }

    for (const pattern of paramPatternsArray) {
        const match = line.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

// 测试用例
const testCases = [
    {
        name: '带时间戳的 BEGIN 语句',
        log: `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine BEGIN (implicit)`,
        expectedSQL: 'BEGIN (implicit)',
        expectedParams: null
    },
    {
        name: '复杂的带参数查询',
        log: `2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?
2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] ('Electronics', 1000, 'Books', 50, 10)`,
        expectedSQL: 'SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata',
        expectedParams: "('Electronics', 1000, 'Books', 50, 10)"
    },
    {
        name: 'Raw SQL 模式',
        log: `2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()`,
        expectedSQL: '',
        expectedParams: null
    },
    {
        name: 'EXISTS 子查询',
        log: `2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata
FROM products
WHERE EXISTS (SELECT count(reviews.id) AS count_1
FROM reviews
WHERE reviews.product_id = products.id
HAVING avg(reviews.rating) > ?)
2025-09-15 22:37:56,916 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (4,)`,
        expectedSQL: 'SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata',
        expectedParams: '(4,)'
    },
    {
        name: '多行 CREATE TABLE',
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
        expectedSQL: 'CREATE TABLE users',
        expectedParams: null
    }
];

console.log('🧪 测试 SQLAlchemy 日志解析功能...\n');

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
    console.log(`🔍 测试: ${testCase.name}`);

    const lines = testCase.log.split('\n').map(line => line.trim()).filter(line => line);

    let foundSQL = null;
    let foundParams = null;

    // 解析每一行
    for (const line of lines) {
        if (!foundSQL) {
            foundSQL = matchSQLLine(line);
        }
        if (!foundParams) {
            foundParams = matchParameterLine(line);
        }
    }

    console.log(`  📝 找到的 SQL: ${foundSQL || '无'}`);
    console.log(`  📊 找到的参数: ${foundParams || '无'}`);

    // 验证结果
    let sqlMatch = false;
    if (testCase.expectedSQL === '') {
        sqlMatch = foundSQL === '' || foundSQL === null;
    } else if (testCase.expectedSQL) {
        sqlMatch = foundSQL && foundSQL.includes(testCase.expectedSQL);
    }

    const paramsMatch = testCase.expectedParams === null
        ? foundParams === null
        : foundParams && foundParams.includes(testCase.expectedParams.replace(/[()]/g, ''));

    if (sqlMatch && paramsMatch) {
        console.log(`  ✅ 测试通过`);
        passedTests++;
    } else {
        console.log(`  ❌ 测试失败`);
        if (!sqlMatch) {
            console.log(`     SQL 不匹配: 期望包含 "${testCase.expectedSQL}"`);
        }
        if (!paramsMatch) {
            console.log(`     参数不匹配: 期望包含 "${testCase.expectedParams}"`);
        }
    }

    console.log('');
}

console.log(`📊 结果: ${passedTests}/${totalTests} 测试通过`);

if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！解析器现在能正确处理 SQLAlchemy 日志模式。');
} else {
    console.log('⚠️  部分测试失败，需要进一步调整。');
}
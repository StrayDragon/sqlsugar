#!/usr/bin/env node

// 模拟真实的 SQL 日志解析逻辑
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

    // 检查是否包含参数
    if (line.includes('(') && line.includes(')')) {
        // 提取括号内的内容
        const paramMatch = line.match(/\(([^)]+)\)/);
        if (paramMatch && paramMatch[1]) {
            return paramMatch[1];
        }
    }

    return null;
}

function parseTerminalText(text) {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const entries = [];

    let currentSQL = '';
    let currentParams = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 尝试匹配 SQL
        const sql = matchSQLLine(line);
        if (sql) {
            // 如果已经有 SQL 收集，先保存
            if (currentSQL) {
                entries.push({
                    sql: currentSQL,
                    parameters: currentParams
                });
            }
            currentSQL = sql;
            currentParams = null;
        } else {
            // 如果不是 SQL 但有当前 SQL 收集，可能是多行 SQL 的继续
            if (currentSQL && !line.includes('sqlalchemy.engine.Engine')) {
                // 检查是否是多行 SQL 的续行
                if (line.match(/^(FROM\s+|WHERE\s+|JOIN\s+|GROUP\s+BY\s+|ORDER\s+BY\s+|HAVING\s+|LIMIT\s+|AND\s+|OR\s+|SET\s+|VALUES\s+|ON\s+|USING\s+|EXISTS\s*\(.*?\)|IN\s*\(.*?\))\s*/i) ||
                    line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s+/) || // 列名或其他标识符开头
                    line.match(/^[\s]*[a-zA-Z]/)) { // 字母开头（可能是 SQL 续行）
                    currentSQL += ' ' + line;
                }
            }
        }

        // 尝试匹配参数
        const params = matchParameterLine(line);
        if (params) {
            currentParams = params;
        }
    }

    // 添加最后一个条目
    if (currentSQL) {
        entries.push({
            sql: currentSQL,
            parameters: currentParams
        });
    }

    return entries;
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
        expectedSQL: 'SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata FROM products WHERE products.category = ? AND products.price > ? OR products.category = ? AND products.price < ? OR products.stock < ?',
        expectedParams: "'Electronics', 1000, 'Books', 50, 10"
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
        expectedSQL: 'SELECT products.id, products.name, products.price, products.category, products.stock, products.metadata FROM products WHERE EXISTS (SELECT count(reviews.id) AS count_1 FROM reviews WHERE reviews.product_id = products.id HAVING avg(reviews.rating) > ?)',
        expectedParams: '4,'
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

console.log('🧪 测试完整的 SQLAlchemy 日志解析功能...\n');

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
    console.log(`🔍 测试: ${testCase.name}`);

    const entries = parseTerminalText(testCase.log);

    console.log(`  📝 解析到的条目数: ${entries.length}`);

    if (entries.length > 0) {
        const entry = entries[0]; // 取第一个条目
        console.log(`  📝 SQL: ${entry.sql.substring(0, 100)}${entry.sql.length > 100 ? '...' : ''}`);
        console.log(`  📊 参数: ${entry.parameters || '无'}`);

        // 验证结果
        const sqlMatch = testCase.expectedSQL === ''
            ? entry.sql === ''
            : entry.sql.includes(testCase.expectedSQL);

        const paramsMatch = testCase.expectedParams === null
            ? entry.parameters === null
            : entry.parameters && entry.parameters.includes(testCase.expectedParams.replace(/[(),]/g, ''));

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
    } else {
        console.log(`  ❌ 没有解析到任何条目`);
    }

    console.log('');
}

console.log(`📊 结果: ${passedTests}/${totalTests} 测试通过`);

if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！解析器现在能正确处理 SQLAlchemy 日志模式。');
} else {
    console.log('⚠️  部分测试失败，需要进一步调整。');
}
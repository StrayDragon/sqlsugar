#!/usr/bin/env node

// 测试多行无参数 SQL 的解析
const testCase = `2025-09-15 23:17:33,491 INFO sqlalchemy.engine.Engine
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

2025-09-15 23:17:33,491 INFO sqlalchemy.engine.Engine [generated in 0.00006s] ()`;

console.log('🧪 测试多行无参数 SQL 解析');
console.log('📝 测试日志:');
console.log(testCase);

// 模拟解析逻辑
const lines = testCase.split('\n').map(line => line.trim()).filter(line => line);
console.log(`\n📊 解析到 ${lines.length} 行:`);
lines.forEach((line, index) => {
    console.log(`  ${index + 1}: "${line}"`);
});

// 测试正则表达式匹配
const sqlPatternsArray = [
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s*(.*)$/i,
    /^INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.+)$/i,
];

console.log('\n🔍 测试正则表达式匹配:');
lines.forEach((line, index) => {
    for (const pattern of sqlPatternsArray) {
        const match = line.match(pattern);
        if (match && match[1]) {
            console.log(`  ✅ 第 ${index + 1} 行匹配: "${match[1].substring(0, 50)}${match[1].length > 50 ? '...' : ''}"`);
        }
    }
});

// 检查 SQL 续行模式
const looksLikeSQLStart = (text) => {
    const sqlStartPatterns = [
        /^SELECT(\s+|$)/i,  // SELECT 后面有空格或者行结束
        /^INSERT\s+/i,
        /^UPDATE\s+/i,
        /^DELETE\s+/i,
        /^CREATE\s+/i,
        /^ALTER\s+/i,
        /^DROP\s+/i,
        /^BEGIN\s+/i,
        /^COMMIT\s+/i,
        /^ROLLBACK\s+/i,
        /^WITH\s+/i,
        // 允许缩进的 SQL 开始（多行情况）
        /^\s*SELECT(\s+|$)/i,
        /^\s*INSERT\s+/i,
        /^\s*UPDATE\s+/i,
        /^\s*DELETE\s+/i,
        /^\s*CREATE\s+/i,
        /^\s*ALTER\s+/i,
        /^\s*DROP\s+/i,
        /^\s*BEGIN\s+/i,
        /^\s*COMMIT\s+/i,
        /^\s*ROLLBACK\s+/i,
        /^\s*WITH\s+/i
    ];

    const isStart = sqlStartPatterns.some(pattern => pattern.test(text));
    if (text === "SELECT" && !isStart) {
        console.log(`  🐛 调试: "SELECT" 没有被识别为 START`);
        console.log(`  🐛 测试模式 /^SELECT(\\s+|$)/i: ${/^SELECT(\s+|$)/i.test(text)}`);
        console.log(`  🐛 测试模式 /^\\s*SELECT(\\s+|$)/i: ${/^\s*SELECT(\s+|$)/i.test(text)}`);
    }

    return isStart;
};

const looksLikeSQLContinuation = (text) => {
    const sqlContinuationPatterns = [
        /^FROM\s+/i,
        /^WHERE\s+/i,
        /^JOIN\s+/i,
        /^GROUP\s+BY\s+/i,
        /^ORDER\s+BY\s+/i,
        /^HAVING\s+/i,
        /^LIMIT\s+/i,
        /^AND\s+/i,
        /^OR\s+/i,
        /^SET\s+/i,
        /^VALUES\s+/i,
        /^ON\s+/i,
        // 添加更多模式来处理缩进的 SQL 行
        /^[a-zA-Z_][a-zA-Z0-9_]*\s*,/,  // 列名后跟逗号
        /^[a-zA-Z_][a-zA-Z0-9_]*\s+AS\s+/i,  // 列名 AS 别名
        /^COALESCE\(/i,  // 聚合函数
        /^COUNT\(/i,
        /^SUM\(/i,
        /^AVG\(/i,
        /^MAX\(/i,
        /^MIN\(/i,
        /^\s*[a-zA-Z_]/,  // 任何以字母开头的行（可能是列名或函数）
    ];
    return sqlContinuationPatterns.some(pattern => pattern.test(text));
};

console.log('\n🔍 检查 SQL 行识别:');
lines.forEach((line, index) => {
    const isStart = looksLikeSQLStart(line);
    const isContinuation = looksLikeSQLContinuation(line);
    const status = isStart ? 'START' : isContinuation ? 'CONT' : 'OTHER';
    console.log(`  第 ${index + 1} 行: ${status} - "${line.substring(0, 30)}..."`);
    if (isStart) {
        console.log(`         🎯 匹配 START 模式`);
    }
    if (isContinuation && !isStart) {
        console.log(`         🎯 匹配 CONT 模式`);
    }
});
#!/usr/bin/env node

// Test script to debug pattern matching issues
const SQL_PATTERNS = [
    // 带时间戳的特殊格式 - 需要在通用时间戳格式之前检查
    // 带 [raw sql] 的格式
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.*)$/i,
    // 带 [no key] 的格式
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*(.*)$/i,
    // 带 [generated in] 的格式
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.*)$/i,
    // 标准 SQLAlchemy 格式: INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
    /^INFO\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
    // DEBUG 格式
    /^DEBUG\s+sqlalchemy\.engine\.Engine:\s*(.+)$/i,
    // 带时间戳的格式 (无冒号): 2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine SELECT ...
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s*(.*)$/i,
    // 带时间戳的DEBUG格式 (无冒号): 2025-09-15 22:37:56,917 DEBUG sqlalchemy.engine.Engine SELECT ...
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+DEBUG\s+sqlalchemy\.engine\.Engine\s*(.*)$/i,
    // 不带时间戳的特殊格式
    /^INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.+)$/i,
    /^INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.+)$/i,
    /^INFO\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*(.+)$/i,
    // 其他可能的格式
    /^.*?Engine:\s*(.+)$/i,
    // 更宽松的格式 - 包含各种SQL关键词
    /^(?:.*?\s)?(SELECT\s+.+|INSERT\s+.+|UPDATE\s+.+|DELETE\s+.+|CREATE\s+.+|ALTER\s+.+|DROP\s+.+|BEGIN|COMMIT|ROLLBACK|WITH\s+RECURSIVE)$/i,
    // 包含参数的SQL行
    /^(.*?\?.*|.*?:\w+.*)$/,
    // 多行 SQL 续行模式
    /^(?:FROM\s+|WHERE\s+|JOIN\s+|GROUP\s+BY\s+|ORDER\s+BY\s+|HAVING\s+|LIMIT\s+|AND\s+|OR\s+|SET\s+|VALUES\s+|ON\s+|USING\s+|EXISTS\s*\(.*?\)|IN\s*\(.*?\))\s*.+/i,
];

const testCases = [
    {
        name: 'Raw SQL pattern',
        text: '2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()'
    },
    {
        name: 'No key pattern',
        text: '2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()'
    },
    {
        name: 'Timestamped INFO log',
        text: '2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine BEGIN (implicit)'
    },
    {
        name: 'Generated pattern',
        text: '2025-09-15 22:37:56,917 INFO sqlalchemy.engine.Engine [generated in 0.00008s] (parameters)'
    }
];

console.log('🔍 Testing pattern matching:\n');

for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`📄 Text: "${testCase.text}"`);

    let matched = false;
    for (let i = 0; i < SQL_PATTERNS.length; i++) {
        const pattern = SQL_PATTERNS[i];
        const match = testCase.text.match(pattern);
        if (match) {
            console.log(`  ✅ Pattern ${i + 1} matched: "${match[1] || 'empty'}"`);
            matched = true;
            break;
        }
    }

    if (!matched) {
        console.log(`  ❌ No pattern matched`);
    }

    console.log('');
}
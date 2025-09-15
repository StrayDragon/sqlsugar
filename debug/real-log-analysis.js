#!/usr/bin/env node

// 基于真实 SQLAlchemy 日志的测试
const realLogCases = [
    {
        name: '真实的 BEGIN 语句',
        log: `2025-09-15 23:15:41,806 INFO sqlalchemy.engine.Engine BEGIN (implicit)`,
        expectedSQL: 'BEGIN (implicit)',
        expectedParams: null
    },
    {
        name: '真实的 INSERT 语句',
        log: `2025-09-15 23:15:41,825 INFO sqlalchemy.engine.Engine INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?) RETURNING id
2025-09-15 23:15:41,825 INFO sqlalchemy.engine.Engine [generated in 0.00008s (insertmanyvalues) 1/7 (ordered; batch not supported)] ('Electronics', 'Electronic devices and accessories', None)`,
        expectedSQL: 'INSERT INTO categories (name, description, parent_id) VALUES (?, ?, ?) RETURNING id',
        expectedParams: "'Electronics', 'Electronic devices and accessories', None"
    },
    {
        name: '真实的 Raw SQL',
        log: `2025-09-15 23:15:41,806 INFO sqlalchemy.engine.Engine [raw sql] ()`,
        expectedSQL: '',
        expectedParams: null
    }
];

console.log('🧪 基于真实日志的测试案例:\n');

for (const testCase of realLogCases) {
    console.log(`🔍 ${testCase.name}`);
    console.log(`📝 日志内容:`);
    console.log(`   ${testCase.log.split('\n').join('\n   ')}`);
    console.log(`✅ 期望 SQL: "${testCase.expectedSQL}"`);
    console.log(`✅ 期望参数: ${testCase.expectedParams || '无'}`);
    console.log('');
}

console.log('🎯 这些是真实的 SQLAlchemy 日志格式，我们的解析器应该能够正确处理它们。');
console.log('💡 从这些日志中我们可以看到:');
console.log('   1. 时间戳格式确实是: 2025-09-15 23:15:41,806 INFO sqlalchemy.engine.Engine [SQL 语句]');
console.log('   2. 参数格式包含在: [generated in ...] (parameters) 中');
console.log('   3. Raw SQL 格式为: [raw sql] ()');
console.log('   4. BEGIN 语句没有参数行');
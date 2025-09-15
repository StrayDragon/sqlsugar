#!/usr/bin/env node

// Simple pattern test without requiring compiled modules
const patterns = [
    // 带时间戳的特殊格式 - 需要在通用时间戳格式之前检查
    // 带 [raw sql] 的格式
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.*)$/i,
    // 带 [no key] 的格式
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*(.*)$/i,
    // 带 [generated in] 的格式
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[generated\s+in\s+.*?\]\s*(.*)$/i,
];

const testCases = [
    {
        name: 'Raw SQL',
        text: '2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()',
        expectedPattern: 0,
        expectedMatch: '()'
    },
    {
        name: 'No key',
        text: '2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()',
        expectedPattern: 1,
        expectedMatch: '()'
    }
];

console.log('🔍 Testing pattern matching:\n');

for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);
    console.log(`📄 Text: "${testCase.text}"`);

    let matched = false;
    for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = testCase.text.match(pattern);
        if (match) {
            console.log(`  ✅ Pattern ${i + 1} matched: "${match[1] || 'empty'}"`);
            if (i === testCase.expectedPattern) {
                console.log(`  ✅ Expected pattern`);
            } else {
                console.log(`  ❌ Unexpected pattern (expected ${testCase.expectedPattern + 1})`);
            }
            matched = true;
            break;
        }
    }

    if (!matched) {
        console.log(`  ❌ No pattern matched`);
    }

    console.log('');
}
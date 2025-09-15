#!/usr/bin/env node

// Test specific failing patterns
const { SQLLogParser } = require('./out/sql-log-parser.js');

// Enable debug mode
SQLLogParser.setDebugMode(true);

console.log('🔍 Testing specific failing patterns:\n');

// Test 1: Raw SQL pattern (should be working now)
console.log('📝 Test 1: Raw SQL pattern');
const rawSQLText = '2025-09-15 22:37:54,523 INFO sqlalchemy.engine.Engine [raw sql] ()';
const rawResult = SQLLogParser.processSelectedText(rawSQLText);
console.log('Result:', rawResult);
console.log('');

// Test 2: No key pattern (still failing)
console.log('📝 Test 2: No key pattern');
const noKeyText = '2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()';
const noKeyResult = SQLLogParser.processSelectedText(noKeyText);
console.log('Result:', noKeyResult);
console.log('');

// Test 3: Check what the pattern matching returns
console.log('📝 Test 3: Pattern matching debug');
const patterns = [
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[raw\s+sql\]\s*(.*)$/i,
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d+\s+INFO\s+sqlalchemy\.engine\.Engine\s+\[no\s+key\s+.*?\]\s*(.*)$/i,
];

const testLine = '2025-09-15 22:37:54,528 INFO sqlalchemy.engine.Engine [no key 0.00005s] ()';

for (let i = 0; i < patterns.length; i++) {
    const match = testLine.match(patterns[i]);
    if (match) {
        console.log(`Pattern ${i + 1} matched: "${match[1]}"`);
    }
}

console.log('');
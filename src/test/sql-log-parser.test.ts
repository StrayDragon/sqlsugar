import * as assert from 'assert';
import { SQLLogParser, ParsedSQL } from '../sql-log-parser';

suite('SQL Log Parser Tests', () => {

	test('Parse basic SQLAlchemy log with question marks', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
('Alice',)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse valid SQL log');
		assert.strictEqual(parsed!.originalSQL, 'INSERT INTO users (name) VALUES (?)');
		assert.strictEqual(parsed!.injectedSQL, "INSERT INTO users (name) VALUES ('Alice')");
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.deepStrictEqual(parsed!.parameters, ['Alice']);
	});

	test('Parse SQLAlchemy log with named parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = :user_id AND name = :name
{'user_id': 123, 'name': 'Bob'}`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse valid SQL log with named parameters');
		assert.strictEqual(parsed!.originalSQL, 'SELECT * FROM users WHERE id = :user_id AND name = :name');
		assert.strictEqual(parsed!.injectedSQL, "SELECT * FROM users WHERE id = 123 AND name = 'Bob'");
		assert.strictEqual(parsed!.placeholderType, 'named');
		assert.strictEqual(parsed!.parameters.length, 2);
	});

	test('Parse SQL without parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: SELECT * FROM users`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse SQL without parameters');
		assert.strictEqual(parsed!.originalSQL, 'SELECT * FROM users');
		assert.strictEqual(parsed!.injectedSQL, 'SELECT * FROM users');
		assert.strictEqual(parsed!.placeholderType, 'none');
		assert.strictEqual(parsed!.parameters.length, 0);
	});

	test('Parse with multiple parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name, age, active) VALUES (?, ?, ?)
('Charlie', 25, True)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse SQL with multiple parameters');
		assert.strictEqual(parsed!.injectedSQL, "INSERT INTO users (name, age, active) VALUES ('Charlie', 25, TRUE)");
		assert.strictEqual(parsed!.parameters.length, 3);
		assert.deepStrictEqual(parsed!.parameters, ['Charlie', 25, true]);
	});

	test('Parse with NULL values', () => {
		const logText = `INFO sqlalchemy.engine.Engine: UPDATE users SET name = ?, age = ? WHERE id = ?
(NULL, None, 1)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse SQL with NULL values');
		assert.strictEqual(parsed!.injectedSQL, 'UPDATE users SET name = NULL, age = NULL WHERE id = 1');
		assert.deepStrictEqual(parsed!.parameters, [null, null, 1]);
	});

	test('Parse with escaped quotes', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name, bio) VALUES (?, ?)
('O\'Reilly', 'Developer with "quotes"')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse SQL with escaped quotes');
		assert.strictEqual(parsed!.injectedSQL, "INSERT INTO users (name, bio) VALUES ('O''Reilly', 'Developer with \"quotes\"')");
		assert.deepStrictEqual(parsed!.parameters, ["O'Reilly", 'Developer with "quotes"']);
	});

	test('Parse with list parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id IN ?
[1, 2, 3]`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse SQL with list parameters');
		assert.strictEqual(parsed!.injectedSQL, 'SELECT * FROM users WHERE id IN 1');
		// Note: This is a simplified case - real implementation might need more sophisticated handling
	});

	test('Ignore non-SQL text', () => {
		const logText = `Some random text
INFO sqlalchemy.engine.Engine: BEGIN (implicit)
More random text`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(!parsed, 'Should not parse non-SQL text');
	});

	test('Handle malformed parameter lines', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
malformed parameter line`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse SQL even with malformed parameters');
		assert.strictEqual(parsed!.originalSQL, 'INSERT INTO users (name) VALUES (?)');
		assert.strictEqual(parsed!.injectedSQL, 'INSERT INTO users (name) VALUES (?)');
		assert.strictEqual(parsed!.parameters.length, 0);
	});

	test('Parse complex SQL with multiple lines', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)
('Alice', 'alice@example.com', '2024-01-01 00:00:00')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse complex SQL');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 3);
		assert.deepStrictEqual(parsed!.parameters, ['Alice', 'alice@example.com', '2024-01-01 00:00:00']);
	});

	test('Detect placeholder types correctly', () => {
		assert.strictEqual(SQLLogParser.detectPlaceholderType('SELECT * FROM users WHERE id = ?'), 'question');
		assert.strictEqual(SQLLogParser.detectPlaceholderType('SELECT * FROM users WHERE id = :user_id'), 'named');
		assert.strictEqual(SQLLogParser.detectPlaceholderType('SELECT * FROM users'), 'none');
		assert.strictEqual(SQLLogParser.detectPlaceholderType('SELECT * FROM users WHERE name LIKE :name AND age > ?'), 'question'); // Mixed defaults to question
	});

	test('Parse individual parameter values', () => {
		assert.strictEqual(SQLLogParser.parseSingleValueForTest("'hello'"), 'hello');
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('"world"'), 'world');
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('123'), 123);
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('45.67'), 45.67);
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('true'), true);
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('false'), false);
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('None'), null);
		assert.strictEqual(SQLLogParser.parseSingleValueForTest('null'), null);
	});

	test('Parse tuple parameters with nested structures', () => {
		const tupleStr = "'test', 123, None, True, 'with \\'quotes\\''";
		const params = SQLLogParser.parseTupleParametersForTest(tupleStr);

		assert.deepStrictEqual(params, ['test', 123, null, true, "with 'quotes'"]);
	});

	test('Parse dictionary parameters', () => {
		const dictStr = "'user_id': 123, 'name': 'Alice', 'active': True";
		const params = SQLLogParser.parseDictParametersForTest(dictStr);

		// Since we're converting dict to value array, we just check the values
		assert.deepStrictEqual(params, [123, 'Alice', true]);
	});

	test('Format parameter values correctly', () => {
		assert.strictEqual(SQLLogParser.formatParameterValue('hello'), "'hello'");
		assert.strictEqual(SQLLogParser.formatParameterValue(123), '123');
		assert.strictEqual(SQLLogParser.formatParameterValue(45.67), '45.67');
		assert.strictEqual(SQLLogParser.formatParameterValue(true), 'TRUE');
		assert.strictEqual(SQLLogParser.formatParameterValue(false), 'FALSE');
		assert.strictEqual(SQLLogParser.formatParameterValue(null), 'NULL');
		assert.strictEqual(SQLLogParser.formatParameterValue("O'Reilly"), "'O''Reilly'");
	});

	test('Handle edge cases gracefully', () => {
		// Empty string
		const parsed1 = SQLLogParser.processSelectedText('');
		assert.ok(!parsed1, 'Should handle empty string');

		// Only whitespace
		const parsed2 = SQLLogParser.processSelectedText('   \n   ');
		assert.ok(!parsed2, 'Should handle whitespace only');

		// SQL without matching parameters
		const parsed3 = SQLLogParser.processSelectedText('INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id = ?');
		assert.ok(parsed3, 'Should parse SQL without parameters');
		assert.strictEqual(parsed3!.injectedSQL, 'SELECT * FROM users WHERE id = ?');
	});

	test('Parse real-world SQLAlchemy log with complex parameters', () => {
		const logText = `2024-01-15 10:30:45,123 INFO sqlalchemy.engine.Engine: INSERT INTO users (name, email, age, is_active, created_at) VALUES (?, ?, ?, ?, ?)
2024-01-15 10:30:45,124 INFO sqlalchemy.engine.Engine [generated in 0.00015s] ('John Doe', 'john@example.com', 30, True, '2024-01-15 10:30:45.123456')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse real-world SQLAlchemy log');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 5);
		assert.deepStrictEqual(parsed!.parameters, ['John Doe', 'john@example.com', 30, true, '2024-01-15 10:30:45.123456']);
	});

	test('Parse SQLAlchemy log with multi-line parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO products (name, description, price, metadata) VALUES (?, ?, ?, ?)
('Premium Widget', 'A high-quality widget with advanced features and 
long description that spans multiple lines', 99.99, {'color': 'blue', 'size': 'large'})`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse multi-line parameters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 4);
		assert.strictEqual(parsed!.parameters[0], 'Premium Widget');
		assert.strictEqual(parsed!.parameters[1], 'A high-quality widget with advanced features and \nlong description that spans multiple lines');
		assert.strictEqual(parsed!.parameters[2], 99.99);
	});

	test('Parse SQLAlchemy log with escaped characters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name, bio) VALUES (?, ?)
('O\\'Reilly', 'Developer with \\"quotes\\" and \\\\backslashes\\\\')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse escaped characters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 2);
		assert.deepStrictEqual(parsed!.parameters, ["O'Reilly", 'Developer with "quotes" and \\backslashes\\']);
	});

	test('Parse SQLAlchemy log with NULL and None values', () => {
		const logText = `INFO sqlalchemy.engine.Engine: UPDATE users SET name = ?, bio = ?, age = ? WHERE id = ?
(NULL, None, None, 1)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse NULL and None values');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 4);
		assert.deepStrictEqual(parsed!.parameters, [null, null, null, 1]);
	});

	test('Parse SQLAlchemy log with scientific notation', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO measurements (value, timestamp) VALUES (?, ?)
(1.23e-4, '2024-01-15 10:30:45')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse scientific notation');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 2);
		assert.strictEqual(parsed!.parameters[0], 0.000123);
		assert.strictEqual(parsed!.parameters[1], '2024-01-15 10:30:45');
	});

	test('Parse SQLAlchemy log with mixed data types', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO orders (user_id, product_id, quantity, price, shipped) VALUES (?, ?, ?, ?, ?)
(123, 456, 2, 29.99, False)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse mixed data types');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 5);
		assert.deepStrictEqual(parsed!.parameters, [123, 456, 2, 29.99, false]);
	});

	test('Handle malformed parameter lines gracefully', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
This is not a valid parameter line`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should handle malformed parameters gracefully');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 0);
	});

	test('Parse SQLAlchemy log with dictionary parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE name = :name AND age > :age
{'name': 'Alice', 'age': 25}`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse dictionary parameters');
		assert.strictEqual(parsed!.placeholderType, 'named');
		assert.strictEqual(parsed!.parameters.length, 2);
		assert.strictEqual(parsed!.parameters[0].name, 'name');
		assert.strictEqual(parsed!.parameters[0].value, 'Alice');
		assert.strictEqual(parsed!.parameters[1].name, 'age');
		assert.strictEqual(parsed!.parameters[1].value, 25);
	});

	test('Parse SQLAlchemy log with list parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: SELECT * FROM users WHERE id IN ?
[1, 2, 3, 4, 5]`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should parse list parameters');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 5);
		assert.deepStrictEqual(parsed!.parameters, [1, 2, 3, 4, 5]);
	});

	test('Handle SQL injection attempts safely', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
('Robert\'); DROP TABLE users; --')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should handle SQL injection attempts');
		assert.strictEqual(parsed!.placeholderType, 'question');
		assert.strictEqual(parsed!.parameters.length, 1);
		// The parameter should be safely escaped
		assert.strictEqual(parsed!.injectedSQL, "INSERT INTO users (name) VALUES ('Robert'''); DROP TABLE users; --')");
	});

	test('Detect and block various SQL injection patterns', () => {
		const injectionPatterns = [
			"OR 1=1",
			"AND 1=1",
			"SELECT * FROM users",
			"DROP TABLE users",
			"UNION SELECT username, password FROM users",
			"EXEC sp_configure",
			"WAITFOR DELAY '0:0:5'",
			"SLEEP(5)",
			"LOAD_FILE('/etc/passwd')",
			"INTO OUTFILE '/tmp/shell.php'",
		];

		injectionPatterns.forEach(pattern => {
			const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
('${pattern}')`;

			const parsed = SQLLogParser.processSelectedText(logText);

			assert.ok(parsed, `Should handle injection pattern: ${pattern}`);
			assert.strictEqual(parsed!.parameters.length, 1);
			// The injected SQL should contain safely escaped content
			assert.ok(parsed!.injectedSQL.includes("''"), 'Should contain escaped quotes');
		});
	});

	test('Handle large terminal text gracefully', () => {
		// Create a very large text (simulated)
		let largeText = 'INFO sqlalchemy.engine.Engine: SELECT * FROM users\n';
		for (let i = 0; i < 2000; i++) {
			largeText += `Some non-SQL line ${i}\n`;
		}
		largeText += "('Alice',)";

		const parsed = SQLLogParser.processSelectedText(largeText);

		// Should handle large text without crashing
		assert.ok(parsed, 'Should handle large terminal text');
	});

	test('Handle very long parameter lines', () => {
		const longParam = 'x'.repeat(1500); // Create a very long parameter
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)
('${longParam}')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		// Should handle long parameters safely
		assert.ok(parsed, 'Should handle long parameters');
		assert.strictEqual(parsed!.parameters.length, 1);
	});

	test('Handle empty and invalid inputs', () => {
		// Empty string
		const parsed1 = SQLLogParser.processSelectedText('');
		assert.ok(!parsed1, 'Should handle empty string');

		// Null input
		const parsed2 = SQLLogParser.processSelectedText(null as any);
		assert.ok(!parsed2, 'Should handle null input');

		// Undefined input
		const parsed3 = SQLLogParser.processSelectedText(undefined as any);
		assert.ok(!parsed3, 'Should handle undefined input');

		// Non-string input
		const parsed4 = SQLLogParser.processSelectedText(123 as any);
		assert.ok(!parsed4, 'Should handle non-string input');
	});

	test('Handle malformed parameter strings', () => {
		const malformedCases = [
			'INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)\n(malformed',
			'INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)\n{unclosed dict',
			'INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)\n[unclosed list',
			'INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)\n()',
			'INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)\n{}',
			'INFO sqlalchemy.engine.Engine: INSERT INTO users (name) VALUES (?)\n[]',
		];

		malformedCases.forEach((caseText, index) => {
			const parsed = SQLLogParser.processSelectedText(caseText);
			assert.ok(parsed, `Should handle malformed case ${index + 1}`);
			// Should not crash and should return some result
			assert.ok(parsed!.originalSQL, 'Should have original SQL');
		});
	});

	test('Handle special characters in parameters', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name, bio) VALUES (?, ?)
('O\'Reilly', 'Multi-line\\nstring\\twith\\ttabs\\rand\\rnull\\x00')`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should handle special characters');
		assert.strictEqual(parsed!.parameters.length, 2);
		assert.strictEqual(parsed!.parameters[0], "O'Reilly");
		assert.strictEqual(parsed!.parameters[1], 'Multi-line\nstring\twith\ttabs\rand\rnull\x00');
	});

	test('Handle extreme parameter values', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO measurements (value, timestamp, data) VALUES (?, ?, ?)
(Infinity, -Infinity, NaN)`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should handle extreme values');
		assert.strictEqual(parsed!.parameters.length, 3);
		// Extreme values should be converted to NULL
		assert.strictEqual(parsed!.injectedSQL, 'INSERT INTO measurements (value, timestamp, data) VALUES (NULL, NULL, NULL)');
	});

	test('Handle nested parameter structures', () => {
		const logText = `INFO sqlalchemy.engine.Engine: INSERT INTO users (name, metadata) VALUES (?, ?)
('Alice', {'preferences': {'theme': 'dark', 'notifications': True}, 'settings': [1, 2, 3]})`;

		const parsed = SQLLogParser.processSelectedText(logText);

		assert.ok(parsed, 'Should handle nested structures');
		assert.strictEqual(parsed!.parameters.length, 2);
		assert.strictEqual(parsed!.parameters[0], 'Alice');
		assert.ok(typeof parsed!.parameters[1] === 'string', 'Nested object should be serialized');
	});
});
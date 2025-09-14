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
		assert.strictEqual(SQLLogParser.parseSingleValue("'hello'"), 'hello');
		assert.strictEqual(SQLLogParser.parseSingleValue('"world"'), 'world');
		assert.strictEqual(SQLLogParser.parseSingleValue('123'), 123);
		assert.strictEqual(SQLLogParser.parseSingleValue('45.67'), 45.67);
		assert.strictEqual(SQLLogParser.parseSingleValue('true'), true);
		assert.strictEqual(SQLLogParser.parseSingleValue('false'), false);
		assert.strictEqual(SQLLogParser.parseSingleValue('None'), null);
		assert.strictEqual(SQLLogParser.parseSingleValue('null'), null);
	});

	test('Parse tuple parameters with nested structures', () => {
		const tupleStr = "'test', 123, None, True, 'with \\'quotes\\''";
		const params = SQLLogParser.parseTupleParameters(tupleStr);

		assert.deepStrictEqual(params, ['test', 123, null, true, "with 'quotes'"]);
	});

	test('Parse dictionary parameters', () => {
		const dictStr = "'user_id': 123, 'name': 'Alice', 'active': True";
		const params = SQLLogParser.parseDictParameters(dictStr);

		assert.strictEqual(params.length, 3);
		assert.strictEqual(params[0].name, 'user_id');
		assert.strictEqual(params[0].value, 123);
		assert.strictEqual(params[1].name, 'name');
		assert.strictEqual(params[1].value, 'Alice');
		assert.strictEqual(params[2].name, 'active');
		assert.strictEqual(params[2].value, true);
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
});
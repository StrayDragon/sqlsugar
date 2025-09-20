import * as assert from 'assert';
import { Jinja2NunjucksProcessor } from '../jinja2-nunjucks-processor';

suite('Jinja2 Filter Edge Cases Tests', () => {
    let processor: Jinja2NunjucksProcessor;

    setup(() => {
        processor = Jinja2NunjucksProcessor.getInstance();
    });

    // Null and undefined handling
    test('filters should handle null and undefined values', () => {
        assert.strictEqual(processor.renderTemplate('{{ null | default("default") }}', {}), 'default');
        assert.strictEqual(processor.renderTemplate('{{ undefined | default("default") }}', {}), 'default');
        assert.strictEqual(processor.renderTemplate('{{ "" | default("default") }}', {}), '');
        assert.strictEqual(processor.renderTemplate('{{ 0 | default("default") }}', {}), '0');
    });

    // Boolean default filter
    test('boolean default filter should work correctly', () => {
        assert.strictEqual(processor.renderTemplate('{{ null | default("default", true) }}', {}), 'default');
        assert.strictEqual(processor.renderTemplate('{{ false | default("default", true) }}', {}), 'default');
        assert.strictEqual(processor.renderTemplate('{{ "" | default("default", true) }}', {}), 'default');
        assert.strictEqual(processor.renderTemplate('{{ "non-empty" | default("default", true) }}', {}), 'non-empty');
        assert.strictEqual(processor.renderTemplate('{{ 1 | default("default", true) }}', {}), '1');
    });

    // Type conversion edge cases
    test('type conversion should handle edge cases', () => {
        // int filter
        assert.strictEqual(processor.renderTemplate('{{ "42" | int }}', {}), '42');
        assert.strictEqual(processor.renderTemplate('{{ "3.14" | int }}', {}), '3');
        assert.strictEqual(processor.renderTemplate('{{ "invalid" | int }}', {}), 'NaN');
        assert.strictEqual(processor.renderTemplate('{{ null | int }}', {}), '0');

        // float filter
        assert.strictEqual(processor.renderTemplate('{{ "3.14" | float }}', {}), '3.14');
        assert.strictEqual(processor.renderTemplate('{{ "42" | float }}', {}), '42');
        assert.strictEqual(processor.renderTemplate('{{ "invalid" | float }}', {}), 'NaN');
        assert.strictEqual(processor.renderTemplate('{{ null | float }}', {}), 'NaN');

        // bool filter
        assert.strictEqual(processor.renderTemplate('{{ "true" | bool }}', {}), 'true');
        assert.strictEqual(processor.renderTemplate('{{ "false" | bool }}', {}), 'false');
        assert.strictEqual(processor.renderTemplate('{{ "1" | bool }}', {}), 'true');
        assert.strictEqual(processor.renderTemplate('{{ "0" | bool }}', {}), 'false');
        assert.strictEqual(processor.renderTemplate('{{ "yes" | bool }}', {}), 'true');
        assert.strictEqual(processor.renderTemplate('{{ "no" | bool }}', {}), 'false');
        assert.strictEqual(processor.renderTemplate('{{ null | bool }}', {}), 'false');
    });

    // String filter edge cases
    test('string filters should handle edge cases', () => {
        // striptags
        assert.strictEqual(processor.renderTemplate('{{ "" | striptags }}', {}), '');
        assert.strictEqual(processor.renderTemplate('{{ null | striptags }}', {}), 'null');
        assert.strictEqual(processor.renderTemplate('{{ "<p>hello</p><div>world</div>" | striptags }}', {}), 'helloworld');

        // truncate
        assert.strictEqual(processor.renderTemplate('{{ "short" | truncate(10) }}', {}), 'short');
        assert.strictEqual(processor.renderTemplate('{{ "" | truncate(5) }}', {}), '');
        assert.strictEqual(processor.renderTemplate('{{ "hello world" | truncate(5, "...") }}', {}), 'he...');

        // wordwrap
        assert.strictEqual(processor.renderTemplate('{{ "" | wordwrap(10) }}', {}), '');
        assert.strictEqual(processor.renderTemplate('{{ "singlelongword" | wordwrap(5) }}', {}), 'singlelongword');
    });

    // Math filter edge cases
    test('math filters should handle edge cases', () => {
        // abs
        assert.strictEqual(processor.renderTemplate('{{ "0" | abs }}', {}), '0');
        assert.strictEqual(processor.renderTemplate('{{ "-0" | abs }}', {}), '0');
        assert.strictEqual(processor.renderTemplate('{{ null | abs }}', {}), '0');

        // round
        assert.strictEqual(processor.renderTemplate('{{ "3.14159" | round(2) }}', {}), '3.14');
        assert.strictEqual(processor.renderTemplate('{{ "3.14159" | round(0) }}', {}), '3');
        assert.strictEqual(processor.renderTemplate('{{ null | round(2) }}', {}), '0');

        // sum with empty array
        assert.strictEqual(processor.renderTemplate('{{ [] | sum }}', {}), '0');
        assert.strictEqual(processor.renderTemplate('{{ null | sum }}', {}), '0');

        // min/max with empty arrays
        assert.strictEqual(processor.renderTemplate('{{ [] | min }}', {}), 'Infinity');
        assert.strictEqual(processor.renderTemplate('{{ [] | max }}', {}), '-Infinity');
    });

    // List filter edge cases
    test('list filters should handle edge cases', () => {
        // length
        assert.strictEqual(processor.renderTemplate('{{ [] | length }}', {}), '0');
        assert.strictEqual(processor.renderTemplate('{{ "" | length }}', {}), '0');
        assert.strictEqual(processor.renderTemplate('{{ {} | length }}', {}), '0');
        assert.strictEqual(processor.renderTemplate('{{ null | length }}', {}), '0');

        // first/last with empty arrays
        assert.strictEqual(processor.renderTemplate('{{ [] | first }}', {}), '');
        assert.strictEqual(processor.renderTemplate('{{ [] | last }}', {}), '');

        // unique with different types
        assert.strictEqual(processor.renderTemplate('{{ [1, "1", true, null] | unique | join(", ") }}', {}), '1, 1, true, null');

        // slice edge cases
        assert.strictEqual(processor.renderTemplate('{{ [1, 2, 3] | slice(0, 10) | join(", ") }}', {}), '1, 2, 3');
        assert.strictEqual(processor.renderTemplate('{{ [1, 2, 3] | slice(5) | join(", ") }}', {}), '');
    });

    // SQL filter edge cases
    test('SQL filters should handle edge cases', () => {
        // sql_quote
        assert.strictEqual(processor.renderTemplate('{{ "" | sql_quote }}', {}), "''");
        assert.strictEqual(processor.renderTemplate('{{ null | sql_quote }}', {}), 'null');
        assert.strictEqual(processor.renderTemplate('{{ "O\'Reilly" | sql_quote }}', {}), "'O''Reilly'");
        assert.strictEqual(processor.renderTemplate('{{ 42 | sql_quote }}', {}), '42');

        // sql_identifier
        assert.strictEqual(processor.renderTemplate('{{ "" | sql_identifier }}', {}), '""');
        assert.strictEqual(processor.renderTemplate('{{ "column" | sql_identifier }}', {}), '"column"');
        assert.strictEqual(processor.renderTemplate('{{ "column name" | sql_identifier }}', {}), '"column name"');

        // sql_in
        assert.strictEqual(processor.renderTemplate('{{ [] | sql_in }}', {}), '');
        assert.strictEqual(processor.renderTemplate('{{ [1, 2, 3] | sql_in }}', {}), "'1', '2', '3'");
    });

    // Complex template edge cases
    test('complex templates should handle edge cases', () => {
        // Template with undefined variables
        const template1 = 'SELECT * FROM users WHERE name = {{ name | default("anonymous") }}';
        const result1 = processor.renderTemplate(template1, {});
        assert.strictEqual(result1.includes('anonymous'), true);

        // Template with null values
        const template2 = 'SELECT * FROM users WHERE age > {{ age | default(18) | int }}';
        const result2 = processor.renderTemplate(template2, {});
        assert.strictEqual(result2.includes('18'), true);

        // Template with mixed types
        const template3 = `
            SELECT * FROM orders
            WHERE status IN ({{ statuses | sql_in }})
              AND total > {{ min_total | float | default(0) }}
              AND created_at > '{{ start_date | default("1970-01-01") }}'
        `;
        const result3 = processor.renderTemplate(template3, { statuses: ['active', 'pending'] });
        assert.strictEqual(result3.includes("'active', 'pending'"), true);
        assert.strictEqual(result3.includes('0'), true);
        assert.strictEqual(result3.includes('1970-01-01'), true);
    });

    // Filter chaining edge cases
    test('filter chaining should handle edge cases', () => {
        // Chain with null values
        assert.strictEqual(processor.renderTemplate('{{ null | default("default") | upper }}', {}), 'DEFAULT');

        // Chain with multiple type conversions
        assert.strictEqual(processor.renderTemplate('{{ "42.5" | float | int | string }}', {}), '42');

        // Chain with boolean operations
        assert.strictEqual(processor.renderTemplate('{{ "1" | bool | default("false") }}', {}), 'true');

        // Long chain with edge cases
        const result = processor.renderTemplate('{{ "  hello world  " | trim | upper | replace("WORLD", "JINJA") | truncate(10) }}', {});
        assert.strictEqual(result, 'HELLO JIN...');
    });

    // Error handling
    test('unknown filters should be handled gracefully', () => {
        // Unknown filter should return original value
        assert.strictEqual(processor.renderTemplate('{{ "hello" | unknown_filter }}', {}), 'hello');
        assert.strictEqual(processor.renderTemplate('{{ 42 | unknown_filter }}', {}), '42');
        assert.strictEqual(processor.renderTemplate('{{ null | unknown_filter }}', {}), 'null');
    });

    // Performance considerations
    test('filters should not crash with large inputs', () => {
        // Large string
        const largeString = 'x'.repeat(10000);
        const result = processor.renderTemplate(`{{ "${largeString}" | truncate(100) }}`, {});
        assert.strictEqual(result.length, 103); // 100 + "..."

        // Large array
        const largeArray = Array.from({ length: 1000 }, (_, i) => i);
        const result2 = processor.renderTemplate('{{ array | length }}', { array: largeArray });
        assert.strictEqual(result2, '1000');
    });

    // Unicode and special characters
    test('filters should handle unicode and special characters', () => {
        // Unicode strings
        assert.strictEqual(processor.renderTemplate('{{ "café" | upper }}', {}), 'CAFÉ');
        assert.strictEqual(processor.renderTemplate('{{ "🌟" | length }}', {}), '2');

        // Special characters in sql_quote
        assert.strictEqual(processor.renderTemplate('{{ "It\'s a test" | sql_quote }}', {}), "'It''s a test'");

        // Unicode in truncate
        assert.strictEqual(processor.renderTemplate('{{ "café restaurant" | truncate(5) }}', {}), 'café...');
    });
});
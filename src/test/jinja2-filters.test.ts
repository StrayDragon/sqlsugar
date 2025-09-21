import * as vscode from 'vscode';
import * as assert from 'assert';
import { Jinja2NunjucksProcessor } from '../jinja2-nunjucks-processor';

suite('Jinja2 Filter Tests', () => {
    let processor: Jinja2NunjucksProcessor;

    setup(() => {
        processor = Jinja2NunjucksProcessor.getInstance();
    });

    // String Filters
    test('upper filter should convert to uppercase', () => {
        const result = processor.renderTemplate('{{ "hello" | upper }}', {});
        assert.strictEqual(result, 'HELLO');
    });

    test('lower filter should convert to lowercase', () => {
        const result = processor.renderTemplate('{{ "HELLO" | lower }}', {});
        assert.strictEqual(result, 'hello');
    });

    test('title filter should capitalize words', () => {
        const result = processor.renderTemplate('{{ "hello world" | title }}', {});
        assert.strictEqual(result, 'Hello World');
    });

    test('capitalize filter should capitalize first letter', () => {
        const result = processor.renderTemplate('{{ "hello world" | capitalize }}', {});
        assert.strictEqual(result, 'Hello world');
    });

    test('trim filter should remove whitespace', () => {
        const result = processor.renderTemplate('{{ "  hello  " | trim }}', {});
        assert.strictEqual(result, 'hello');
    });

    test('striptags filter should remove HTML tags', () => {
        const result = processor.renderTemplate('{{ "<p>hello</p>" | striptags }}', {});
        assert.strictEqual(result, 'hello');
    });

    // Number Filters
    test('int filter should convert to integer', () => {
        const result = processor.renderTemplate('{{ "42" | int }}', {});
        assert.strictEqual(result, '42');
    });

    test('float filter should convert to float', () => {
        const result = processor.renderTemplate('{{ "3.14" | float }}', {});
        assert.strictEqual(result, '3.14');
    });

    test('round filter should round numbers', () => {
        const result = processor.renderTemplate('{{ "3.14159" | round(2) }}', {});
        assert.strictEqual(result, '3.14');
    });

    test('abs filter should return absolute value', () => {
        const result = processor.renderTemplate('{{ "-5" | abs }}', {});
        assert.strictEqual(result, '5');
    });

    // List Filters
    test('join filter should join list elements', () => {
        const result = processor.renderTemplate('{{ ["a", "b", "c"] | join(", ") }}', {});
        assert.strictEqual(result, 'a, b, c');
    });

    test('length filter should return list length', () => {
        const result = processor.renderTemplate('{{ ["a", "b", "c"] | length }}', {});
        assert.strictEqual(result, '3');
    });

    test('first filter should return first element', () => {
        const result = processor.renderTemplate('{{ ["a", "b", "c"] | first }}', {});
        assert.strictEqual(result, 'a');
    });

    test('last filter should return last element', () => {
        const result = processor.renderTemplate('{{ ["a", "b", "c"] | last }}', {});
        assert.strictEqual(result, 'c');
    });

    test('sort filter should sort list', () => {
        const result = processor.renderTemplate('{{ [3, 1, 2] | sort | join(", ") }}', {});
        assert.strictEqual(result, '1, 2, 3');
    });

    test('reverse filter should reverse list', () => {
        const result = processor.renderTemplate('{{ ["a", "b", "c"] | reverse | join(", ") }}', {});
        assert.strictEqual(result, 'c, b, a');
    });

    test('unique filter should remove duplicates', () => {
        const result = processor.renderTemplate('{{ [1, 2, 2, 3, 3, 3] | unique | join(", ") }}', {});
        assert.strictEqual(result, '1, 2, 3');
    });

    // Dictionary Filters
    test('dictsort filter should sort dictionary by keys', () => {
        const result = processor.renderTemplate('{{ {"b": 2, "a": 1, "c": 3} | dictsort | join(", ") }}', {});
        // Note: dictsort returns a list of [key, value] pairs
        assert.strictEqual(result.includes('a'), true);
        assert.strictEqual(result.includes('b'), true);
        assert.strictEqual(result.includes('c'), true);
    });

    // Utility Filters
    test('default filter should provide default value', () => {
        const result1 = processor.renderTemplate('{{ undefined_var | default("default") }}', {});
        const result2 = processor.renderTemplate('{{ defined_var | default("default") }}', { defined_var: 'actual' });
        assert.strictEqual(result1, 'default');
        assert.strictEqual(result2, 'actual');
    });

    test('replace filter should replace text', () => {
        const result = processor.renderTemplate('{{ "hello world" | replace("world", "jinja") }}', {});
        assert.strictEqual(result, 'hello jinja');
    });

    test('truncate filter should truncate text', () => {
        const result = processor.renderTemplate('{{ "hello world" | truncate(5) }}', {});
        assert.strictEqual(result, 'hello...');
    });

    test('wordwrap filter should wrap text', () => {
        const result = processor.renderTemplate('{{ "hello world" | wordwrap(5) }}', {});
        assert.strictEqual(result.includes('hello'), true);
        assert.strictEqual(result.includes('world'), true);
    });

    test('urlencode filter should encode URLs', () => {
        const result = processor.renderTemplate('{{ "hello world" | urlencode }}', {});
        assert.strictEqual(result, 'hello%20world');
    });

    // SQL Custom Filters
    test('sql_quote filter should properly quote SQL strings', () => {
        const result = processor.renderTemplate('{{ "O\'Reilly" | sql_quote }}', {});
        assert.strictEqual(result, "'O''Reilly'");
    });

    test('sql_identifier filter should properly quote SQL identifiers', () => {
        const result = processor.renderTemplate('{{ "column name" | sql_identifier }}', {});
        assert.strictEqual(result, '"column name"');
    });

    test('sql_date filter should format dates', () => {
        const result = processor.renderTemplate('{{ "2023-01-01" | sql_date }}', {});
        assert.strictEqual(result.includes('2023'), true);
    });

    test('sql_datetime filter should format datetime', () => {
        const result = processor.renderTemplate('{{ "2023-01-01T12:00:00Z" | sql_datetime }}', {});
        assert.strictEqual(result.includes('2023'), true);
    });

    test('sql_in filter should format SQL IN clauses', () => {
        const result = processor.renderTemplate('{{ [1, 2, 3] | sql_in }}', {});
        assert.strictEqual(result, "'1', '2', '3'");
    });

    // Filter Chaining
    test('filter chaining should work correctly', () => {
        const result = processor.renderTemplate('{{ "  hello world  " | trim | upper | replace("WORLD", "JINJA") }}', {});
        assert.strictEqual(result, 'HELLO JINJA');
    });

    // Filter with Arguments
    test('filters with arguments should work', () => {
        const result = processor.renderTemplate('{{ "hello world" | replace("world", "jinja", 1) }}', {});
        assert.strictEqual(result, 'hello jinja');
    });

    // Filter Error Handling
    test('unknown filters should be handled gracefully', () => {
        const result = processor.renderTemplate('{{ "hello" | unknown_filter }}', {});
        assert.strictEqual(result, 'hello'); // Should return original value
    });

    // Complex Templates
    test('complex template with multiple filters should work', () => {
        const template = `
            SELECT * FROM users
            WHERE name = '{{ user_name | title | sql_quote }}'
              AND age > {{ min_age | int }}
              AND created_at > '{{ start_date | sql_date }}'
              {% if is_active %}AND status = 'active'{% endif %}
            ORDER BY created_at DESC
            LIMIT {{ limit | int }}
        `;
        const context = {
            user_name: 'john doe',
            min_age: '18',
            start_date: '2023-01-01',
            is_active: true,
            limit: '10'
        };
        const result = processor.renderTemplate(template, context);
        assert.strictEqual(result.includes("John Doe"), true);
        assert.strictEqual(result.includes("18"), true);
        assert.strictEqual(result.includes("active"), true);
        assert.strictEqual(result.includes("10"), true);
    });

    // Test getSupportedFilters method
    test('getSupportedFilters should return expected filters', () => {
        const filters = processor.getSupportedFilters();
        assert.ok(Array.isArray(filters));
        assert.ok(filters.length > 0);
        assert.ok(filters.includes('upper'));
        assert.ok(filters.includes('lower'));
        assert.ok(filters.includes('int'));
        assert.ok(filters.includes('float'));
        assert.ok(filters.includes('sql_quote'));
    });

    // Test the bug fix: variable extraction should not mistake filter names as variables
    test('extractVariables should correctly parse filter expressions', () => {
        const template = `
            SELECT * FROM orders
            WHERE user_id = {{ user.id }}
              AND total > {{ min_amount|float }}
              AND status IN ('{{ status }}')
              {% if include_deleted %}AND is_deleted = FALSE{% endif %}
            ORDER BY created_at DESC
            LIMIT {{ max_results }}
        `;

        const variables = processor.extractVariables(template);

        // Should extract: user.id, min_amount, status, include_deleted, max_results
        // Should NOT extract: float, limit, etc. as they are filters

        const variableNames = variables.map(v => v.name);
        assert.ok(variableNames.includes('user.id'), 'Should extract user.id');
        assert.ok(variableNames.includes('min_amount'), 'Should extract min_amount');
        assert.ok(variableNames.includes('status'), 'Should extract status');
        assert.ok(variableNames.includes('include_deleted'), 'Should extract include_deleted');
        assert.ok(variableNames.includes('max_results'), 'Should extract max_results');

        // Verify that min_amount has the float filter
        const minAmountVar = variables.find(v => v.name === 'min_amount');
        assert.ok(minAmountVar, 'Should find min_amount variable');
        assert.ok(minAmountVar.filters && minAmountVar.filters.includes('float'), 'min_amount should have float filter');

        // Should NOT have filter names as variables
        assert.ok(!variableNames.includes('float'), 'Should NOT extract float as variable');
        assert.ok(!variableNames.includes('int'), 'Should NOT extract int as variable');
        assert.ok(!variableNames.includes('string'), 'Should NOT extract string as variable');
    });

    // Test that filter names as variable names work correctly
    test('variable names that match filter names should be extracted', () => {
        const template = `
            SELECT * FROM test
            WHERE float_col = {{ float }}
              AND int_col = {{ int }}
              AND string_col = {{ string }}
        `;

        const variables = processor.extractVariables(template);

        const variableNames = variables.map(v => v.name);
        assert.ok(variableNames.includes('float'), 'Should extract float as variable when not used as filter');
        assert.ok(variableNames.includes('int'), 'Should extract int as variable when not used as filter');
        assert.ok(variableNames.includes('string'), 'Should extract string as variable when not used as filter');
    });
});
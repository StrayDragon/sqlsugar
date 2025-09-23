import * as assert from 'assert';
import { Jinja2NunjucksProcessor } from '../jinja2-nunjucks-processor';
import { Jinja2TestHelpers } from './utils/jinja2-test-helpers';

/**
 * Consolidated Jinja2 Test Suite
 *
 * This test suite consolidates all Jinja2-related tests into a single file,
 * using shared test utilities to reduce code duplication and improve maintainability.
 *
 * Previously, these tests were spread across three files:
 * - jinja2-integration.test.ts (199 lines)
 * - jinja2-filters.test.ts (270 lines)
 * - jinja2-filters-edge-cases.test.ts (202 lines)
 *
 * Total reduction: ~671 lines to ~400 lines (40% reduction)
 */
suite('Jinja2 Consolidated Test Suite', () => {
    let processor: Jinja2NunjucksProcessor;

    setup(() => {
        processor = Jinja2NunjucksProcessor.getInstance();
    });

    suite('Variable Extraction', () => {
        test('should extract variables from complex template', async () => {
            const template = Jinja2TestHelpers.createComplexConditionTemplate();
            const expectedVariables = ['department_id', 'start_date', 'is_active', 'min_amount', 'max_amount', 'limit', 'offset'];

            await Jinja2TestHelpers.testVariableExtraction(template, expectedVariables);
        });

        test('should extract variables with proper type inference', async () => {
            const template = `SELECT * FROM users WHERE user_id = {{ user.id }} AND status = '{{ status }}'`;
            const variables = await processor.extractVariables(template);

            const userVar = variables.find(v => v.name === 'user.id');
            assert.equal(userVar?.type, 'number', 'user.id should be inferred as number');

            const statusVar = variables.find(v => v.name === 'status');
            assert.equal(statusVar?.type, 'string', 'status should be inferred as string');
        });

        test('should distinguish variables from filter names', () => {
            const template = `
                SELECT * FROM orders
                WHERE user_id = {{ user.id }}
                  AND total > {{ min_amount|float }}
                  AND status IN ('{{ status }}')
                LIMIT {{ max_results }}
            `;

            const variables = processor.extractVariables(template);
            const variableNames = variables.map(v => v.name);

            assert.ok(variableNames.includes('user.id'), 'Should extract user.id');
            assert.ok(variableNames.includes('min_amount'), 'Should extract min_amount');
            assert.ok(!variableNames.includes('float'), 'Should NOT extract float as variable');

            const minAmountVar = variables.find(v => v.name === 'min_amount');
            assert.ok(minAmountVar?.filters?.includes('float'), 'min_amount should have float filter');
        });

        test('should handle variables that match filter names', () => {
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

    suite('Template Rendering', () => {
        test('should render standard template with variables', async () => {
            const template = Jinja2TestHelpers.createStandardTestTemplate();
            const variables = Jinja2TestHelpers.getStandardTestVariables();
            const expected = `SELECT * FROM users
WHERE user_id = 42
  AND status IN ('active')
ORDER BY created_at DESC
LIMIT 10`;

            await Jinja2TestHelpers.testTemplateRendering(template, variables, expected);
        });

        test('should handle boolean conditions correctly', async () => {
            const template = `SELECT * FROM users {% if active %}WHERE active = true{% endif %}`;

            // Test with active = true
            let result = await processor.renderTemplate(template, { active: true });
            assert.ok(result.includes('WHERE active = true'), 'Condition should be rendered when true');

            // Test with active = false
            result = await processor.renderTemplate(template, { active: false });
            assert.ok(!result.includes('WHERE active = true'), 'Condition should not be rendered when false');
        });

        test('should render complex nested conditions', async () => {
            const template = `{% if user.active and user.age >= 18 %}
SELECT * FROM users WHERE name = '{{ user.name|lower }}'
{% else %}
SELECT * FROM users WHERE name = 'guest'
{% endif %}`;

            const context = {
                'user.active': true,
                'user.age': 25,
                'user.name': 'ALICE'
            };

            const result = await processor.renderTemplate(template, context);
            assert.ok(result.includes("WHERE name = 'alice'"), 'lower filter should work');
            assert.ok(result.includes('SELECT * FROM users'), 'Condition statements should be handled correctly');
        });

        test('should handle loops correctly', async () => {
            const template = Jinja2TestHelpers.createLoopTestTemplate();
            const variables = Jinja2TestHelpers.getLoopTestVariables();
            const expected = "SELECT * FROM users WHERE id IN (1,2,3,4,5)";

            await Jinja2TestHelpers.testTemplateRendering(template, variables, expected);
        });
    });

    suite('String Filters', () => {
        const stringFilterTests = [
            { filter: 'upper', input: 'hello', expected: 'HELLO' },
            { filter: 'lower', input: 'HELLO', expected: 'hello' },
            { filter: 'title', input: 'hello world', expected: 'Hello World' },
            { filter: 'capitalize', input: 'hello world', expected: 'Hello world' },
            { filter: 'trim', input: '  hello  ', expected: 'hello' },
            { filter: 'striptags', input: '<p>hello</p>', expected: 'hello' }
        ];

        stringFilterTests.forEach(({ filter, input, expected }) => {
            test(`${filter} filter should work correctly`, () => {
                const template = `{{ "${input}" | ${filter} }}`;
                const result = processor.renderTemplate(template, {});
                assert.strictEqual(result, expected);
            });
        });

        test('should handle string filter edge cases', () => {
            // Empty strings
            assert.strictEqual(processor.renderTemplate('{{ "" | striptags }}', {}), '');
            assert.strictEqual(processor.renderTemplate('{{ null | striptags }}', {}), 'null');

            // Complex HTML
            assert.strictEqual(processor.renderTemplate('{{ "<p>hello</p><div>world</div>" | striptags }}', {}), 'helloworld');
        });
    });

    suite('Number Filters', () => {
        const numberFilterTests = [
            { filter: 'int', input: '42', expected: '42' },
            { filter: 'int', input: '3.14', expected: '3' },
            { filter: 'float', input: '3.14', expected: '3.14' },
            { filter: 'float', input: '42', expected: '42' },
            { filter: 'round', input: '3.14159', expected: '3.14', args: '(2)' },
            { filter: 'abs', input: '-5', expected: '5' }
        ];

        numberFilterTests.forEach(({ filter, input, expected, args = '' }) => {
            test(`${filter} filter should convert correctly`, () => {
                const template = `{{ "${input}" | ${filter}${args} }}`;
                const result = processor.renderTemplate(template, {});
                assert.strictEqual(result, expected);
            });
        });

        test('should handle number filter edge cases', () => {
            // Invalid numbers
            assert.strictEqual(processor.renderTemplate('{{ "invalid" | int }}', {}), 'NaN');
            assert.strictEqual(processor.renderTemplate('{{ "invalid" | float }}', {}), 'NaN');

            // Null values
            assert.strictEqual(processor.renderTemplate('{{ null | int }}', {}), '0');
            assert.strictEqual(processor.renderTemplate('{{ null | float }}', {}), 'NaN');

            // Edge cases
            assert.strictEqual(processor.renderTemplate('{{ "0" | abs }}', {}), '0');
            assert.strictEqual(processor.renderTemplate('{{ "-0" | abs }}', {}), '0');
        });
    });

    suite('List Filters', () => {
        test('join filter should concatenate elements', () => {
            const template = '{{ ["a", "b", "c"] | join(", ") }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, 'a, b, c');
        });

        test('length filter should return collection size', () => {
            const template = '{{ ["a", "b", "c"] | length }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, '3');
        });

        test('first/last filters should return correct elements', () => {
            const firstTemplate = '{{ ["a", "b", "c"] | first }}';
            const lastTemplate = '{{ ["a", "b", "c"] | last }}';

            assert.strictEqual(processor.renderTemplate(firstTemplate, {}), 'a');
            assert.strictEqual(processor.renderTemplate(lastTemplate, {}), 'c');
        });

        test('sort/reverse filters should manipulate lists correctly', () => {
            const sortTemplate = '{{ [3, 1, 2] | sort | join(", ") }}';
            const reverseTemplate = '{{ ["a", "b", "c"] | reverse | join(", ") }}';

            assert.strictEqual(processor.renderTemplate(sortTemplate, {}), '1, 2, 3');
            assert.strictEqual(processor.renderTemplate(reverseTemplate, {}), 'c, b, a');
        });

        test('should handle list filter edge cases', () => {
            // Empty lists
            assert.strictEqual(processor.renderTemplate('{{ [] | length }}', {}), '0');
            assert.strictEqual(processor.renderTemplate('{{ [] | first }}', {}), '');
            assert.strictEqual(processor.renderTemplate('{{ [] | last }}', {}), '');

            // Mixed types
            assert.strictEqual(processor.renderTemplate('{{ [1, "1", true, null] | unique | join(", ") }}', {}), '1, 1, true, null');
        });
    });

    suite('Utility Filters', () => {
        test('default filter should provide fallback values', () => {
            const template1 = '{{ undefined_var | default("default") }}';
            const template2 = '{{ defined_var | default("default") }}';

            assert.strictEqual(processor.renderTemplate(template1, {}), 'default');
            assert.strictEqual(processor.renderTemplate(template2, { defined_var: 'actual' }), 'actual');
        });

        test('boolean default filter should work correctly', () => {
            const testCases = [
                { input: 'null', expected: 'default' },
                { input: 'false', expected: 'default' },
                { input: '""', expected: 'default' },
                { input: '"non-empty"', expected: 'non-empty' },
                { input: '1', expected: '1' }
            ];

            testCases.forEach(({ input, expected }) => {
                const template = `{{ ${input} | default("default", true) }}`;
                assert.strictEqual(processor.renderTemplate(template, {}), expected);
            });
        });

        test('replace filter should substitute text', () => {
            const template = '{{ "hello world" | replace("world", "jinja") }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, 'hello jinja');
        });

        test('truncate filter should limit text length', () => {
            const template = '{{ "hello world" | truncate(5) }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, 'he...');
        });
    });

    suite('SQL-Specific Filters', () => {
        test('sql_quote filter should escape quotes correctly', () => {
            const testCases = [
                { input: 'O\'Reilly', expected: "'O''Reilly'" },
                { input: '', expected: "''" },
                { input: 'null', expected: 'null' },
                { input: 42, expected: '42' }
            ];

            testCases.forEach(({ input, expected }) => {
                const template = `{{ ${typeof input === 'string' ? `"${input}"` : input} | sql_quote }}`;
                assert.strictEqual(processor.renderTemplate(template, {}), expected);
            });
        });

        test('sql_identifier filter should quote identifiers', () => {
            const testCases = [
                { input: 'column', expected: '"column"' },
                { input: 'column name', expected: '"column name"' },
                { input: '', expected: '""' }
            ];

            testCases.forEach(({ input, expected }) => {
                const template = `{{ "${input}" | sql_identifier }}`;
                assert.strictEqual(processor.renderTemplate(template, {}), expected);
            });
        });

        test('sql_in filter should format IN clauses', () => {
            const template = '{{ [1, 2, 3] | sql_in }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, "'1', '2', '3'");
        });

        test('should handle empty collections in sql_in', () => {
            const template = '{{ [] | sql_in }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, '');
        });
    });

    suite('Filter Chaining and Complex Operations', () => {
        test('should support filter chaining', () => {
            const template = '{{ "  hello world  " | trim | upper | replace("WORLD", "JINJA") }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, 'HELLO JINJA');
        });

        test('should handle complex chained operations', () => {
            const template = '{{ "  hello world  " | trim | upper | replace("WORLD", "JINJA") | truncate(10) }}';
            const result = processor.renderTemplate(template, {});
            assert.strictEqual(result, 'HELLO...');
        });

        test('should handle complex template with multiple filters', () => {
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
            assert.ok(result.includes('John Doe'), 'Name should be properly formatted');
            assert.ok(result.includes('18'), 'Age should be converted to int');
            assert.ok(result.includes('active'), 'Boolean condition should work');
            assert.ok(result.includes('10'), 'Limit should be converted to int');
        });
    });

    suite('Error Handling and Edge Cases', () => {
        test('unknown filters should be handled gracefully', () => {
            const result = processor.renderTemplate('{{ "hello" | unknown_filter }}', {});
            assert.strictEqual(result, 'hello', 'Should return original value for unknown filters');
        });

        test('should handle large inputs without crashing', () => {
            // Large string
            const largeString = 'x'.repeat(10000);
            const result = processor.renderTemplate('{{ largeString | truncate(100) }}', { largeString });
            assert.strictEqual(result.length, 100);

            // Large array
            const largeArray = Array.from({ length: 1000 }, (_, i) => i);
            const result2 = processor.renderTemplate('{{ array | length }}', { array: largeArray });
            assert.strictEqual(result2, '1000');
        });

        test('should handle unicode and special characters', () => {
            assert.strictEqual(processor.renderTemplate('{{ "café" | upper }}', {}), 'CAFÉ');
            assert.strictEqual(processor.renderTemplate('{{ "🌟" | length }}', {}), '2');
            assert.strictEqual(processor.renderTemplate('{{ "It\'s a test" | sql_quote }}', {}), "'It''s a test'");
        });

        test('should handle template with undefined variables gracefully', () => {
            const template = 'SELECT * FROM users WHERE name = {{ name | default("anonymous") }}';
            const result = processor.renderTemplate(template, {});
            assert.ok(result.includes('anonymous'), 'Should use default value for undefined variables');
        });
    });

    suite('Integration and Performance', () => {
        test('should process complex templates with all features', async () => {
            const template = `SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ max_results|length }}`;

            const context = {
                'user.id': 42,
                'min_amount': '100.5',
                'status': 'completed',
                'include_deleted': true,
                'max_results': 'demo_limit' // length 10
            };

            const result = await processor.renderTemplate(template, context);

            // Verify all features work together
            assert.ok(result.includes('WHERE user_id = 42'), 'Nested properties should work');
            assert.ok(result.includes('total > 100.5'), 'Float filter should work');
            assert.ok(result.includes("status IN ('completed')"), 'String variables should work');
            assert.ok(result.includes('AND is_deleted = FALSE'), 'Boolean conditions should work');
            assert.ok(result.includes('LIMIT 10'), 'Length filter should work');
            assert.ok(!result.includes('{%'), 'Template syntax should be processed');
            assert.ok(!result.includes('{{'), 'Template syntax should be processed');
        });

        test('getSupportedFilters should return expected filters', () => {
            const filters = processor.getSupportedFilters();
            assert.ok(Array.isArray(filters));
            assert.ok(filters.length > 0);

            const expectedFilters = ['upper', 'lower', 'int', 'float', 'sql_quote'];
            expectedFilters.forEach(filter => {
                assert.ok(filters.includes(filter), `Should include ${filter} filter`);
            });
        });
    });

    suite('Filter Templates', () => {
        test('should process filter template correctly', async () => {
            const template = Jinja2TestHelpers.createFilterTestTemplate();
            const variables = Jinja2TestHelpers.getFilterTestVariables();
            const expected = "SELECT 'HELLO' as greeting, 'world' as message";

            await Jinja2TestHelpers.testTemplateRendering(template, variables, expected);
        });
    });
});
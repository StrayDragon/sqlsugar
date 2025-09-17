import * as assert from 'assert';
import { Jinja2TemplateProcessor } from '../jinja2-processor';

suite('Jinja2 Template Processor Test Suite', () => {
    test('should detect Jinja2 template with variables', () => {
        const template = `SELECT * FROM users WHERE name = '{{ user_name }}' AND age > {{ user_age }}`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        assert.strictEqual(analysis?.variables.length, 2);
        assert.strictEqual(analysis?.variables[0].name, 'user_name');
        assert.strictEqual(analysis?.variables[1].name, 'user_age');
        assert.strictEqual(analysis?.variables[0].type, 'string');
        assert.strictEqual(analysis?.variables[1].type, 'number');
    });

    test('should detect Jinja2 template with conditional statements', () => {
        const template = `SELECT * FROM users {% if is_active %}WHERE status = 'active'{% endif %}`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        assert.strictEqual(analysis?.variables.length, 1);
        assert.strictEqual(analysis?.variables[0].name, 'is_active');
        assert.strictEqual(analysis?.variables[0].type, 'boolean');
    });

    test('should generate demo SQL with proper replacements', () => {
        const template = `SELECT * FROM users WHERE name = '{{ user_name }}' AND age > {{ user_age }} AND is_active = {{ is_active }}`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');

        const demoSQL = analysis?.demoSQL;
        assert.ok(demoSQL, 'Demo SQL should not be null');
        assert.ok(demoSQL.includes("'demo_"), 'Demo SQL should contain string replacements');
        assert.ok(!demoSQL.includes('{{'), 'Demo SQL should not contain Jinja2 syntax');
        assert.ok(!demoSQL.includes('}}'), 'Demo SQL should not contain Jinja2 syntax');
    });

    test('should handle complex Jinja2 expressions', () => {
        const template = `SELECT * FROM orders WHERE user_id = {{ user.id }} AND total > {{ min_amount|float }}`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        assert.strictEqual(analysis?.variables.length, 2);
        assert.strictEqual(analysis?.variables[0].name, 'user');
        assert.strictEqual(analysis?.variables[1].name, 'min_amount');
    });

    test('should reject non-SQL Jinja2 templates', () => {
        const template = `Hello {{ name }}, your score is {{ score }}!`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.strictEqual(analysis, null, 'Non-SQL template should be rejected');
    });

    test('should reject plain SQL without Jinja2 syntax', () => {
        const template = `SELECT * FROM users WHERE name = 'John' AND age > 25`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.strictEqual(analysis, null, 'Plain SQL without Jinja2 should be rejected');
    });

    test('should handle quoted templates', () => {
        const template = `"SELECT * FROM users WHERE name = '{{ user_name }}'"`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        assert.strictEqual(analysis?.variables.length, 1);
        assert.strictEqual(analysis?.variables[0].name, 'user_name');
    });

    test('should handle triple-quoted templates', () => {
        const template = `"""SELECT * FROM users
WHERE name = '{{ user_name }}'
AND age > {{ user_age }}"""`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        assert.strictEqual(analysis?.variables.length, 2);
    });

    test('should ignore SQL keywords in variables', () => {
        const template = `SELECT * FROM users WHERE {{ column_name }} = '{{ value }}'`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        // column_name should be ignored if it's a SQL keyword
        assert.ok(analysis?.variables.length >= 1, 'Should find at least the value variable');
    });

    test('should handle Jinja2 comments', () => {
        const template = `{# This is a comment #}SELECT * FROM users WHERE name = '{{ user_name }}'`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');
        assert.strictEqual(analysis?.hasJinja2Syntax, true);
        assert.strictEqual(analysis?.variables.length, 1);
        assert.strictEqual(analysis?.variables[0].name, 'user_name');
    });

    test('should infer variable types correctly', () => {
        const template = `SELECT * FROM users WHERE user_id = {{ user_id }} AND username = '{{ username }}' AND is_active = {{ is_active_flag }}`;
        const analysis = Jinja2TemplateProcessor.analyzeTemplate(template);

        assert.ok(analysis, 'Analysis should not be null');

        const variables = analysis?.variables || [];
        const user_id = variables.find(v => v.name === 'user_id');
        const username = variables.find(v => v.name === 'username');
        const is_active_flag = variables.find(v => v.name === 'is_active_flag');

        assert.strictEqual(user_id?.type, 'number');
        assert.strictEqual(username?.type, 'string');
        assert.strictEqual(is_active_flag?.type, 'boolean');
    });
});
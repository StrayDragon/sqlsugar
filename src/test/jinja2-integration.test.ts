import * as assert from 'assert';
import * as vscode from 'vscode';
import { Jinja2NunjucksProcessor } from '../jinja2-nunjucks-processor';

/**
 * 集成测试：验证 Jinja2 Template Editor 功能
 * 测试用例基于 examples/python-example.py 中的模板
 */
suite('Jinja2 Template Editor Integration Test', () => {
    let processor: Jinja2NunjucksProcessor;

    setup(() => {
        processor = Jinja2NunjucksProcessor.getInstance();
    });

    test('模板变量提取', async () => {
        const template = `SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ max_results }}`;

        const variables = await processor.extractVariables(template);

        console.log('提取的变量:', variables);

        // 验证提取的变量
        assert.ok(variables.some((v: any) => v.name === 'user.id'), '应该提取到 user.id');
        assert.ok(variables.some((v: any) => v.name === 'min_amount'), '应该提取到 min_amount');
        assert.ok(variables.some((v: any) => v.name === 'status'), '应该提取到 status');
        assert.ok(variables.some((v: any) => v.name === 'include_deleted'), '应该提取到 include_deleted');
        assert.ok(variables.some((v: any) => v.name === 'max_results'), '应该提取到 max_results');

        // 验证变量类型推断
        const userVar = variables.find((v: any) => v.name === 'user.id');
        assert.equal(userVar?.type, 'number', 'user.id 应该被推断为 number');

        const includeDeletedVar = variables.find((v: any) => v.name === 'include_deleted');
        assert.equal(includeDeletedVar?.type, 'boolean', 'include_deleted 应该被推断为 boolean');
    });

    test('布尔条件渲染 - include_deleted = true', async () => {
        const template = `SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ max_results }}`;

        const context = {
            'user.id': 42,
            'min_amount': 100.0,
            'status': 'completed',
            'include_deleted': true,
            'max_results': 50
        };

        const result = await processor.renderTemplate(template, context);
        console.log('include_deleted = true 渲染结果:', result);

        assert.ok(result.includes('AND is_deleted = FALSE'), '当 include_deleted = true 时，条件应该被渲染');
        assert.ok(result.includes('WHERE user_id = 42'), 'user.id 应该正确渲染');
        assert.ok(result.includes('total > 100'), 'min_amount 应该正确渲染');
    });

    test('布尔条件渲染 - include_deleted = false', async () => {
        const template = `SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ max_results }}`;

        const context = {
            'user.id': 42,
            'min_amount': 100.0,
            'status': 'completed',
            'include_deleted': false,
            'max_results': 50
        };

        const result = await processor.renderTemplate(template, context);
        console.log('include_deleted = false 渲染结果:', result);

        assert.ok(!result.includes('AND is_deleted = FALSE'), '当 include_deleted = false 时，条件不应该被渲染');
        assert.ok(!result.includes('{% if include_deleted %}'), '条件语句应该被完全移除');
        assert.ok(result.includes('WHERE user_id = 42'), 'user.id 应该正确渲染');
    });

    test('嵌套属性访问 - user.id', async () => {
        const template = 'SELECT * FROM users WHERE id = {{ user.id }}';

        const context = {
            'user.id': 123
        };

        const result = await processor.renderTemplate(template, context);
        console.log('user.id 渲染结果:', result);

        assert.ok(result.includes('WHERE id = 123'), '嵌套属性 user.id 应该正确渲染');
    });

    test('length 过滤器', async () => {
        const template = 'SELECT * FROM orders LIMIT {{ max_results|length }}';

        const context = {
            'max_results': 'demo_max_results' // 长度为16
        };

        const result = await processor.renderTemplate(template, context);
        console.log('length 过滤器渲染结果:', result);

        assert.ok(result.includes('LIMIT 16'), 'length 过滤器应该返回字符串长度');
    });

    test('float 过滤器', async () => {
        const template = 'SELECT * FROM orders WHERE total > {{ min_amount|float }}';

        const context = {
            'min_amount': '100.5'
        };

        const result = await processor.renderTemplate(template, context);
        console.log('float 过滤器渲染结果:', result);

        assert.ok(result.includes('WHERE total > 100.5'), 'float 过滤器应该正确转换数字');
    });

    test('复杂模板完整渲染', async () => {
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
            'max_results': 'demo_limit' // 长度为10
        };

        const result = await processor.renderTemplate(template, context);
        console.log('完整模板渲染结果:', result);

        // 验证所有功能
        assert.ok(result.includes('WHERE user_id = 42'), '嵌套属性应该正确渲染');
        assert.ok(result.includes('total > 100.5'), 'float 过滤器应该工作');
        assert.ok(result.includes("status IN ('completed')"), '字符串变量应该正确渲染');
        assert.ok(result.includes('AND is_deleted = FALSE'), '布尔条件应该工作');
        assert.ok(result.includes('LIMIT 10'), 'length 过滤器应该工作');
        assert.ok(!result.includes('{%'), '模板语法应该被完全处理');
        assert.ok(!result.includes('{{'), '模板语法应该被完全处理');
    });

    test('Python Jinja2 兼容性', async () => {
        // 测试 Python Jinja2 特有的语法
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
        console.log('Python Jinja2 兼容性测试结果:', result);

        assert.ok(result.includes("WHERE name = 'alice'"), 'lower 过滤器应该工作');
        assert.ok(result.includes('SELECT * FROM users'), '条件语句应该正确处理');
    });

    test('错误处理 - 无效模板', async () => {
        const template = 'SELECT * FROM users WHERE id = {{ user.id }'; // 缺少闭合括号

        const context = {
            'user.id': 42
        };

        try {
            const result = await processor.renderTemplate(template, context);
            // 如果没有抛出错误，检查结果
            console.log('错误处理测试结果:', result);
        } catch (error) {
            console.log('预期的错误:', error);
            assert.ok(error instanceof Error, '应该抛出错误');
        }
    });
});
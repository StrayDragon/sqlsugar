import { Jinja2NunjucksProcessor } from '../../jinja2-nunjucks-processor';

/**
 * Jinja2测试专用辅助工具
 */
export class Jinja2TestHelpers {
  /**
   * 创建标准测试模板
   */
  static createStandardTestTemplate(): string {
    return `SELECT * FROM users
WHERE user_id = {{ user.id }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit }}`;
  }

  /**
   * 创建复杂条件测试模板
   */
  static createComplexConditionTemplate(): string {
    return `SELECT * FROM users
WHERE department_id = {{ department_id }}
  AND created_date >= '{{ start_date }}'
  {% if is_active %}AND status = 'active'{% endif %}
  {% if min_amount %}AND total_orders >= {{ min_amount }}{% endif %}
  {% if max_amount %}AND total_orders <= {{ max_amount }}{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit }} OFFSET {{ offset }}`;
  }

  /**
   * 创建过滤器测试模板
   */
  static createFilterTestTemplate(): string {
    return `SELECT '{{ hello | upper }}' as greeting, '{{ WORLD | lower }}' as message`;
  }

  /**
   * 创建循环测试模板
   */
  static createLoopTestTemplate(): string {
    return `SELECT * FROM users WHERE id IN ({% for user_id in user_ids %}{{ user_id }}{% if not loop.last %},{% endif %}{% endfor %})`;
  }

  /**
   * 获取标准测试变量
   */
  static getStandardTestVariables(): Record<string, any> {
    return {
      user: { id: 42 },
      status: 'active',
      include_deleted: false,
      limit: 10
    };
  }

  /**
   * 获取复杂测试变量
   */
  static getComplexTestVariables(): Record<string, any> {
    return {
      department_id: 5,
      start_date: '2023-01-01',
      is_active: true,
      min_amount: 100,
      max_amount: 1000,
      limit: 20,
      offset: 0
    };
  }

  /**
   * 获取过滤器测试变量
   */
  static getFilterTestVariables(): Record<string, any> {
    return {
      hello: 'hello',
      WORLD: 'WORLD'
    };
  }

  /**
   * 获取循环测试变量
   */
  static getLoopTestVariables(): Record<string, any> {
    return {
      user_ids: [1, 2, 3, 4, 5]
    };
  }

  /**
   * 测试变量提取
   */
  static async testVariableExtraction(
    template: string,
    expectedVariables: string[]
  ): Promise<void> {
    const processor = Jinja2NunjucksProcessor.getInstance();
    const variables = await processor.extractVariables(template);

    expectedVariables.forEach(varName => {
      if (!variables.find(v => v.name === varName)) {
        throw new Error(`Expected variable '${varName}' not found in extraction`);
      }
    });
  }

  /**
   * 测试模板渲染
   */
  static async testTemplateRendering(
    template: string,
    variables: Record<string, any>,
    expectedContent: string
  ): Promise<void> {
    const processor = Jinja2NunjucksProcessor.getInstance();
    const result = await processor.processTemplate(template, variables);

    if (result.sql !== expectedContent) {
      throw new Error(`Template rendering failed. Expected: ${expectedContent}, Got: ${result.sql}`);
    }
  }

  /**
   * 测试错误处理
   */
  static async testErrorHandling(
    template: string,
    variables: Record<string, any>,
    expectedError: string
  ): Promise<void> {
    const processor = Jinja2NunjucksProcessor.getInstance();

    try {
      await processor.processTemplate(template, variables);
      throw new Error('Expected error was not thrown');
    } catch (error) {
      if (!(error instanceof Error && error.message.includes(expectedError))) {
        throw new Error(`Expected error containing "${expectedError}", but got: ${error}`);
      }
    }
  }

  /**
   * 验证提取的变量
   */
  static validateExtractedVariables(
    actualVariables: Array<{ name: string; type: string; }>,
    expectedVariables: Array<{ name: string; type: string; }>
  ): void {
    expectedVariables.forEach(expected => {
      const actual = actualVariables.find(v => v.name === expected.name);
      if (!actual) {
        throw new Error(`Expected variable '${expected.name}' not found`);
      }
      if (actual.type !== expected.type) {
        throw new Error(`Variable '${expected.name}' type mismatch. Expected: ${expected.type}, Got: ${actual.type}`);
      }
    });
  }
}

/**
 * Jinja2测试数据
 */
export const JINJA2_TEST_DATA = {
  TEMPLATES: {
    SIMPLE_VARIABLE: 'SELECT * FROM users WHERE name = "{{ name }}"',
    MULTIPLE_VARIABLES: `SELECT * FROM users
WHERE id = {{ user.id }} AND name = '{{ user.name }}'`,
    CONDITIONAL: `SELECT * FROM users {% if active %}WHERE active = true{% endif %}`,
    LOOP: `{% for item in items %}{{ item }}{% if not loop.last %}, {% endif %}{% endfor %}`,
    FILTERS: 'SELECT "{{ "hello" | upper }}" as greeting',
    COMPLEX: `SELECT * FROM users
WHERE department_id = {{ dept.id }}
  AND created_at >= '{{ start_date | date("Y-m-d") }}'
  {% if show_inactive %}OR status = 'inactive'{% endif %}
ORDER BY created_at
LIMIT {{ limit | default(10) }}`
  },

  VARIABLES: {
    SIMPLE: { name: 'John Doe' },
    USER_OBJECT: { user: { id: 42, name: 'John Doe' } },
    CONDITIONAL: { active: true },
    LOOP: { items: ['apple', 'banana', 'cherry'] },
    FILTERS: {},
    COMPLEX: {
      dept: { id: 5 },
      start_date: '2023-01-01',
      show_inactive: false,
      limit: 20
    }
  },

  EXPECTED_RESULTS: {
    SIMPLE_VARIABLE: "SELECT * FROM users WHERE name = 'John Doe'",
    MULTIPLE_VARIABLES: "SELECT * FROM users \nWHERE id = 42 AND name = 'John Doe'",
    CONDITIONAL: "SELECT * FROM users WHERE active = true",
    LOOP: "apple, banana, cherry",
    FILTERS: "SELECT 'HELLO' as greeting",
    COMPLEX: `SELECT * FROM users
WHERE department_id = 5
  AND created_at >= '2023-01-01'
ORDER BY created_at
LIMIT 20`
  }
};
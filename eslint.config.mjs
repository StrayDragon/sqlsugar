import antfu from '@antfu/eslint-config'
import pluginPerfectionist from 'eslint-plugin-perfectionist'
import pluginSonarjs from 'eslint-plugin-sonarjs'

export default [
  {
    ignores: ['**/*.yml', '**/*.yaml', '**/*.json', 'docker/**/*.yml', 'src/test/stubs/**/*.yml']
  },
  antfu(
    {
      typescript: {
        tsconfigPath: 'tsconfig.json',
      },
      stylistic: {
        indent: 2,
        quotes: 'single',
      },
    },
    {
      plugins: {
        perfectionist: pluginPerfectionist,
        sonarjs: pluginSonarjs,
      },
      rules: {
        // 启用 sonarjs 规则用于代码质量检测
        'sonarjs/cognitive-complexity': ['warn', 15],
        'sonarjs/no-duplicate-string': 'warn',
        'sonarjs/no-identical-functions': 'warn',
        'sonarjs/no-collapsible-if': 'warn',
        'sonarjs/prefer-immediate-return': 'warn',

        // 启用 perfectionist 规则用于代码格式化
        'perfectionist/sort-objects': ['warn', {
          'type': 'alphabetical',
          'order': 'asc',
        }],

        // 自定义 TypeScript 规则
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unsafe-call': 'error',
        '@typescript-eslint/no-unsafe-member-access': 'error',
        '@typescript-eslint/no-unsafe-return': 'error',
        '@typescript-eslint/restrict-template-expressions': 'error',
        '@typescript-eslint/unbound-method': 'error',
        '@typescript-eslint/prefer-as-const': 'error',

        // 代码复杂度控制
        'max-lines-per-function': ['warn', 50],
        'complexity': ['warn', 10],
        'max-depth': ['warn', 4],
        'max-params': ['warn', 5],

        // 代码质量
        'no-console': 'warn',
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',
        'no-script-url': 'error',

        // 最佳实践
        'curly': 'error',
        'eqeqeq': 'error',
        'no-throw-literal': 'error',
        'semi': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'object-shorthand': 'error',
        'prefer-template': 'error',
      },
    }
  )
]
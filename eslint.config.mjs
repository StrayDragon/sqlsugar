import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    ignores: [
      '**/*.yml',
      '**/*.yaml',
      '**/*.json',
      'docker/**/*.yml',
      'src/test/stubs/**/*.yml',
      'dist/**',
      'node_modules/**',
      'out/**',
      '*.d.ts',
      '*.js.map',
      'src/**/*.d.ts',
      'src/jinja2-editor/**/*'
    ]
  },
  {
    files: ['src/**/*.{ts,js}', '!src/jinja2-editor/**/*'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',

      // Basic style rules
      'no-trailing-spaces': 'error',
      'eol-last': 'error'
    }
  },
  {
    files: ['src/jinja2-editor/**/*.{ts,js}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.components.json',
        tsconfigRootDir: '.',
        ecmaVersion: 2022,
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',

      // Basic style rules
      'no-trailing-spaces': 'error',
      'eol-last': 'error'
    }
  }
]
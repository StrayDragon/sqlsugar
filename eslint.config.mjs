import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'
import pluginSonarjs from 'eslint-plugin-sonarjs'
import pluginPerfectionist from 'eslint-plugin-perfectionist'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

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
    files: ['src/**/*.{ts,js}', '!src/jinja2-editor/**/*', '!src/test/**/*'],
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
      '@typescript-eslint': tseslint,
      'sonarjs': pluginSonarjs,
      'perfectionist': pluginPerfectionist,
      'prettier': prettierPlugin
    },
    rules: {
      // Prettier rules - enforce formatting
      'prettier/prettier': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',

      // SonarJS rules
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'error',

      // Perfectionist rules
      'perfectionist/sort-imports': 'warn',
      'perfectionist/sort-exports': 'warn',

      // Basic style rules (Prettier handles most formatting)
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
      '@typescript-eslint': tseslint,
      'sonarjs': pluginSonarjs,
      'perfectionist': pluginPerfectionist,
      'prettier': prettierPlugin
    },
    rules: {
      // Prettier rules - enforce formatting
      'prettier/prettier': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',

      // SonarJS rules
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'error',

      // Perfectionist rules
      'perfectionist/sort-imports': 'warn',
      'perfectionist/sort-exports': 'warn',

      // Basic style rules (Prettier handles most formatting)
      'no-trailing-spaces': 'error',
      'eol-last': 'error'
    }
  },
  {
    files: ['src/test/**/*.{ts,js}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: false
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'sonarjs': pluginSonarjs,
      'perfectionist': pluginPerfectionist,
      'prettier': prettierPlugin
    },
    rules: {
      // Prettier rules - enforce formatting even in tests
      'prettier/prettier': 'warn',

      // Test file rules - very relaxed, no type warnings
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',

      // SonarJS rules - disabled for tests
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-identical-functions': 'off',

      // Perfectionist rules - relaxed for tests
      'perfectionist/sort-imports': 'off',
      'perfectionist/sort-exports': 'off',

      // Basic style rules only
      'no-trailing-spaces': 'warn',
      'eol-last': 'warn'
    }
  },
  // Apply prettier config last to disable conflicting rules
  prettierConfig
]
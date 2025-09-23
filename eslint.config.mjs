import antfu from '@antfu/eslint-config'

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
    }
  )
]
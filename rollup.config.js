import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { summary } from 'rollup-plugin-summary';
import filesize from 'rollup-plugin-filesize';

const isDevelopment = process.env.NODE_ENV !== 'production';

export default {
  input: './src/jinja2-editor/index.ts',
  output: [
    {
      file: 'dist/jinja2-editor/jinja2-editor.js',
      format: 'es',
      sourcemap: true
    }
  ],
  external: ['vscode', 'lit'],
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/jinja2-editor/types',
      exclude: ['**/*.test.ts'],
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strict: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        exactOptionalPropertyTypes: false
      }
    }),
    nodeResolve({
      browser: true,
      exportConditions: ['browser', 'development', 'production']
    }),
    !isDevelopment && terser({
      ecma: 2020,
      module: true,
      warnings: true,
      compress: {
        passes: 2,
        global_defs: {
          '@development': isDevelopment
        }
      },
      mangle: {
        properties: {
          regex: /^_[^_]/
        }
      }
    }),
    summary(),
    filesize({
      showMinifiedSize: true,
      showGzippedSize: true
    })
  ],
  onwarn(warning, warn) {
    // Skip TypeScript warnings about interfaces and types
    if (warning.code === 'MISSING_EXPORT') return;
    if (warning.code === 'UNRESOLVED_IMPORT') return;
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.message.includes('Use of eval is strongly discouraged')) return;
    if (warning.message.includes('Interface declaration')) return;

    warn(warning);
  }
};
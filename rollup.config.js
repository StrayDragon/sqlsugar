import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from '@rollup/plugin-terser';
import summary from 'rollup-plugin-summary';
import filesize from 'rollup-plugin-filesize';

const isDevelopment = process.env.NODE_ENV !== 'production';

export default {
  input: {
    'jinja2-editor': './src/jinja2-editor/index.ts',
    'jinja2-webview': './src/jinja2-editor/jinja2-webview-integrated.ts'
  },
  output: [
    {
      dir: 'dist/jinja2-editor',
      format: 'es',
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
      assetFileNames: '[name]-[hash][extname]'
    }
  ],
  external: ['vscode', 'lit'],
  plugins: [
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
    // Skip certain warnings
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    if (warning.message.includes('Use of eval is strongly discouraged')) return;

    warn(warning);
  }
};
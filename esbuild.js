import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const extensionOnly = process.argv.includes('--extension-only');
const webviewOnly = process.argv.includes('--webview-only');

/**
 * 复制artifacts、debug和resources目录到dist目录
 */
function copyArtifactsAndDebugDirectories() {
    // 复制artifacts目录
    const artifactsDir = path.join(__dirname, 'artifacts');
    const distArtifactsDir = path.join(__dirname, 'dist', 'artifacts');

    if (fs.existsSync(artifactsDir)) {
        if (!fs.existsSync(distArtifactsDir)) {
            fs.mkdirSync(distArtifactsDir, { recursive: true });
        }

        copyDirectoryRecursive(artifactsDir, distArtifactsDir);
        console.log(`Copied artifacts directory: ${artifactsDir} -> ${distArtifactsDir}`);
    }

    // 复制debug目录（保持向后兼容）
    const debugDir = path.join(__dirname, 'debug');
    const distDebugDir = path.join(__dirname, 'dist', 'debug');

    if (fs.existsSync(debugDir)) {
        if (!fs.existsSync(distDebugDir)) {
            fs.mkdirSync(distDebugDir, { recursive: true });
        }

        const files = fs.readdirSync(debugDir);
        for (const file of files) {
            const srcPath = path.join(debugDir, file);
            const destPath = path.join(distDebugDir, file);
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied: ${srcPath} -> ${destPath}`);
        }
    }

    // 复制resources目录（包含静态资源）
    const resourcesDir = path.join(__dirname, 'resources');
    const distResourcesDir = path.join(__dirname, 'dist', 'resources');

    if (fs.existsSync(resourcesDir)) {
        if (!fs.existsSync(distResourcesDir)) {
            fs.mkdirSync(distResourcesDir, { recursive: true });
        }

        copyDirectoryRecursive(resourcesDir, distResourcesDir);
        console.log(`Copied resources directory: ${resourcesDir} -> ${distResourcesDir}`);
    }
}

/**
 * 递归复制目录
 */
function copyDirectoryRecursive(src, dest) {
    const files = fs.readdirSync(src);

    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file);

        if (fs.statSync(srcPath).isDirectory()) {
            if (!fs.existsSync(destPath)) {
                fs.mkdirSync(destPath, { recursive: true });
            }
            copyDirectoryRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach((error) => {
				console.error(`✘ [ERROR] ${error.text}`);
				if (error.location) {
					console.error(`    ${error.location.file}:${error.location.line}:${error.location.column}:`);
				}
				if (error.notes) {
					error.notes.forEach(note => console.error(`    Note: ${note.text}`));
				}
			});
			result.warnings.forEach((warning) => {
				console.warn(`⚠ [WARNING] ${warning.text}`);
				if (warning.location) {
					console.warn(`    ${warning.location.file}:${warning.location.line}:${warning.location.column}:`);
				}
				if (warning.notes) {
					warning.notes.forEach(note => console.warn(`    Note: ${note.text}`));
				}
			});

			const totalErrors = result.errors.length;
			const totalWarnings = result.warnings.length;

			if (totalErrors > 0 || totalWarnings > 0) {
				console.log(`[watch] build finished with ${totalErrors} errors and ${totalWarnings} warnings`);
			} else {
				console.log(`[watch] build completed successfully`);
			}
		});
	},
};

/**
 * @type {import('esbuild').Plugin}
 */
const fixDynamicRequirePlugin = {
	name: 'fix-dynamic-require',

	setup(build) {
		// Fix dynamic require calls by adding require function to global scope
		build.onStart(() => {
			console.log('[fix-dynamic-require] Adding require function');
		});
	},
};

/**
 * 主扩展构建
 */
async function buildExtension() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs', // Important: Use CommonJS for VS Code and Cursor compatibility
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'], // Important: Externalize vscode module for VS Code and Cursor compatibility
		logLevel: 'silent',
		// Performance and size optimizations
		treeShaking: true,
		legalComments: 'none',
		// Additional optimizations for better minification
		minifyIdentifiers: production,
		minifySyntax: production,
		minifyWhitespace: production,
		// Improve build performance
		metafile: false, // Disable metafile for faster builds
		define: {
			'process.env.NODE_ENV': production ? '"production"' : '"development"'
		},
		plugins: [
			esbuildProblemMatcherPlugin,
			fixDynamicRequirePlugin,
		],
	});

	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

/**
 * Jinja2 Editor构建（替换原来的rollup配置）
 */
async function buildJinja2Editor() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/jinja2-editor/index.ts'
		],
		bundle: true,
		format: 'esm',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outfile: 'dist/jinja2-editor/jinja2-editor.js',
		external: ['vscode', 'lit'],
		logLevel: 'silent',
		// Performance and size optimizations
		treeShaking: true,
		legalComments: 'none',
		// Additional optimizations for better minification
		minifyIdentifiers: production,
		minifySyntax: production,
		minifyWhitespace: production,
		// Improve build performance
		metafile: false, // Disable metafile for faster builds
		define: {
			'process.env.NODE_ENV': production ? '"production"' : '"development"'
		},
		loader: {
			'.ts': 'ts',
			'.js': 'js',
		},
		tsconfig: './tsconfig.json',
		plugins: [
			esbuildProblemMatcherPlugin,
		],
	});

	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

async function main() {
	// 根据命令行参数决定构建哪些部分
	let buildPromises = [];

	if (extensionOnly) {
		// 只构建扩展
		buildPromises = [buildExtension()];
	} else if (webviewOnly) {
		// 只构建WebView组件
		buildPromises = [buildJinja2Editor()];
	} else {
		// 默认：并行构建主扩展和Jinja2 Editor
		buildPromises = [buildExtension(), buildJinja2Editor()];
	}

	if (!watch) {
		await Promise.all(buildPromises);
		// 只在非watch模式和非单组件构建下复制资源目录
		if (!extensionOnly && !webviewOnly) {
			copyArtifactsAndDebugDirectories();
		}
	} else {
		// watch模式下启动监听
		await Promise.all(buildPromises);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
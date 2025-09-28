import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

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
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
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
	// 并行构建主扩展和Jinja2 Editor
	const buildPromises = [
		buildExtension(),
		buildJinja2Editor()
	];

	if (!watch) {
		await Promise.all(buildPromises);
		// 只在非watch模式下复制资源目录
		copyArtifactsAndDebugDirectories();
	} else {
		// watch模式下启动监听
		await Promise.all(buildPromises);
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
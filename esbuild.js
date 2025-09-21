const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * 复制artifacts和debug目录到dist目录
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

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
		// 复制artifacts和debug目录到dist目录
		copyArtifactsAndDebugDirectories();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});

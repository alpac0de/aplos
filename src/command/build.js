import { rspack } from "@rspack/core";
import {buildRouter}  from "../build/router.js";
import get_config from '../build/config.js';
import ssg from '../build/ssg.js';
import { createRspackConfig } from '../build/rspack-config.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

const showBundleAnalysis = (projectDirectory, outDir = 'dist') => {
    const distPath = path.join(projectDirectory, outDir);
    
    if (!fs.existsSync(distPath)) {
        console.log('❌ Dist folder not found');
        return;
    }
    
    const files = fs.readdirSync(distPath)
        .filter(file => file.endsWith('.js') && !file.endsWith('.map'))
        .map(file => {
            const filePath = path.join(distPath, file);
            const stats = fs.statSync(filePath);
            return {
                name: file,
                size: stats.size,
                sizeKB: Math.round(stats.size / 1024),
            };
        })
        .sort((a, b) => b.size - a.size);
    
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalKB = Math.round(totalSize / 1024);
    
    console.log('\n📊 Bundle Analysis:');
    console.log('┌─────────────────────────────────┬─────────┐');
    console.log('│ File                            │ Size    │');
    console.log('├─────────────────────────────────┼─────────┤');
    
    files.forEach(file => {
        const nameField = file.name.padEnd(31);
        const sizeField = `${file.sizeKB}KB`.padStart(7);
        console.log(`│ ${nameField} │ ${sizeField} │`);
    });
    
    console.log('├─────────────────────────────────┼─────────┤');
    const totalField = `${totalKB}KB`.padStart(7);
    console.log(`│ TOTAL                           │ ${totalField} │`);
    console.log('└─────────────────────────────────┴─────────┘');
    
    // Performance tips
    if (totalKB > 500) {
        console.log('⚠️  Bundle size is large. Consider code splitting or removing unused dependencies.');
    } else if (totalKB < 200) {
        console.log('✅ Great bundle size! Your app will load fast.');
    } else {
        console.log('👍 Good bundle size for most applications.');
    }
};

export default async (options) => {
    let projectDirectory = process.cwd();
    let runtime_dir = __dirname + "/..";

    // Output directory precedence: explicit --out-dir wins, then $APLOS_OUT_DIR,
    // then the `dist` default.
    const outDir = options.outDir || process.env.APLOS_OUT_DIR || "dist";

    const buildStart = performance.now();
    await buildRouter(await get_config(projectDirectory));

    // The build runs rspack in-process, not through the CLI in a subprocess. That
    // gives us the exit-code decision, the stats, and compiler.close() (which
    // flushes the persistent cache) directly, instead of parsing stdout and reading
    // a close code across a process boundary. It also removes the APLOS_MODE /
    // APLOS_OUT_DIR env vars, which only existed to cross that boundary: the config
    // now takes them as arguments.
    const config = await createRspackConfig({
        mode: options.mode,
        outDir,
        entry: [runtime_dir + "/runtime/app.jsx"],
        projectDirectory,
    });

    const stats = await runRspack(config);

    // A failed bundle must fail the build: otherwise `bun run build` reports success
    // and a deploy happily serves an empty output directory.
    if (!stats || stats.hasErrors()) {
        const { errors } = stats
            ? stats.toJson({ errors: true, all: false })
            : { errors: [{ message: "rspack did not produce any stats" }] };

        console.error("\n  Build failed.\n");
        for (const error of errors.slice(0, 5)) {
            console.error(error.message || error);
        }
        if (errors.length > 5) {
            console.error(`  ...and ${errors.length - 5} more error(s).`);
        }
        process.exitCode = 1;
        return;
    }

    // Warnings are printed but do not fail the build.
    if (stats.hasWarnings()) {
        const { warnings } = stats.toJson({ warnings: true, all: false });
        for (const warning of warnings.slice(0, 5)) {
            console.warn(warning.message || warning);
        }
    }

    const totalTime = Math.round(performance.now() - buildStart);
    console.log(`\n  Built in ${totalTime}ms`);

    if (options.mode === 'production' || process.env.NODE_ENV === 'production') {
        showBundleAnalysis(projectDirectory, outDir);
    }

    try {
        await ssg({ mode: options.mode, forceAll: options.static, outDir });
    } catch (err) {
        console.error(`SSG failed: ${err.message}`);
        process.exitCode = 1;
    }
};

// Runs one rspack compilation to completion and closes the compiler.
//
// close() is not optional: it is what flushes the persistent cache to disk, so
// skipping it turns "persistent cache" into "cache that never persists". It runs
// on both the success and failure paths.
function runRspack(config) {
    return new Promise((resolve) => {
        const compiler = rspack(config);

        compiler.run((runError, stats) => {
            compiler.close((closeError) => {
                if (runError) {
                    console.error(runError.message || runError);
                    resolve(null);
                    return;
                }
                // A close() failure is a build failure: close() is what flushes the
                // persistent cache, so a silent failure here means the cache never
                // persisted while the build still reported success.
                if (closeError) {
                    console.error(closeError.message || closeError);
                    resolve(null);
                    return;
                }
                resolve(stats);
            });
        });
    });
}
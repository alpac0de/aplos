import {spawn} from "child_process";
import {buildRouter}  from "../build/router.js";
import get_config from '../build/config.js';
import ssg from '../build/ssg.js';
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
    let node_modules = projectDirectory + "/node_modules";

    // Output directory precedence: explicit --out-dir wins, then $APLOS_OUT_DIR,
    // then the `dist` default. The resolved value is forwarded to the rspack
    // sub-process (which reads APLOS_OUT_DIR) and to SSG / bundle analysis.
    const outDir = options.outDir || process.env.APLOS_OUT_DIR || "dist";

    const buildStart = performance.now();
    await buildRouter(await get_config(projectDirectory));

    const rspack = spawn(node_modules + "/.bin/rspack", [
        "--mode=" + options.mode,
        "--config", runtime_dir + "/../rspack.config.js",
        "--entry", runtime_dir + "/runtime/app.jsx"
    ], {
        env: { ...process.env, APLOS_OUT_DIR: outDir, APLOS_MODE: options.mode },
    });

    rspack.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    rspack.stderr.on('data', (data) => {
        console.log(`stderr: ${data.toString()}`);
    });

    // A failed bundle must fail the build: without an exit code, `bun run build`
    // reports success and a deploy happily serves an empty output directory. A
    // process killed by a signal (`SIGKILL` from the OOM killer, typically) reports
    // a null code and names the signal instead, so neither can be read alone.
    rspack.on('close', async (code, signal) => {
        if (code !== 0 || signal !== null) {
            console.log(
                signal !== null
                    ? `error: Process killed by ${signal} (out of memory?)`
                    : `error: Process exited with code ${code}`,
            );
            process.exitCode = 1;

            return;
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
    });
};
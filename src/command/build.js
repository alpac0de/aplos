import {spawn} from "child_process";
import {buildRouter}  from "../build/router.js";
import get_config from '../build/config.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

const showBundleAnalysis = (projectDirectory) => {
    const distPath = path.join(projectDirectory, 'public', 'dist');
    
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

    const buildStart = performance.now();
    await buildRouter(await get_config(projectDirectory));

    const rspack = spawn(node_modules + "/.bin/rspack", [
        "--mode=" + options.mode,
        "--config", runtime_dir + "/../rspack.config.js",
        "--entry", projectDirectory + "/.aplos/cache/app.js"
    ]);

    rspack.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    rspack.stderr.on('data', (data) => {
        console.log(`stderr: ${data.toString()}`);
    });

    rspack.on('close', (code) => {
        if (code !== 0) {
            console.log(`error: Process exited with code ${code}`);
        } else {
            const totalTime = Math.round(performance.now() - buildStart);
            console.log(`\n  Built in ${totalTime}ms`);

            // Show build analysis in production
            if (options.mode === 'production' || process.env.NODE_ENV === 'production') {
                showBundleAnalysis(projectDirectory);
            }
        }
    });
};
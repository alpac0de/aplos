import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { pathToFileURL, fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SSR_ENTRY = path.resolve(__dirname, '../runtime/ssr-entry.jsx');
const SSR_BUNDLE_NAME = 'ssr-bundle.cjs';

function outputHtmlPath(distDir, routePath) {
    if (routePath === '/' || routePath === '') {
        return path.join(distDir, 'index.html');
    }
    const trimmed = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
    return path.join(distDir, `${trimmed}.html`);
}

async function buildSSRBundle(projectDirectory, frameworkDirectory, mode) {
    const ssrConfigPath = path.resolve(frameworkDirectory, 'rspack.ssr.config.js');
    const rspackBin = path.join(projectDirectory, 'node_modules', '.bin', 'rspack');

    return new Promise((resolve, reject) => {
        const child = spawn(rspackBin, [
            '--mode=' + mode,
            '--config', ssrConfigPath,
            '--entry', SSR_ENTRY,
        ], {
            env: { ...process.env, APLOS_SSR: '1' },
        });

        let stderr = '';
        child.stdout.on('data', (d) => process.stdout.write(d));
        child.stderr.on('data', (d) => {
            stderr += d.toString();
            process.stderr.write(d);
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`SSR bundle failed (exit ${code}): ${stderr}`));
            } else {
                resolve();
            }
        });
    });
}

export default async function ssg({ mode }) {
    const projectDirectory = process.cwd();
    const frameworkDirectory = path.resolve(__dirname, '../..');
    const distDir = path.join(projectDirectory, 'public', 'dist');
    const cacheDir = path.join(projectDirectory, '.aplos', 'cache');

    const indexHtmlPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
        throw new Error(`SSG: ${indexHtmlPath} not found — run the client build first.`);
    }

    console.log('\n  Building SSR bundle...');
    await buildSSRBundle(projectDirectory, frameworkDirectory, mode || 'production');

    const ssrBundlePath = path.join(cacheDir, SSR_BUNDLE_NAME);
    if (!fs.existsSync(ssrBundlePath)) {
        throw new Error(`SSG: SSR bundle not produced at ${ssrBundlePath}.`);
    }

    const ssrMod = await import(pathToFileURL(ssrBundlePath).href);
    const render = ssrMod.render || ssrMod.default?.render;
    const getStaticRoutes = ssrMod.getStaticRoutes || ssrMod.default?.getStaticRoutes;
    if (typeof render !== 'function' || typeof getStaticRoutes !== 'function') {
        throw new Error('SSG: SSR bundle must export render(url) and getStaticRoutes().');
    }

    const staticRoutes = getStaticRoutes();
    if (staticRoutes.length === 0) {
        console.log('  No static routes to pre-render.');
        return;
    }

    const template = fs.readFileSync(indexHtmlPath, 'utf-8');
    const rootMarker = /<div id="root">\s*<\/div>/;
    if (!rootMarker.test(template)) {
        throw new Error('SSG: could not find <div id="root"></div> in index.html template.');
    }

    console.log(`  Pre-rendering ${staticRoutes.length} route(s)...`);
    let rendered = 0;
    for (const route of staticRoutes) {
        try {
            const html = render(route);
            const page = template.replace(rootMarker, `<div id="root">${html}</div>`);
            const outPath = outputHtmlPath(distDir, route);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, page, 'utf-8');
            console.log(`    ✓ ${route} → ${path.relative(projectDirectory, outPath)}`);
            rendered++;
        } catch (err) {
            console.error(`    ✗ ${route}: ${err.message}`);
        }
    }
    console.log(`  Pre-rendered ${rendered}/${staticRoutes.length} route(s).`);
}

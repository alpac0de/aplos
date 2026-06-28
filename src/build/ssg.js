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

export default async function ssg({ mode, forceAll = false, outDir } = {}) {
    const projectDirectory = process.cwd();
    const frameworkDirectory = path.resolve(__dirname, '../..');
    const distDir = path.join(projectDirectory, outDir || process.env.APLOS_OUT_DIR || 'dist');
    const cacheDir = path.join(projectDirectory, '.aplos', 'cache');

    const indexHtmlPath = path.join(distDir, 'index.html');
    if (!fs.existsSync(indexHtmlPath)) {
        throw new Error(`SSG: ${indexHtmlPath} not found — run the client build first.`);
    }

    // Skip the expensive SSR bundle build if no page opted in and --static wasn't passed.
    if (!forceAll) {
        const routesPath = path.join(cacheDir, 'routes.js');
        if (!fs.existsSync(routesPath)) {
            return;
        }
        const source = fs.readFileSync(routesPath, 'utf-8');
        if (!/static:\s*true/.test(source)) {
            return;
        }
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
    const getRouteMeta = ssrMod.getRouteMeta || ssrMod.default?.getRouteMeta;
    if (typeof render !== 'function' || typeof getStaticRoutes !== 'function') {
        throw new Error('SSG: SSR bundle must export render(url) and getStaticRoutes().');
    }

    const staticRoutes = getStaticRoutes({ forceAll });
    if (staticRoutes.length === 0) {
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
            const meta = typeof getRouteMeta === 'function' ? getRouteMeta(route) : null;
            let page = template.replace(rootMarker, `<div id="root">${html}</div>`);
            if (meta) {
                page = injectMetaTags(page, meta);
            }
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

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function metaTag(attrs) {
    const parts = Object.entries(attrs)
        .filter(([, v]) => v !== undefined && v !== null && v !== false)
        .map(([k, v]) => `${k}="${escapeHtml(v)}"`);
    return `<meta ${parts.join(' ')}>`;
}

function buildMetaHtml(meta) {
    const tags = [];
    if (meta.title) {
        tags.push(`<title>${escapeHtml(meta.title)}</title>`);
    }
    if (meta.description) {
        tags.push(metaTag({ name: 'description', content: meta.description }));
    }
    if (meta.canonical) {
        tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}">`);
    }
    if (Array.isArray(meta.keywords) && meta.keywords.length > 0) {
        tags.push(metaTag({ name: 'keywords', content: meta.keywords.join(', ') }));
    }
    if (meta.og && typeof meta.og === 'object') {
        for (const [key, value] of Object.entries(meta.og)) {
            tags.push(metaTag({ property: `og:${key}`, content: value }));
        }
    }
    if (meta.twitter && typeof meta.twitter === 'object') {
        for (const [key, value] of Object.entries(meta.twitter)) {
            tags.push(metaTag({ name: `twitter:${key}`, content: value }));
        }
    }
    if (Array.isArray(meta.meta)) {
        for (const entry of meta.meta) {
            if (entry && typeof entry === 'object') {
                tags.push(metaTag(entry));
            }
        }
    }
    if (Array.isArray(meta.link)) {
        for (const entry of meta.link) {
            if (entry && typeof entry === 'object') {
                const parts = Object.entries(entry)
                    .filter(([, v]) => v !== undefined && v !== null && v !== false)
                    .map(([k, v]) => `${k}="${escapeHtml(v)}"`);
                tags.push(`<link ${parts.join(' ')}>`);
            }
        }
    }
    return tags.join('\n    ');
}

export function injectMetaTags(html, meta) {
    const block = buildMetaHtml(meta);
    if (!block) {
        return html;
    }
    const titleMatch = block.match(/<title>[\s\S]*?<\/title>/);
    if (titleMatch) {
        if (/<title>[\s\S]*?<\/title>/.test(html)) {
            html = html.replace(/<title>[\s\S]*?<\/title>/, titleMatch[0]);
        } else {
            html = html.replace('</head>', `    ${titleMatch[0]}\n  </head>`);
        }
    }
    const remaining = block.replace(/<title>[\s\S]*?<\/title>\s*/, '');
    if (remaining) {
        html = html.replace('</head>', `    ${remaining}\n  </head>`);
    }
    return html;
}

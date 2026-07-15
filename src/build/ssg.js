import fs from 'fs';
import path from 'path';
import { rspack } from '@rspack/core';
import { pathToFileURL, fileURLToPath } from 'url';
import { createSSRConfig } from './ssr-config.js';
import { toHeadElements, renderHead } from './head.js';

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

async function buildSSRBundle(mode) {
    // In-process, like the client build: the config comes from a function call
    // rather than a --config flag, and compiler.close() flushes the persistent
    // cache. The APLOS_SSR env var the old spawn set was never read anywhere.
    const config = await createSSRConfig({ mode, entry: SSR_ENTRY });

    const stats = await new Promise((resolve) => {
        const compiler = rspack(config);
        compiler.run((runError, runStats) => {
            compiler.close((closeError) => {
                if (runError) {
                    console.error(runError.message || runError);
                    resolve(null);
                } else if (closeError) {
                    console.error(closeError.message || closeError);
                    resolve(null);
                } else {
                    resolve(runStats);
                }
            });
        });
    });

    if (!stats || stats.hasErrors()) {
        const detail = stats
            ? stats.toJson({ errors: true, all: false }).errors.map((e) => e.message || e).join('\n')
            : 'rspack did not produce any stats';
        throw new Error(`SSR bundle failed:\n${detail}`);
    }
}

export default async function ssg({ mode, forceAll = false, outDir } = {}) {
    const projectDirectory = process.cwd();
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
    await buildSSRBundle(mode || 'production');

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

/**
 * Layers a route's meta over the head already present in the document.
 *
 * The template arrives with the global head config already injected by the build,
 * so a route's title and description must REPLACE their global counterparts, not
 * queue up behind them: appending sent two <title> and two meta descriptions to
 * crawlers. Tags are parsed back into descriptors, merged by identity, and the
 * head is rewritten once through the shared serializer.
 *
 * Anchoring is on the LAST `</head>`, matching the build plugin. The old code
 * replaced the FIRST one, which lands the tags inside an inline script that
 * merely contains the literal, and drops them from the head entirely.
 */
export function injectMetaTags(html, meta) {
    const routeElements = toHeadElements(meta || {});
    if (routeElements.length === 0) {
        return html;
    }

    // Anchor on the LAST `</head>`, as the build plugin does. Replacing the first
    // one lands the tags inside an inline script that merely contains the literal.
    const closeIndex = html.lastIndexOf('</head>');
    if (closeIndex === -1) {
        return html;
    }

    // Only the tags this route actually overrides are removed. The rest of the
    // head is left byte for byte: re-serializing it would mean parsing inline
    // scripts and stylesheets back out of markup, which is how this file grew a
    // bug in the first place.
    let head = html.slice(0, closeIndex);
    const tail = html.slice(closeIndex);

    for (const element of routeElements) {
        head = removeTag(head, element);
    }

    return `${head}${renderHead(routeElements)}\n  ${tail}`;
}

/**
 * Strips the tag a route element is about to replace, so the page's title and
 * description supersede the global ones instead of queueing up behind them.
 * Appending sent two <title> and two meta descriptions to crawlers.
 *
 * Only self-identifying tags are matched: a title, a named or property meta, a
 * canonical link. Anything else accumulates, which is the correct behaviour for
 * stylesheets, preloads and scripts.
 */
function removeTag(head, element) {
    const { tag, attrs = {} } = element;

    let pattern;

    // The patterns match the tag alone. Leading whitespace is deliberately left
    // out: masked-out regions are blanked to spaces of the same length, so a
    // pattern that could start on whitespace would anchor inside one of them.
    if (tag === 'title') {
        pattern = /<title>[\s\S]*?<\/title>/i;
    } else if (tag === 'meta') {
        const name = attrs.name || attrs.property;
        if (!name) return head;

        const key = attrs.name ? 'name' : 'property';
        // The attribute may be quoted either way and carry others alongside it.
        pattern = new RegExp(
            `<meta[^>]*\\b${key}=["']${escapeForRegExp(name)}["'][^>]*>`,
            'i',
        );
    } else if (tag === 'link' && attrs.rel === 'canonical') {
        pattern = /<link[^>]*\brel=["']canonical["'][^>]*>/i;
    } else {
        return head;
    }

    return replaceOutsideInertRegions(head, pattern);
}

/**
 * Applies a replacement only to live markup.
 *
 * A tag pattern will happily match inside an HTML comment or a script body, where
 * the text merely looks like markup. Stripping the "tag" there leaves the real one
 * in place (so the page ships two descriptions) and corrupts the comment or the
 * script. Inert regions are masked out before the match and restored after.
 */
function replaceOutsideInertRegions(html, pattern) {
    const inert = [];
    const masked = html.replace(
        /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>/gi,
        (region) => {
            const token = ` ${inert.length} `;
            inert.push(region);
            return token.padEnd(region.length, ' ').slice(0, region.length);
        },
    );

    const match = pattern.exec(masked);
    if (!match) return html;

    // The mask preserves offsets, so the index maps straight back onto the source.
    let start = match.index;
    let end = start + match[0].length;

    // Take the tag's own indentation and trailing newline with it, so removing a
    // tag does not leave a blank line where it stood.
    while (start > 0 && (html[start - 1] === ' ' || html[start - 1] === '\t')) start--;
    if (html[end] === '\n') end++;

    return html.slice(0, start) + html.slice(end);
}

function escapeForRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

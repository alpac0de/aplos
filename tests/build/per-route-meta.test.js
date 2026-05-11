import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { buildRouter } from '../../src/build/router.js';
import fs from 'fs/promises';
import path from 'path';

describe('per-route meta for dynamic paths', () => {
    const testProjectDir = '/tmp/aplos-per-route-meta-test';
    const cacheDir = path.join(testProjectDir, '.aplos', 'cache');

    beforeAll(async () => {
        const pagesDir = path.join(testProjectDir, 'src', 'pages');
        await fs.mkdir(path.join(pagesDir, 'documentation'), { recursive: true });

        await fs.writeFile(
            path.join(pagesDir, 'documentation', '[...path].tsx'),
            `"use static";
export const meta = (url, params) => ({ title: 'Doc ' + params.path, canonical: 'https://x.test' + url });
export default () => null;
`
        );
    });

    afterAll(async () => {
        await fs.rm(testProjectDir, { recursive: true, force: true });
    });

    test('inline meta on a paths entry is serialized into routes.js', async () => {
        const originalCwd = process.cwd;
        process.cwd = () => testProjectDir;
        try {
            await buildRouter({
                routes: [
                    {
                        source: '/documentation/[...path]',
                        paths: [
                            { path: '/documentation/intro', meta: { title: 'Intro' } },
                            '/documentation/quickstart',
                        ],
                    },
                ],
            });

            const routesContent = await fs.readFile(path.join(cacheDir, 'routes.js'), 'utf-8');

            // Inline meta is emitted as JSON next to the concrete path.
            expect(routesContent).toContain('"/documentation/intro"');
            expect(routesContent).toContain('"title":"Intro"');

            // The string-only path falls back to the component-level meta alias.
            expect(routesContent).toContain('"/documentation/quickstart"');
            expect(routesContent).toMatch(/meta: DocumentationPath__meta,[\s\S]*?path: "\/documentation\/quickstart"/);

            // sourcePath is preserved on expanded nodes so runtime can extract params.
            expect(routesContent).toContain('sourcePath: "/documentation/[...path]"');
        } finally {
            process.cwd = originalCwd;
        }
    });

    test('inline meta has precedence over component-level meta', async () => {
        const routesContent = await fs.readFile(path.join(cacheDir, 'routes.js'), 'utf-8');
        // Find the block containing the intro path, walking back to its opening "{".
        const introIdx = routesContent.indexOf('"/documentation/intro"');
        expect(introIdx).toBeGreaterThan(-1);
        const blockStart = routesContent.lastIndexOf('{', introIdx);
        const blockEnd = routesContent.indexOf('}', introIdx);
        const introBlock = routesContent.slice(blockStart, blockEnd + 1);

        expect(introBlock).toContain('"title":"Intro"');
        expect(introBlock).not.toContain('DocumentationPath__meta');
    });

    test('pages.js still re-exports a single __meta per component', async () => {
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
        const occurrences = pagesContent.match(/export const DocumentationPath__meta = /g) || [];
        expect(occurrences.length).toBe(1);
    });
});

describe('getRouteMeta param extraction', () => {
    // The function lives inside ssr-entry.jsx and is exercised end-to-end by
    // the SSG bundle. We re-implement the same param extractor here to lock
    // its contract, then test the wired routes.js as a smoke test above.
    function extractParams(sourcePath, url) {
        if (!sourcePath) return {};
        const sourceSegments = sourcePath.split('/').filter(Boolean);
        const urlSegments = url.split('/').filter(Boolean);
        const params = {};
        for (let i = 0; i < sourceSegments.length; i++) {
            const seg = sourceSegments[i];
            const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
            if (catchAll) {
                params[catchAll[1]] = urlSegments.slice(i).join('/');
                return params;
            }
            const dynamic = seg.match(/^\[(.+)\]$/);
            if (dynamic) {
                params[dynamic[1]] = urlSegments[i];
            }
        }
        return params;
    }

    test('extracts catch-all rest as joined slash path', () => {
        expect(extractParams('/documentation/[...path]', '/documentation/api/meta'))
            .toEqual({ path: 'api/meta' });
    });

    test('extracts single dynamic param', () => {
        expect(extractParams('/blog/[id]', '/blog/42')).toEqual({ id: '42' });
    });

    test('extracts mixed dynamic + catch-all', () => {
        expect(extractParams('/app/[tenant]/docs/[...rest]', '/app/acme/docs/a/b'))
            .toEqual({ tenant: 'acme', rest: 'a/b' });
    });

    test('returns empty object when no source path', () => {
        expect(extractParams(null, '/whatever')).toEqual({});
    });
});

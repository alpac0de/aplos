import { describe, test, expect, afterEach } from 'bun:test';
import { buildRouter } from '../../src/build/router.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const dirs = [];

const PAGE = 'export default () => null';
const STATIC_PAGE = '"use static"\nexport default () => null';

async function scaffold(files) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-router-result-'));
    dirs.push(dir);

    for (const [file, contents] of Object.entries(files)) {
        const target = path.join(dir, 'src', 'pages', file);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, contents, 'utf-8');
    }

    return dir;
}

async function build(dir, config = { routes: [] }) {
    const original = process.cwd;
    process.cwd = () => dir;
    try {
        return await buildRouter(config);
    } finally {
        process.cwd = original;
    }
}

afterEach(async () => {
    while (dirs.length) {
        await fs.rm(dirs.pop(), { recursive: true, force: true });
    }
});

// Everything a caller knows about routes today, it knows by reading the
// generated cache files back off disk and parsing them. `buildRouter` held that
// information in memory and dropped it. Returning it is what lets a consumer
// (a sitemap generator, `router:debug`) work from data instead of re-deriving.
describe('buildRouter returns the routes it produced', () => {
    test('returns one entry per page', async () => {
        const dir = await scaffold({ 'index.jsx': PAGE, 'about.jsx': PAGE });

        const { routes } = await build(dir);

        expect(routes.map((r) => r.path).sort()).toEqual(['/', '/about']);
    });

    test('each entry carries its component and source file', async () => {
        const dir = await scaffold({ 'index.jsx': PAGE });

        const { routes } = await build(dir);

        expect(routes[0].component).toBe('Index');
        expect(routes[0].file).toBe('/index.jsx');
    });

    test('a "use static" page is reported as static', async () => {
        const dir = await scaffold({ 'index.jsx': PAGE, 'about.jsx': STATIC_PAGE });

        const { routes } = await build(dir);

        const byPath = Object.fromEntries(routes.map((r) => [r.path, r]));
        expect(byPath['/about'].static).toBe(true);
        expect(byPath['/'].static).toBe(false);
    });

    test('static is always a boolean, never undefined', async () => {
        const dir = await scaffold({ 'index.jsx': PAGE });

        const { routes } = await build(dir);

        expect(typeof routes[0].static).toBe('boolean');
    });

    // A sitemap needs the concrete URLs, not the catch-all pattern they came
    // from, and it needs to tell the two apart.
    test('routes expanded from a catch-all name the source they came from', async () => {
        const dir = await scaffold({
            'index.jsx': PAGE,
            'blog/[...slug].jsx': PAGE,
        });

        const { routes } = await build(dir, {
            routes: [{ source: '/blog/[...slug]', paths: ['/blog/a', '/blog/b'] }],
        });

        const expanded = routes.filter((r) => r.sourcePath !== null);
        expect(expanded.map((r) => r.path).sort()).toEqual(['/blog/a', '/blog/b']);
        expect(expanded.every((r) => r.sourcePath === '/blog/[...slug]')).toBe(true);
        // They are pre-rendered, so a sitemap should list them.
        expect(expanded.every((r) => r.static)).toBe(true);
    });

    test('a page declared on disk has no sourcePath', async () => {
        const dir = await scaffold({ 'index.jsx': PAGE });

        const { routes } = await build(dir);

        expect(routes[0].sourcePath).toBeNull();
    });

    test('expanded routes reuse the catch-all component', async () => {
        const dir = await scaffold({
            'index.jsx': PAGE,
            'blog/[...slug].jsx': PAGE,
        });

        const { routes } = await build(dir, {
            routes: [{ source: '/blog/[...slug]', paths: ['/blog/a'] }],
        });

        const expanded = routes.find((r) => r.path === '/blog/a');
        const catchAll = routes.find((r) => r.path === '/blog/*');
        expect(expanded.component).toBe(catchAll.component);
    });

    // The returned records must not be the live objects the tree builder mutates,
    // or their internal shape becomes part of the contract.
    test('mutating the result does not corrupt a later build', async () => {
        const dir = await scaffold({ 'index.jsx': PAGE });

        const first = await build(dir);
        first.routes[0].path = '/mutated';
        first.routes.push({ path: '/injected' });

        const second = await build(dir);

        expect(second.routes.map((r) => r.path)).toEqual(['/']);
    });
});

import { describe, test, expect, afterEach } from 'bun:test';
import { buildRouter } from '../../src/build/router.js';
import { redirect, isRedirect } from '../../src/runtime/redirect.js';
import fs from 'fs/promises';
import path from 'path';

async function scaffold(dir) {
    const pagesDir = path.join(dir, 'src', 'pages');
    await fs.mkdir(pagesDir, { recursive: true });
    await fs.writeFile(path.join(pagesDir, 'index.tsx'), 'export default () => null');
    return pagesDir;
}

async function withCwd(dir, fn) {
    const original = process.cwd;
    process.cwd = () => dir;
    try {
        return await fn();
    } finally {
        process.cwd = original;
    }
}

describe('redirect() helper', () => {
    test('builds a redirect sentinel, replace defaults to true', () => {
        const r = redirect('/login');
        expect(isRedirect(r)).toBe(true);
        expect(r.to).toBe('/login');
        expect(r.replace).toBe(true);
    });

    test('replace: false produces a push redirect', () => {
        expect(redirect('/x', { replace: false }).replace).toBe(false);
    });

    test('rejects an empty or non-string destination', () => {
        expect(() => redirect('')).toThrow(TypeError);
        expect(() => redirect(42)).toThrow(TypeError);
    });

    test('isRedirect is false for plain values', () => {
        expect(isRedirect(undefined)).toBe(false);
        expect(isRedirect(null)).toBe(false);
        expect(isRedirect({ to: '/x' })).toBe(false);
    });
});

describe('buildRouter middleware cache generation', () => {
    const dirs = [];

    afterEach(async () => {
        while (dirs.length) {
            await fs.rm(dirs.pop(), { recursive: true, force: true });
        }
    });

    test('falls back to the no-op middleware when src/middleware is absent', async () => {
        const dir = '/tmp/aplos-mw-absent';
        dirs.push(dir);
        await scaffold(dir);

        await withCwd(dir, () => buildRouter({ routes: [] }));

        const content = await fs.readFile(
            path.join(dir, '.aplos', 'cache', 'middleware.js'),
            'utf-8',
        );
        expect(content).toContain('aplos/internal/default-middleware');
    });

    test('re-exports the project middleware when src/middleware.tsx exists', async () => {
        const dir = '/tmp/aplos-mw-present';
        dirs.push(dir);
        await scaffold(dir);
        await fs.writeFile(
            path.join(dir, 'src', 'middleware.tsx'),
            'export default () => undefined',
        );

        await withCwd(dir, () => buildRouter({ routes: [] }));

        const content = await fs.readFile(
            path.join(dir, '.aplos', 'cache', 'middleware.js'),
            'utf-8',
        );
        expect(content).toContain('/src/middleware.tsx');
        expect(content).not.toContain('default-middleware');
    });

    test('src/middleware is not registered as a route', async () => {
        const dir = '/tmp/aplos-mw-not-route';
        dirs.push(dir);
        await scaffold(dir);
        await fs.writeFile(
            path.join(dir, 'src', 'middleware.ts'),
            'export default () => undefined',
        );

        await withCwd(dir, () => buildRouter({ routes: [] }));

        const router = JSON.parse(
            await fs.readFile(path.join(dir, '.aplos', 'cache', 'router.js'), 'utf-8'),
        );
        expect(router.some(r => String(r.path).includes('middleware'))).toBe(false);
    });
});

// MiddlewareGate skips all gate machinery when the project defines no
// middleware. That short-circuit hinges on a single invariant: the generated
// no-op cache is a *re-export* of the framework default, so the runtime's
// `userMiddleware` is reference-identical to `defaultMiddleware`. If the
// builder ever wrapped the default instead of re-exporting it, identity would
// break, `HAS_MIDDLEWARE` would be permanently true, and every app would
// silently pay the gate cost again. This test locks that invariant.
describe('no-op middleware preserves reference identity', () => {
    const dirs = [];

    afterEach(async () => {
        while (dirs.length) {
            await fs.rm(dirs.pop(), { recursive: true, force: true });
        }
    });

    test('generated no-op cache re-exports the identical default function', async () => {
        const dir = '/tmp/aplos-mw-identity';
        dirs.push(dir);
        await scaffold(dir);

        await withCwd(dir, () => buildRouter({ routes: [] }));

        const cachePath = path.join(dir, '.aplos', 'cache', 'middleware.js');
        const cache = await fs.readFile(cachePath, 'utf-8');

        // Sanity: the no-op cache must be a bare re-export, not a wrapper.
        expect(cache.trim()).toBe(
            'export { default } from "aplos/internal/default-middleware";',
        );

        // The `aplos/internal/default-middleware` specifier is an rspack alias
        // with no meaning under `bun test`. Rewrite it to the real source path
        // so the re-export resolves, exactly as the bundler alias would.
        const defaultMwPath = path.resolve(
            import.meta.dir,
            '../../src/runtime/default-middleware.js',
        );
        await fs.writeFile(
            cachePath,
            `export { default } from "${defaultMwPath}";\n`,
        );

        // `userMiddleware` resolves through the cache re-export;
        // `defaultMiddleware` is imported directly from source. Both must
        // resolve to the *same* module instance for identity to hold — so
        // neither import carries a cache-busting query (that would fork the
        // module and is exactly the bug this test would otherwise mask).
        const fromCache = (await import(cachePath)).default;
        const fromSource = (await import(defaultMwPath)).default;

        // The exact check HAS_MIDDLEWARE relies on: `userMiddleware !== default`
        // must be false when the project has no middleware.
        expect(fromCache).toBe(fromSource);
        expect(fromCache === fromSource).toBe(true);
    });
});

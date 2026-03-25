import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { formatPath, buildRouter } from '../../src/build/router.js';
import fs from 'fs/promises';
import path from 'path';

describe('formatPath', () => {
    test('removes brackets, underscores and dashes', () => {
        expect(formatPath('[slug]')).toBe('slug');
        expect(formatPath('my-page')).toBe('mypage');
        expect(formatPath('my_page')).toBe('mypage');
    });

    test('strips spread syntax from catch-all params', () => {
        expect(formatPath('[...slug]')).toBe('slug');
        expect(formatPath('[...path]')).toBe('path');
    });
});

describe('buildRouter with catch-all routes', () => {
    const testProjectDir = '/tmp/aplos-catchall-test';

    beforeAll(async () => {
        const pagesDir = path.join(testProjectDir, 'src', 'pages');
        await fs.mkdir(path.join(pagesDir, 'documentation'), { recursive: true });
        await fs.mkdir(path.join(pagesDir, 'blog'), { recursive: true });
        await fs.mkdir(path.join(pagesDir, 'app', '[tenant]', 'docs'), { recursive: true });

        // Static page
        await fs.writeFile(path.join(pagesDir, 'index.tsx'), 'export default () => null');
        // Catch-all route
        await fs.writeFile(path.join(pagesDir, 'documentation', '[...slug].tsx'), 'export default () => null');
        // Dynamic param route
        await fs.writeFile(path.join(pagesDir, 'blog', '[id].tsx'), 'export default () => null');
        // Mixed: dynamic param + catch-all
        await fs.writeFile(path.join(pagesDir, 'app', '[tenant]', 'docs', '[...rest].tsx'), 'export default () => null');
    });

    afterAll(async () => {
        await fs.rm(testProjectDir, { recursive: true, force: true });
    });

    test('generates correct paths and component names', async () => {
        const originalCwd = process.cwd;
        process.cwd = () => testProjectDir;

        try {
            await buildRouter({ routes: [] });

            const cacheDir = path.join(testProjectDir, '.aplos', 'cache');
            const router = JSON.parse(await fs.readFile(path.join(cacheDir, 'router.js'), 'utf-8'));

            // Static route
            const indexRoute = router.find(r => r.path === '/');
            expect(indexRoute).toBeDefined();
            expect(indexRoute.component).toBe('Index');

            // Catch-all route: path should use * wildcard
            const docsRoute = router.find(r => r.path === '/documentation/*');
            expect(docsRoute).toBeDefined();
            expect(docsRoute.component).toBe('DocumentationSlug');
            expect(docsRoute.path).not.toContain('...');

            // Dynamic param route: path should use :param
            const blogRoute = router.find(r => r.path === '/blog/:id');
            expect(blogRoute).toBeDefined();
            expect(blogRoute.component).toBe('BlogId');

            // Mixed route: dynamic param + catch-all
            const mixedRoute = router.find(r => r.path === '/app/:tenant/docs/*');
            expect(mixedRoute).toBeDefined();
            expect(mixedRoute.component).not.toContain('...');
        } finally {
            process.cwd = originalCwd;
        }
    });

    test('generates valid pages.js exports for catch-all', async () => {
        const cacheDir = path.join(testProjectDir, '.aplos', 'cache');
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');

        // Component name should not contain dots
        expect(pagesContent).not.toMatch(/export \{[^}]*\.\.\./);
        // Should export DocumentationSlug
        expect(pagesContent).toMatch(/DocumentationSlug/);
    });

    test('generates valid routes.js with wildcard path', async () => {
        const cacheDir = path.join(testProjectDir, '.aplos', 'cache');
        const routesContent = await fs.readFile(path.join(cacheDir, 'routes.js'), 'utf-8');

        // Should contain wildcard path, not :...slug
        expect(routesContent).toContain('"/documentation/*"');
        expect(routesContent).not.toContain('...slug');
    });
});

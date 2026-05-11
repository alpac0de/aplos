import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { buildRouter } from '../../src/build/router.js';
import fs from 'fs/promises';
import path from 'path';

describe('pages.js skips namespace import when no `meta` export', () => {
    const testProjectDir = '/tmp/aplos-meta-export-detection-test';
    const cacheDir = path.join(testProjectDir, '.aplos', 'cache');

    beforeAll(async () => {
        const pagesDir = path.join(testProjectDir, 'src', 'pages');
        await fs.mkdir(pagesDir, { recursive: true });

        await fs.writeFile(
            path.join(pagesDir, 'no-meta.tsx'),
            `export default function Page() { return null; }\n`
        );
        await fs.writeFile(
            path.join(pagesDir, 'with-const.tsx'),
            `export const meta = { title: 'X' };\nexport default function Page() { return null; }\n`
        );
        await fs.writeFile(
            path.join(pagesDir, 'with-fn.tsx'),
            `export function meta(url, params) { return { title: url }; }\nexport default function Page() { return null; }\n`
        );
        await fs.writeFile(
            path.join(pagesDir, 'with-named.tsx'),
            `const meta = { title: 'N' };\nexport { meta };\nexport default function Page() { return null; }\n`
        );
        await fs.writeFile(
            path.join(pagesDir, 'with-commented.tsx'),
            `// export const meta = { title: 'oops' };\nexport default function Page() { return null; }\n`
        );

        const originalCwd = process.cwd;
        process.cwd = () => testProjectDir;
        try {
            await buildRouter({ routes: [] });
        } finally {
            process.cwd = originalCwd;
        }
    });

    afterAll(async () => {
        await fs.rm(testProjectDir, { recursive: true, force: true });
    });

    test('emits direct `null` for a page without `meta`', async () => {
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
        expect(pagesContent).toContain('export const Nometa__meta = null;');
        expect(pagesContent).not.toContain('Nometa__module');
    });

    test('emits namespace import for `export const meta`', async () => {
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
        expect(pagesContent).toContain('import * as Withconst__module');
        expect(pagesContent).toContain('Withconst__meta = Withconst__module.meta || null');
    });

    test('emits namespace import for `export function meta`', async () => {
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
        expect(pagesContent).toContain('import * as Withfn__module');
    });

    test('emits namespace import for `export { meta }`', async () => {
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
        expect(pagesContent).toContain('import * as Withnamed__module');
    });

    test('ignores `meta` inside a line comment', async () => {
        const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
        expect(pagesContent).toContain('export const Withcommented__meta = null;');
        expect(pagesContent).not.toContain('Withcommented__module');
    });
});

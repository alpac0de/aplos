import { getFiles, formatPath, buildRouter } from '../../src/build/router.js';
import fs from 'fs/promises';
import path from 'path';

const testDir = '/tmp/aplos-test';

describe('getFiles', () => {
    beforeAll(async () => {
        // Create test directory structure
        await fs.mkdir(testDir, { recursive: true });
        await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true });

        // Create test files
        await fs.writeFile(path.join(testDir, 'file1.js'), '');
        await fs.writeFile(path.join(testDir, 'file2.tsx'), '');
        await fs.writeFile(path.join(testDir, 'subdir', 'file3.jsx'), '');
        await fs.writeFile(path.join(testDir, '_app.js'), ''); // Should be ignored
        await fs.writeFile(path.join(testDir, 'readme.txt'), ''); // Should be ignored (wrong extension)
    });

    afterAll(async () => {
        // Clean up test directory
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should return files with correct extensions', async () => {
        const files = await getFiles(testDir, ['.js', '.tsx', '.jsx']);

        expect(files).toHaveLength(3);
        expect(files).toContain('/file1.js');
        expect(files).toContain('/file2.tsx');
        expect(files).toContain('/subdir/file3.jsx');
    });

    it('should ignore files starting with underscore', async () => {
        const files = await getFiles(testDir, ['.js', '.tsx', '.jsx']);

        expect(files.some(file => file.includes('_app'))).toBe(false);
    });

    it('should only return files with specified extensions', async () => {
        const files = await getFiles(testDir, ['.js']);

        expect(files).toHaveLength(1);
        expect(files).toContain('/file1.js');
    });
});

describe('formatPath', () => {
    it('should remove square brackets, underscores, and hyphens from a string', () => {
        const result = formatPath('[some]_path-with_chars');
        expect(result).toBe('somepathwithchars');
    });

    it('should handle empty string', () => {
        const result = formatPath('');
        expect(result).toBe('');
    });

    it('should handle string without special chars', () => {
        const result = formatPath('normalpath');
        expect(result).toBe('normalpath');
    });
});

describe('buildRouter cache files', () => {
    const testProjectDir = '/tmp/aplos-router-test';

    afterAll(async () => {
        await fs.rm(testProjectDir, { recursive: true, force: true });
    });

    it('should create pages.js, routes.js, and head.js (no app.js)', async () => {
        await fs.mkdir(path.join(testProjectDir, 'src', 'pages'), { recursive: true });
        await fs.writeFile(path.join(testProjectDir, 'src', 'pages', 'index.tsx'), 'export default () => <div>Test</div>');

        const originalCwd = process.cwd;
        process.cwd = () => testProjectDir;

        try {
            await buildRouter({ routes: [] });

            const cacheDir = path.join(testProjectDir, '.aplos', 'cache');

            // New files should exist
            const pagesExists = await fs.access(path.join(cacheDir, 'pages.js')).then(() => true).catch(() => false);
            expect(pagesExists).toBe(true);

            const routesExists = await fs.access(path.join(cacheDir, 'routes.js')).then(() => true).catch(() => false);
            expect(routesExists).toBe(true);

            const headExists = await fs.access(path.join(cacheDir, 'head.js')).then(() => true).catch(() => false);
            expect(headExists).toBe(true);

            // app.js should NOT exist
            const appExists = await fs.access(path.join(cacheDir, 'app.js')).then(() => true).catch(() => false);
            expect(appExists).toBe(false);

            // Verify no JSX in cache files
            const pagesContent = await fs.readFile(path.join(cacheDir, 'pages.js'), 'utf-8');
            expect(pagesContent).not.toMatch(/<[A-Z]/);

            const routesContent = await fs.readFile(path.join(cacheDir, 'routes.js'), 'utf-8');
            expect(routesContent).not.toMatch(/<[A-Z]/);

            const headContent = await fs.readFile(path.join(cacheDir, 'head.js'), 'utf-8');
            expect(headContent).not.toMatch(/<[A-Z]/);
        } finally {
            process.cwd = originalCwd;
        }
    });
});

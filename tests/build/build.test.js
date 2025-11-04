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

describe('buildRouter error handling', () => {
    const testProjectDir = '/tmp/aplos-error-test';
    
    afterAll(async () => {
        // Clean up test directory
        await fs.rm(testProjectDir, { recursive: true, force: true });
    });

    it('should handle empty pages directory gracefully', async () => {
        // Create project with empty pages dir
        await fs.mkdir(path.join(testProjectDir, 'src', 'pages'), { recursive: true });
        
        // Mock process.cwd to return our test directory
        const originalCwd = process.cwd;
        process.cwd = () => testProjectDir;
        
        // Should not throw, just warn
        expect(async () => {
            await buildRouter({ routes: [] });
        }).not.toThrow();
        
        // Restore original cwd
        process.cwd = originalCwd;
    });

    it('should create cache directory if it doesn\'t exist', async () => {
        // Create project with a page file and template
        await fs.mkdir(path.join(testProjectDir, 'src', 'pages'), { recursive: true });
        await fs.mkdir(path.join(testProjectDir, 'templates'), { recursive: true });
        await fs.writeFile(path.join(testProjectDir, 'src', 'pages', 'index.tsx'), 'export default () => <div>Test</div>');
        
        // Copy the real template to test directory
        const realTemplatePath = path.join(process.cwd(), 'templates', 'root.jsx');
        const realTemplate = await fs.readFile(realTemplatePath, 'utf8');
        await fs.writeFile(path.join(testProjectDir, 'templates', 'root.jsx'), realTemplate);
        
        // Mock __dirname to point to our test directory
        const originalDirname = globalThis.__dirname;
        globalThis.__dirname = path.join(testProjectDir, 'src', 'build');
        
        // Mock process.cwd to return our test directory
        const originalCwd = process.cwd;
        process.cwd = () => testProjectDir;
        
        try {
            await buildRouter({ routes: [] });
            
            // Check that cache directory and files were created
            const cacheExists = await fs.access(path.join(testProjectDir, '.aplos', 'cache')).then(() => true).catch(() => false);
            expect(cacheExists).toBe(true);
            
            const routerFileExists = await fs.access(path.join(testProjectDir, '.aplos', 'cache', 'router.js')).then(() => true).catch(() => false);
            expect(routerFileExists).toBe(true);
            
            const appFileExists = await fs.access(path.join(testProjectDir, '.aplos', 'cache', 'app.js')).then(() => true).catch(() => false);
            expect(appFileExists).toBe(true);
        } finally {
            // Restore mocks
            globalThis.__dirname = originalDirname;
            process.cwd = originalCwd;
        }
    });
});
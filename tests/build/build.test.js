import { getFiles, formatPath } from '../../src/build/router.js';
import fs from 'fs/promises';
import { beforeAll, afterAll, describe, it, expect } from 'bun:test';
import path from 'path';

// Create test directory structure
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
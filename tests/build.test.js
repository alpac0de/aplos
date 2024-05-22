const { getFiles, formatPath } = require('../src/build/router.js'); // assuming the functions are exported from devServer.js
const fs = require('fs');

jest.mock('fs');

describe('getFiles', () => {
    it('should return all files in a directory', () => {
        fs.readdirSync.mockReturnValue(['file1.js', 'file2.js']);
        fs.statSync.mockReturnValue({ isDirectory: () => false });

        const files = getFiles('/some/dir');

        expect(files).toEqual(['/some/dir/file1.js', '/some/dir/file2.js']);
    });

    it('should return files in subdirectories', () => {
        fs.readdirSync.mockReturnValueOnce(['subdir']).mockReturnValueOnce(['file1.js']);
        fs.statSync.mockReturnValueOnce({ isDirectory: () => true }).mockReturnValueOnce({ isDirectory: () => false });

        const files = getFiles('/some/dir');

        expect(files).toEqual(['/some/dir/subdir/file1.js']);
    });
});

describe('formatPath', () => {
    it('should remove square brackets, underscores, and hyphens from a string', () => {
        const result = formatPath('[some]_path-with_chars');

        expect(result).toBe('somepathwithchars');
    });
});
import { describe, test, expect } from 'bun:test';
import { existsSync } from 'node:fs';
import { resolveRspackBin, rspackCommand } from '../../src/build/rspack-bin.js';

// The build used to spawn `<project>/node_modules/.bin/rspack`. That bin is only
// there when the installer hoists it next to the user's project, which npm does
// not do for a dependency of aplosjs rather than of the project. Resolving from
// the framework's own module graph is what makes the build work under npm, Yarn
// PnP and pnpm's isolated linker, not just Bun.
describe('rspack binary resolution', () => {
    test('resolves to a file that exists', () => {
        const bin = resolveRspackBin();

        expect(existsSync(bin)).toBe(true);
    });

    test('resolves through the framework, not the project directory', () => {
        const bin = resolveRspackBin();

        // A path under the consuming project's node_modules/.bin would break the
        // moment the installer stops hoisting.
        expect(bin).not.toContain(`${'node_modules'}/.bin/`);
        expect(bin).toContain('@rspack/cli');
    });

    test('runs the CLI through the current node binary', () => {
        const [command, args] = rspackCommand(['--mode=production']);

        // Executing the bin file directly relies on its executable bit and shebang,
        // which the installer is not required to reproduce.
        expect(command).toBe(process.execPath);
        expect(args[0]).toBe(resolveRspackBin());
        expect(args).toContain('--mode=production');
    });
});

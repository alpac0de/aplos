import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

/**
 * Resolves the rspack CLI entry point through Node's module resolution.
 *
 * Guessing `<project>/node_modules/.bin/rspack` only works when the installer
 * hoists a flat node_modules next to the user's project. It breaks under Yarn
 * PnP (no node_modules at all), under pnpm's isolated linker, and in monorepos
 * where the framework is not a top-level dependency. Resolving from this module
 * instead means the lookup starts inside the framework, where `@rspack/cli` is a
 * direct dependency, and Node applies whatever strategy the installer uses.
 *
 * The package only exports `.` and `./package.json`, so the bin path cannot be
 * required directly; it is read from the manifest.
 */
export function resolveRspackBin() {
    const manifestPath = require.resolve('@rspack/cli/package.json');
    const manifest = require('@rspack/cli/package.json');

    const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.rspack;
    if (!bin) {
        throw new Error('Could not find the rspack binary in @rspack/cli. Is the install complete?');
    }

    return path.resolve(path.dirname(manifestPath), bin);
}

/**
 * Arguments for spawning the CLI through the current Node binary.
 *
 * Running the bin file directly relies on its executable bit and shebang, which
 * a package manager may not reproduce (and Windows never does). Invoking it with
 * `process.execPath` also guarantees the child runs the same Node as the parent.
 */
export function rspackCommand(args) {
    return [process.execPath, [resolveRspackBin(), ...args]];
}

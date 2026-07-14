import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const frameworkDir = path.resolve(helpersDir, '../..');
const fixturesDir = path.join(helpersDir, '../fixtures');

/**
 * Installs the fixture's own dependencies, the way a real consumer project does.
 *
 * The framework's node_modules cannot simply be reused: react, react-dom and
 * react-router-dom are peer dependencies there, and Bun materialises peers as
 * empty stubs. Running a real install in the fixture is also what a user does,
 * so the build under test resolves modules exactly as it would in the wild.
 *
 * Everything the framework itself needs at build time (rspack, the loaders) is
 * resolved from the framework's own tree, so only the peers are installed here.
 */
async function installDependencies(root) {
    await new Promise((resolve, reject) => {
        const child = spawn('bun', ['install', '--no-save'], { cwd: root, stdio: 'pipe' });

        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d; });
        child.on('error', reject);
        child.on('close', (code) => {
            if (code !== 0) reject(new Error(`bun install failed in fixture: ${stderr}`));
            else resolve();
        });
    });

    // `aplos build` spawns node_modules/.bin/rspack from the project directory,
    // and rspack is the framework's dependency, not the fixture's.
    const binDir = path.join(root, 'node_modules', '.bin');
    await fs.mkdir(binDir, { recursive: true });
    await fs.symlink(
        path.join(frameworkDir, 'node_modules', '.bin', 'rspack'),
        path.join(binDir, 'rspack'),
    ).catch((error) => {
        if (error.code !== 'EEXIST') throw error;
    });
}

/**
 * Copies a fixture project into a temp directory, gives it a node_modules, and
 * runs the real `bin/aplos` CLI against it.
 *
 * The build runs as a subprocess on purpose: it is the only way to observe the
 * exit code the user actually gets, and `build.js` sets `process.exitCode` from
 * an async callback rather than throwing, so an in-process call cannot be awaited.
 */
export async function loadFixture(name) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), `aplos-${name}-`));

    try {
        await fs.cp(path.join(fixturesDir, name), root, { recursive: true });
        await installDependencies(root);
    } catch (error) {
        // The caller never gets a handle to clean up a fixture that failed to set up.
        await fs.rm(root, { recursive: true, force: true });
        throw error;
    }

    let outDir = 'dist';

    return {
        root,

        /** Runs `aplos build`, resolving with the exit code and captured output. */
        async build({ mode = 'production', args = [], env = {} } = {}) {
            // Commander accepts both `--out-dir dist2` and `--out-dir=dist2`; reading
            // only the first form would leave readFile() pointing at a stale dist/.
            const flagIndex = args.indexOf('--out-dir');
            if (flagIndex !== -1) outDir = args[flagIndex + 1];

            const inlineFlag = args.find((a) => a.startsWith('--out-dir='));
            if (inlineFlag) outDir = inlineFlag.slice('--out-dir='.length);

            return new Promise((resolve) => {
                const child = spawn(
                    process.execPath,
                    [path.join(frameworkDir, 'bin', 'aplos'), 'build', `--mode=${mode}`, ...args],
                    { cwd: root, env: { ...process.env, ...env } },
                );

                let stdout = '';
                let stderr = '';
                child.stdout.on('data', (d) => { stdout += d; });
                child.stderr.on('data', (d) => { stderr += d; });

                child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
            });
        },

        /**
         * Reads a path relative to the output directory. A dangling asset reference
         * throws ENOENT here, which is what makes broken chunk links fail a test
         * without a dedicated assertion for them.
         */
        readFile(p) {
            return fs.readFile(path.join(root, outDir, p.replace(/^\//, '')), 'utf-8');
        },

        readdir(p = '') {
            return fs.readdir(path.join(root, outDir, p.replace(/^\//, '')));
        },

        async exists(p) {
            try {
                await fs.access(path.join(root, outDir, p.replace(/^\//, '')));
                return true;
            } catch {
                return false;
            }
        },

        writeSource(p, contents) {
            const target = path.join(root, p);
            return fs.mkdir(path.dirname(target), { recursive: true })
                .then(() => fs.writeFile(target, contents, 'utf-8'));
        },

        cleanup() {
            return fs.rm(root, { recursive: true, force: true });
        },
    };
}

/** Extracts every src/href a browser would fetch from an emitted HTML document. */
export function referencedAssets(html) {
    const refs = [];
    const patterns = [/<script[^>]+src="([^"]+)"/g, /<link[^>]+href="([^"]+)"/g];

    for (const re of patterns) {
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!m[1].startsWith('http') && !m[1].startsWith('//')) refs.push(m[1]);
        }
    }

    return refs;
}

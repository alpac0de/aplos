import { describe, test, expect, afterEach } from 'bun:test';
import getConfig from '../../src/build/config.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const dirs = [];

// Each case gets its own directory: `aplos.config.js` is loaded with a dynamic
// import, and both Node and Bun cache that by resolved path. Reusing one
// directory would silently serve the first test's config to every later one.
async function withConfig(source, env, fn) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-server-cfg-'));
    dirs.push(dir);
    if (source !== null) {
        await fs.writeFile(path.join(dir, 'aplos.config.js'), source, 'utf-8');
    }

    const originalCwd = process.cwd;
    const originalEnv = process.env.APLOS_SERVER_PORT;
    process.cwd = () => dir;
    if (env === undefined) {
        delete process.env.APLOS_SERVER_PORT;
    } else {
        process.env.APLOS_SERVER_PORT = env;
    }

    try {
        return await fn();
    } finally {
        process.cwd = originalCwd;
        if (originalEnv === undefined) {
            delete process.env.APLOS_SERVER_PORT;
        } else {
            process.env.APLOS_SERVER_PORT = originalEnv;
        }
    }
}

afterEach(async () => {
    while (dirs.length) {
        await fs.rm(dirs.pop(), { recursive: true, force: true });
    }
});

describe('server config defaults', () => {
    test('a project with no server block gets the defaults', async () => {
        const config = await withConfig('export default {};', undefined, getConfig);

        expect(config.server.port).toBe(3000);
        expect(config.server.strictPort).toBe(false);
    });

    test('a project port overrides the default', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001 } };',
            undefined,
            getConfig,
        );

        expect(config.server.port).toBe(3001);
    });

    // The spread that merges the project config replaces `server` wholesale, so
    // declaring only `port` used to drop every other server default with it.
    test('declaring only port keeps the other server defaults', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001 } };',
            undefined,
            getConfig,
        );

        expect(config.server.strictPort).toBe(false);
    });
});

describe('APLOS_SERVER_PORT', () => {
    // The env var used to be baked into the default `server` object, which a
    // project's own `server: { port }` then replaced: setting the variable had no
    // effect at all on any project that configured a port.
    test('wins over a port set in aplos.config.js', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001 } };',
            '9999',
            getConfig,
        );

        expect(config.server.port).toBe(9999);
    });

    test('applies when the project sets no port', async () => {
        const config = await withConfig('export default {};', '9999', getConfig);

        expect(config.server.port).toBe(9999);
    });

    test('is coerced to a number, not left as a string', async () => {
        const config = await withConfig('export default {};', '9999', getConfig);

        expect(config.server.port).toBe(9999);
        expect(typeof config.server.port).toBe('number');
    });

    // A non-numeric value used to reach the dev server as NaN.
    test('a non-numeric value is ignored, keeping the configured port', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001 } };',
            'abcd',
            getConfig,
        );

        expect(config.server.port).toBe(3001);
    });

    test('an out-of-range value is ignored', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001 } };',
            '70000',
            getConfig,
        );

        expect(config.server.port).toBe(3001);
    });

    test('an empty value is ignored', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001 } };',
            '',
            getConfig,
        );

        expect(config.server.port).toBe(3001);
    });
});

describe('strictPort', () => {
    test('defaults to false', async () => {
        const config = await withConfig('export default {};', undefined, getConfig);

        expect(config.server.strictPort).toBe(false);
    });

    test('is read from the project config', async () => {
        const config = await withConfig(
            'export default { server: { port: 3001, strictPort: true } };',
            undefined,
            getConfig,
        );

        expect(config.server.strictPort).toBe(true);
    });

    // The policy used to hinge on whether APLOS_SERVER_PORT was set at all.
    // It must now depend on strictPort alone: the env var carries the port
    // VALUE, never the fallback policy.
    test('the env var does not change the policy', async () => {
        const strict = await withConfig(
            'export default { server: { strictPort: true } };',
            '9999',
            getConfig,
        );
        expect(strict.server.strictPort).toBe(true);
        expect(strict.server.port).toBe(9999);

        const loose = await withConfig(
            'export default { server: { port: 3001 } };',
            '9999',
            getConfig,
        );
        expect(loose.server.strictPort).toBe(false);
    });
});

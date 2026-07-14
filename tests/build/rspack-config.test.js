import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRspackConfig } from '../../src/build/rspack-config.js';

describe('createRspackConfig', () => {
    let root;

    beforeEach(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-cfg-'));
    });

    afterEach(() => fs.rm(root, { recursive: true, force: true }));

    test('derives the mode from the caller, not NODE_ENV', async () => {
        const config = await createRspackConfig({ mode: 'production', projectDirectory: root });

        expect(config.mode).toBe('production');
    });

    // The command owns the mode and the entry; a project's rspack.config.js is
    // merged in, but must not be able to override them. webpack-merge lets the
    // later object win, so before the post-merge override a user config setting
    // `mode: 'development'` turned a production build back into a development one.
    test('a user rspack.config.js cannot override the mode', async () => {
        await fs.writeFile(path.join(root, 'rspack.config.js'), 'export default { mode: "development" }\n');

        const config = await createRspackConfig({ mode: 'production', projectDirectory: root });

        expect(config.mode).toBe('production');
    });

    test('a user rspack.config.js cannot override the entry', async () => {
        await fs.writeFile(path.join(root, 'rspack.config.js'), 'export default { entry: "./evil.js" }\n');

        const config = await createRspackConfig({
            mode: 'production',
            entry: ['/framework/app.jsx'],
            projectDirectory: root,
        });

        expect(config.entry).toEqual(['/framework/app.jsx']);
    });

    // Everything else in a user config is still merged in.
    test('a user rspack.config.js can still add its own settings', async () => {
        await fs.writeFile(
            path.join(root, 'rspack.config.js'),
            'export default { resolve: { alias: { "@custom": "/somewhere" } } }\n',
        );

        const config = await createRspackConfig({ mode: 'production', projectDirectory: root });

        expect(config.resolve.alias['@custom']).toBe('/somewhere');
    });
});

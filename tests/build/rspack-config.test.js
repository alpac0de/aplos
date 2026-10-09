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

    // From a framework file, a subpath such as `react-dom/client` resolved to the
    // framework's own copy when it had one, next to the project's `react`.
    test('React subpaths resolve to the project copy', async () => {
        const reactDir = path.join(root, 'node_modules', 'react');
        await fs.mkdir(reactDir, { recursive: true });
        await fs.writeFile(path.join(reactDir, 'package.json'), '{"name":"react","version":"0.0.0"}\n');
        await fs.writeFile(path.join(reactDir, 'jsx-runtime.js'), '');

        const config = await createRspackConfig({ mode: 'production', projectDirectory: root });

        expect(config.resolve.alias['react/jsx-runtime$']).toBe(await fs.realpath(path.join(reactDir, 'jsx-runtime.js')));
        // Not installed in the project: left to normal resolution.
        expect(config.resolve.alias['react-dom/client$']).toBeUndefined();
    });
});

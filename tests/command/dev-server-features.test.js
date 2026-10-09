import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectFeatures } from '../../src/command/devServer.js';

// The startup banner listed the React Compiler unconditionally, even for a
// project that never enabled it.
describe('dev server feature list', () => {
    let dir;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-features-'));
    });

    afterEach(() => fs.rm(dir, { recursive: true, force: true }));

    test('lists the React Compiler only when the config enables it', () => {
        expect(detectFeatures(dir, {})).not.toContain('React Compiler');
        expect(detectFeatures(dir, { reactCompiler: true })).toContain('React Compiler');
    });
});

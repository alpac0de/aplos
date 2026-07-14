import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import create from '../../src/command/create.js';

const frameworkDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('aplos create', () => {
    let cwd;
    let root;

    beforeAll(async () => {
        root = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-scaffold-'));
        cwd = process.cwd();
        process.chdir(root);

        await create('demo');
    });

    afterAll(async () => {
        process.chdir(cwd);
        await fs.rm(root, { recursive: true, force: true });
    });

    // The pin was hand-maintained in the template and drifted to ^0.14.0 while the
    // only published version was 0.15.0, so every fresh project died on install:
    // "ETARGET No matching version found for aplosjs@^0.14.0".
    test('pins the version the framework actually ships', async () => {
        const scaffolded = JSON.parse(await fs.readFile(path.join(root, 'demo/package.json'), 'utf8'));
        const framework = JSON.parse(await fs.readFile(path.join(frameworkDir, 'package.json'), 'utf8'));

        expect(scaffolded.dependencies.aplosjs).toBe(`^${framework.version}`);
    });

    test('leaves no placeholder behind', async () => {
        const files = ['package.json', 'src/pages/index.tsx', 'aplos.config.js'];

        for (const file of files) {
            const contents = await fs.readFile(path.join(root, 'demo', file), 'utf8');
            expect(contents).not.toContain('{{');
        }
    });

    test('names the project after the directory', async () => {
        const pkg = JSON.parse(await fs.readFile(path.join(root, 'demo/package.json'), 'utf8'));

        expect(pkg.name).toBe('demo');
    });

    // rspack rewrites `aplos/*` to the framework's sources through its alias table,
    // but TypeScript knows nothing of it: a fresh project reported five TS2307 on
    // its own starter pages.
    test('teaches TypeScript how to resolve the aplos/* imports the template uses', async () => {
        const tsconfig = JSON.parse(await fs.readFile(path.join(root, 'demo/tsconfig.json'), 'utf8'));
        const paths = tsconfig.compilerOptions.paths;

        const imported = ['aplos/head', 'aplos/navigation'];
        for (const specifier of imported) {
            expect(paths[specifier]).toBeDefined();
        }
    });
});

// `npm create aplos` used to carry its own copy of the scaffolding logic and its own
// tree of templates. They drifted: the copy still pinned ^0.14.0 and ignored
// public/dist long after the framework had moved on. It now delegates, so there is
// nothing left to drift.
describe('create-aplos', () => {
    test('delegates to the framework rather than duplicating it', async () => {
        const entry = await fs.readFile(path.join(frameworkDir, 'create-aplos/index.js'), 'utf8');

        expect(entry).toContain("from \"aplosjs/create\"");
        expect(entry).not.toContain('copyDirectory');
    });

    test('carries no second copy of the templates', async () => {
        const duplicated = path.join(frameworkDir, 'create-aplos/templates');

        expect(await exists(duplicated)).toBe(false);
    });

    // The range stays loose on purpose: the version a scaffolded project pins is
    // derived from the framework at generation time, so this one does not have to
    // track every release. It only has to depend on the framework at all.
    test('depends on the framework it delegates to', async () => {
        const scaffolder = JSON.parse(
            await fs.readFile(path.join(frameworkDir, 'create-aplos/package.json'), 'utf8'),
        );

        expect(scaffolder.dependencies?.aplosjs).toBeDefined();
    });

    test('the framework exposes the scaffolder it delegates to', async () => {
        const framework = JSON.parse(await fs.readFile(path.join(frameworkDir, 'package.json'), 'utf8'));

        expect(framework.exports['./create']).toBeDefined();
    });
});

async function exists(target) {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

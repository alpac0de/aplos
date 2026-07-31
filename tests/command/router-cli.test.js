import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const ANSI_PATTERN = new RegExp(String.fromCharCode(27) + String.raw`\[[0-9;]*m`, 'g');

// cli-table3 emits colour codes even when piped; strip them so assertions match
// on text rather than on escape sequences. Built from a char code because the
// literal escape character is not allowed in a regex by lint (no-control-regex).
function stripAnsi(value) {
    return value.replace(ANSI_PATTERN, '');
}

// The CLI is driven as a subprocess: the exit code is part of the contract these
// tests pin, and it is only observable from outside the process.
function runCli(cwd, args) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(frameworkDir, 'bin', 'aplos'), ...args], {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (d) => { stdout += d; });
        child.stderr.on('data', (d) => { stderr += d; });
        child.on('close', (code) => resolve({
            code,
            stdout: stripAnsi(stdout),
            stderr,
        }));
    });
}

let project;

beforeAll(async () => {
    project = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-cli-'));

    const pages = path.join(project, 'src', 'pages', 'blog');
    await fs.mkdir(pages, { recursive: true });
    await fs.writeFile(path.join(project, 'src', 'pages', 'index.jsx'), 'export default () => null');
    await fs.writeFile(path.join(pages, '[...slug].jsx'), 'export default () => null');

    // A route-config entry with `source`/`paths` but no component: this is what
    // used to render a blank row in the debug table.
    await fs.writeFile(
        path.join(project, 'aplos.config.js'),
        "export default { routes: [{ source: '/blog/[...slug]', paths: ['/blog/a'] }] };\n",
    );
});

afterAll(() => fs.rm(project, { recursive: true, force: true }));

describe('aplos router:debug', () => {
    test('lists the project routes', async () => {
        const { code, stdout } = await runCli(project, ['router:debug']);

        expect(code).toBe(0);
        expect(stdout).toContain('Index');
        expect(stdout).toContain('/blog/*');
    });

    // The cache holds page routes AND raw aplos.config.js entries, which have no
    // component or path. Those rendered as a junk row: empty Component and Path,
    // with the table's own placeholders ("-", "Any") filling the rest. Asserting
    // "some cell is non-empty" would NOT catch it, since those placeholders are
    // non-empty; the identifying trait is an empty Component *and* Path.
    test('does not render a junk row for config-only route entries', async () => {
        const { stdout } = await runCli(project, ['router:debug']);

        const rows = stdout
            .split('\n')
            .filter((line) => line.startsWith('│'))
            .map((line) => line.split('│').slice(1, -1).map((cell) => cell.trim()))
            // Drop the header row.
            .filter((cells) => cells[0] !== 'Component');

        expect(rows.length).toBe(2);
        for (const [component, , , , routePath] of rows) {
            expect(component).not.toBe('');
            expect(routePath).not.toBe('');
        }
    });

    test('exits non-zero when the component does not exist', async () => {
        const { code, stdout } = await runCli(project, ['router:debug', 'NoSuchComponent']);

        expect(stdout).toContain('Component not found');
        expect(code).toBe(1);
    });

    test('exits zero when the component exists', async () => {
        const { code } = await runCli(project, ['router:debug', 'Index']);

        expect(code).toBe(0);
    });
});

describe('aplos router:match', () => {
    // Locks the catch-all fix: `[...slug]` becomes `*`, which used to compile as
    // a quantifier and made every catch-all report "does not match".
    test('matches a catch-all route and exits zero', async () => {
        const { code, stdout } = await runCli(project, ['router:match', '/blog/hello']);

        expect(stdout).toContain('matches route');
        expect(code).toBe(0);
    });

    test('exits non-zero when no route matches', async () => {
        const { code, stdout } = await runCli(project, ['router:match', '/nope']);

        expect(stdout).toContain('does not match any route');
        expect(code).toBe(1);
    });
});

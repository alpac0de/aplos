import { describe, test, expect, afterEach } from 'bun:test';
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frameworkDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ANSI_PATTERN = new RegExp(String.fromCharCode(27) + String.raw`\[[0-9;]*m`, 'g');

const cleanups = [];

/** Holds a port open so the dev server has to react to it being taken. */
function occupyPort(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(port, () => {
            cleanups.push(() => new Promise((done) => server.close(done)));
            resolve(server);
        });
    });
}

/** A port nothing is listening on, so the "free port" cases are not flaky. */
function findFreePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once('error', reject);
        probe.listen(0, () => {
            const { port } = probe.address();
            probe.close(() => resolve(port));
        });
    });
}

async function scaffold(configSource) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-devport-'));
    cleanups.push(() => fs.rm(dir, { recursive: true, force: true }));

    await fs.mkdir(path.join(dir, 'src', 'pages'), { recursive: true });
    await fs.writeFile(path.join(dir, 'src', 'pages', 'index.jsx'), 'export default () => null');
    await fs.writeFile(path.join(dir, 'aplos.config.js'), configSource, 'utf-8');

    return dir;
}

/**
 * Starts `aplos server` and resolves once it has either reported its port or
 * exited. The dev server never exits on its own, so the success path is
 * detected from the startup banner and the process is then killed.
 */
function runDevServer(cwd, { timeout = 25_000 } = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [path.join(frameworkDir, 'bin', 'aplos'), 'server'], {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
        });

        let output = '';
        let settled = false;

        const finish = (code) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { child.kill('SIGKILL'); } catch { /* already gone */ }
            resolve({ code, output: output.replace(ANSI_PATTERN, '') });
        };

        const onData = (chunk) => {
            output += chunk;
            // The banner is the last thing printed on a successful start.
            if (/Local:\s+http/.test(output)) finish(0);
        };

        child.stdout.on('data', onData);
        child.stderr.on('data', onData);
        child.on('close', (code) => finish(code));

        const timer = setTimeout(() => finish(null), timeout);
    });
}

afterEach(async () => {
    while (cleanups.length) {
        await cleanups.pop()();
    }
});

// The fallback policy used to depend on WHICH CHANNEL carried the port: setting
// APLOS_SERVER_PORT refused to fall back, while `server.port` in aplos.config.js
// silently moved. Both express the same intent, so an explicit `strictPort` now
// decides, and the channel no longer does.
describe('dev server port selection', () => {
    test('falls back to the next port when the configured one is busy', async () => {
        const port = await findFreePort();
        await occupyPort(port);
        const dir = await scaffold(`export default { server: { port: ${port} } };`);

        const { output } = await runDevServer(dir);

        expect(output).toContain(`Port ${port} is in use`);
        expect(output).toContain(`using port ${port + 1}`);
        expect(output).toContain(`http://localhost:${port + 1}/`);
        // The notice tells the user how to opt out of falling back.
        expect(output).toContain('strictPort');
    }, 40_000);

    test('uses the configured port when it is free', async () => {
        const port = await findFreePort();
        const dir = await scaffold(`export default { server: { port: ${port} } };`);

        const { output } = await runDevServer(dir);

        expect(output).toContain(`http://localhost:${port}/`);
        expect(output).not.toContain('is in use');
    }, 40_000);
});

describe('strictPort', () => {
    // RspackDevServer rethrows its listen error from an event handler, which no
    // .catch() on start() can intercept: without an up-front probe the user gets
    // a raw EADDRINUSE stack trace instead of a message naming the cause.
    test('fails with a legible message when the port is busy', async () => {
        const port = await findFreePort();
        await occupyPort(port);
        const dir = await scaffold(
            `export default { server: { port: ${port}, strictPort: true } };`,
        );

        const { code, output } = await runDevServer(dir);

        expect(code).toBe(1);
        expect(output).toContain(`Port ${port} is already in use`);
        expect(output).toContain('strictPort');
        // The raw stack trace must not be what the user sees.
        expect(output).not.toContain('EADDRINUSE');
    }, 40_000);
});

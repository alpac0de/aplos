import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { loadFixture, referencedAssets } from '../helpers/fixture.js';

// These tests build a real project and assert on what lands in dist/. Reverting
// fdc9342, 6e92194 or ba56556 leaves the unit suite green; it must not leave
// this one green.
describe('production build artifacts', () => {
    let fixture;
    let result;
    let html;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
        result = await fixture.build({ mode: 'production' });
        html = await fixture.readFile('index.html');
    }, 120_000);

    afterAll(() => fixture?.cleanup());

    test('the build succeeds and emits an HTML entry point', () => {
        expect(result.code).toBe(0);
        expect(html).toContain('<div id="root">');
    });

    // Locks fdc9342: head tags were injected before content hashing, so the
    // emitted HTML pointed at chunk names that never existed on disk.
    test('every asset the HTML references exists in the output', async () => {
        const refs = referencedAssets(html);
        expect(refs.length).toBeGreaterThan(0);

        for (const ref of refs) {
            // Throws ENOENT when the reference is dangling.
            await fixture.readFile(ref);
        }
    });

    test('emitted scripts carry a content hash in production', () => {
        const scripts = referencedAssets(html).filter((r) => r.endsWith('.js'));
        expect(scripts.length).toBeGreaterThan(0);
        expect(scripts.every((s) => /\.[a-f0-9]{8}\.js$/.test(s))).toBe(true);
    });

    // Locks 0183ae0 and the `use static` path: a page carrying the directive is
    // pre-rendered to its own HTML document, with its own meta.
    test('a "use static" page is pre-rendered with its route meta', async () => {
        const staticHtml = await fixture.readFile('static.html');

        expect(staticHtml).toContain('<h1>Static</h1>');
        expect(staticHtml).toContain('Static page');
        expect(staticHtml).toContain('Pre-rendered at build time');
    });

    // The pre-rendered document goes through a different injection path than
    // index.html, and must not end up with a second head or dangling assets.
    test('the pre-rendered document is as sound as the entry point', async () => {
        const staticHtml = await fixture.readFile('static.html');

        expect(staticHtml.split('</head>').length - 1).toBe(1);

        for (const ref of referencedAssets(staticHtml)) {
            await fixture.readFile(ref);
        }
    });

    // Locks ba56556: tags were anchored on the first `</head>`, which could sit
    // inside an inline script rather than closing the real head.
    test('the document has exactly one head, and the tags land inside it', () => {
        expect(html.split('</head>').length - 1).toBe(1);

        const head = html.slice(0, html.indexOf('</head>'));
        expect(head).toContain('charset');
        expect(head).toContain('viewport');
    });

    // Locks 85532c5: the configured head was silently never injected.
    test('the configured head reaches the document', () => {
        expect(html).toContain('Build fixture');
    });

    // Locks dcfc275: production shipped source maps.
    test('production emits no source maps', async () => {
        const files = await fixture.readdir();
        expect(files.some((f) => f.endsWith('.map'))).toBe(false);
        expect(html).not.toContain('sourceMappingURL');
    });
});

// The CLI flag must win over the ambient environment. Reading NODE_ENV first made
// `--mode=production` emit an unhashed development bundle on any runner that sets
// NODE_ENV to something else, and HTTP caches then serve stale files after a deploy.
describe('build mode comes from --mode, not the environment', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
    });

    afterAll(() => fixture?.cleanup());

    test('--mode=production wins over NODE_ENV=development', async () => {
        const { code } = await fixture.build({
            mode: 'production',
            env: { NODE_ENV: 'development' },
        });
        expect(code).toBe(0);

        const html = await fixture.readFile('index.html');
        const scripts = referencedAssets(html).filter((r) => r.endsWith('.js'));

        expect(scripts.length).toBeGreaterThan(0);
        expect(scripts.every((s) => /\.[a-f0-9]{8}\.js$/.test(s))).toBe(true);

        const files = await fixture.readdir();
        expect(files.some((f) => f.endsWith('.map'))).toBe(false);
    }, 120_000);
});

describe('build failure handling', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
    });

    afterAll(() => fixture?.cleanup());

    // Locks 6e92194: a failing bundle reported success, and a deploy happily
    // served an empty output directory.
    test('a broken page fails the build with a non-zero exit code', async () => {
        await fixture.writeSource('src/pages/broken.jsx', 'export default function Broken( {');

        const { code } = await fixture.build({ mode: 'production' });

        expect(code).not.toBe(0);
    }, 120_000);
});

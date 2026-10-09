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

    // The build plugin and the SSG both write the head. They used to do so with
    // separate serializers and opposite anchors, so a pre-rendered page ended up
    // with the global tags AND its own, and crawlers saw two of each.
    test('a pre-rendered page carries its own head, not a duplicated one', async () => {
        const staticHtml = await fixture.readFile('static.html');

        expect(staticHtml.match(/<title>/g)).toHaveLength(1);
        expect(staticHtml.match(/name="description"/g)).toHaveLength(1);

        // The page's own meta won over the global config.
        expect(staticHtml).toContain('<title>Static page</title>');
        expect(staticHtml).toContain('Pre-rendered at build time');
        expect(staticHtml).not.toContain('content="Build fixture"');
    });

    // Locks dcfc275: production shipped source maps.
    // Nothing else here runs the client bundle. It once paired the project's
    // react with the framework's react-dom, which built fine and crashed in the
    // browser on the version check.
    test('the client bundle renders the page', async () => {
        expect(await fixture.render('/')).toContain('<h1>Home</h1>');
    }, 30_000);

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

describe('static rendering failures', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
    });

    afterAll(() => fixture?.cleanup());

    // A static page that threw during pre-rendering was logged and skipped, and the
    // build still exited 0: the deploy shipped without that page's HTML.
    test('a static page that throws while rendering fails the build', async () => {
        await fixture.writeSource(
            'src/pages/explodes.jsx',
            '"use static";\nexport default function Explodes() { throw new Error("boom"); }\n',
        );

        const { code, stderr } = await fixture.build({ mode: 'production' });

        expect(code).not.toBe(0);
        expect(stderr).toContain('/explodes');
    }, 120_000);
});

describe('static dynamic routes', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
        await fixture.writeSource(
            'src/pages/blog/[slug].jsx',
            '"use static";\nexport default function Post() { return <h1>Post</h1>; }\n',
        );
    });

    afterAll(() => fixture?.cleanup());

    // There is no concrete URL to render for /blog/:slug, so the SSG skipped it
    // without a word and the page the user asked to pre-render never was.
    test('a static dynamic route with no paths fails the build', async () => {
        const { code, stderr } = await fixture.build({ mode: 'production' });

        expect(code).not.toBe(0);
        expect(stderr).toContain('/blog/:slug');
    }, 120_000);

    test('a static dynamic route expanded through paths builds', async () => {
        await fixture.writeSource(
            'aplos.config.js',
            "export default { routes: [{ source: '/blog/[slug]', paths: ['/blog/hello'] }] };\n",
        );

        const { code } = await fixture.build({ mode: 'production' });

        expect(code).toBe(0);
        expect(await fixture.readFile('blog/hello.html')).toContain('<h1>Post</h1>');
    }, 120_000);
});

// The compiler leaves a memo cache check in every component it compiles. React's
// own runtime carries the same symbol, so only the app chunks are searched: a
// match there means the page itself was compiled, not just that React is bundled.
describe('react compiler', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
        await fixture.writeSource(
            'src/pages/counter.jsx',
            [
                "import { useState } from 'react';",
                'export default function Counter() {',
                '    const [count, setCount] = useState(0);',
                '    return <button onClick={() => setCount(count + 1)}>{count}</button>;',
                '}',
                '',
            ].join('\n'),
        );
    });

    afterAll(() => fixture?.cleanup());

    async function appChunksContain(needle) {
        const files = (await fixture.readdir()).filter((f) => f.endsWith('.js') && !f.startsWith('vendors'));
        for (const file of files) {
            if ((await fixture.readFile(file)).includes(needle)) {
                return true;
            }
        }
        return false;
    }

    test('reactCompiler: true compiles the pages', async () => {
        await fixture.writeSource('aplos.config.js', 'export default { reactCompiler: true };\n');

        const { code } = await fixture.build({ mode: 'production' });

        expect(code).toBe(0);
        expect(await appChunksContain('react.memo_cache_sentinel')).toBe(true);
    }, 120_000);

    test('the pages are left alone without reactCompiler', async () => {
        await fixture.writeSource('aplos.config.js', 'export default {};\n');

        const { code } = await fixture.build({ mode: 'production' });

        expect(code).toBe(0);
        expect(await appChunksContain('react.memo_cache_sentinel')).toBe(false);
    }, 120_000);
});

// A pre-rendered page that does not hydrate cleanly builds fine and only shows
// up as a console error in the browser, which nothing here used to look at.
describe('hydration of pre-rendered pages', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
    });

    afterAll(() => fixture?.cleanup());

    test('a "use static" page hydrates without errors', async () => {
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);

        const { root, emittedTitle, errors } = await fixture.hydrate('static.html', '/static');

        expect(errors).toEqual([]);
        expect(root).toContain('<h1>Static</h1>');
        // The whole document is rebuilt, head included, not only #root.
        expect(emittedTitle).toBe('Static page');
    }, 120_000);

    // The build already writes the configured head into every document. The
    // client wrote it again on mount: every tag was duplicated, and the title a
    // pre-rendered page set from its meta was replaced by the default one.
    test('the client keeps the head the page was pre-rendered with', async () => {
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);

        const { title, head } = await fixture.hydrate('static.html', '/static');

        expect(title).toBe('Static page');
        expect(head.match(/<meta name="description"/g)).toHaveLength(1);
        expect(head.match(/<meta name="viewport"/g)).toHaveLength(1);
    }, 120_000);

    // Navigating away from a pre-rendered page left its title and description in
    // place: nothing on the client updated the head between routes.
    test('client-side navigation updates the head to the next route', async () => {
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);

        const { errors, afterNavigation } = await fixture.hydrate('static.html', '/static', '/');

        expect(errors).toEqual([]);
        expect(afterNavigation.root).toContain('<h1>Home</h1>');
        expect(afterNavigation.title).toBe('Fixture');
        expect(afterNavigation.head.match(/<meta name="description"[^>]*>/g)).toEqual([
            '<meta name="description" content="Build fixture">',
        ]);
    }, 120_000);

    // A route's meta reached the head only through the SSG: a page served by the
    // SPA shell kept the default title.
    test('a page loaded from the SPA shell gets its meta on the client', async () => {
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);

        const { title, head } = await fixture.hydrate('index.html', '/static');

        expect(title).toBe('Static page');
        expect(head.match(/<meta name="description"[^>]*>/g)).toEqual([
            '<meta name="description" content="Pre-rendered at build time">',
        ]);
    }, 120_000);

    // A head script loaded from a CDN is part of the document, not of dist/.
    test('a page with an external head script still hydrates', async () => {
        await fixture.writeSource(
            'aplos.config.js',
            "export default { head: { script: [{ src: 'https://cdn.example.com/analytics.js', async: true }] } };\n",
        );
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);

        const { errors } = await fixture.hydrate('static.html', '/static');

        expect(errors).toEqual([]);
    }, 120_000);

    // Proves the check has teeth: a page whose server and client output differ
    // must be reported, or the test above would pass on any page.
    test('a page that renders differently on the client is reported', async () => {
        await fixture.writeSource(
            'src/pages/mismatch.jsx',
            [
                '"use static";',
                'export default function Mismatch() {',
                "    return <p>{typeof window === 'undefined' ? 'server' : 'client'}</p>;",
                '}',
                '',
            ].join('\n'),
        );
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);

        const { errors } = await fixture.hydrate('mismatch.html', '/mismatch');

        // #418 is React's minified hydration mismatch.
        expect(errors.some((e) => /#418|hydrat/i.test(e))).toBe(true);
    }, 120_000);
});

// The client merges each route's meta over the configured head on navigation,
// the way the SSG does at build time; both must land on the same head.
describe('client-side head', () => {
    let fixture;

    beforeAll(async () => {
        fixture = await loadFixture('basic');
        await fixture.writeSource(
            'src/pages/docs/[...path].jsx',
            [
                "export const meta = (url, params) => ({ title: 'Doc ' + params.path });",
                'export default function Doc() { return <h1>Doc</h1>; }',
                '',
            ].join('\n'),
        );
        await fixture.writeSource(
            'src/pages/translated.jsx',
            [
                '"use static";',
                'export const meta = {',
                "    title: 'Translated',",
                "    description: 'In French too',",
                "    link: [",
                "        { rel: 'alternate', hreflang: 'fr', href: '/fr/translated' },",
                "        { rel: 'icon', href: '/favicon.ico' },",
                '    ],',
                "    script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({ name: '</script><!--' }) }],",
                '};',
                'export default function Translated() { return <h1>Translated</h1>; }',
                '',
            ].join('\n'),
        );
        await fixture.writeSource(
            'src/pages/headed.jsx',
            [
                "import Head from 'aplos/head';",
                'export default function Headed() {',
                '    return <><Head><title>From Head</title></Head><h1>Headed</h1></>;',
                '}',
                '',
            ].join('\n'),
        );
        await fixture.writeSource(
            'src/pages/guides/[...slug].jsx',
            [
                "export const meta = (url, params) => ({ title: 'Guide ' + params.slug });",
                'export default function Guide() { return <h1>Guide</h1>; }',
                '',
            ].join('\n'),
        );
        // No defaultTitle: a route without a title must not keep the last one.
        await fixture.writeSource(
            'aplos.config.js',
            [
                'export default {',
                "    routes: [{ source: '/docs/[...path]', paths: ['/docs/a/b'] }],",
                "    head: { description: 'Site', link: [{ rel: 'icon', href: '/favicon.ico' }] },",
                '};',
                '',
            ].join('\n'),
        );
        const { code } = await fixture.build({ mode: 'production' });
        expect(code).toBe(0);
    }, 120_000);

    afterAll(() => fixture?.cleanup());

    // React Router names a catch-all param `*`; the SSG names it after the file.
    test('a catch-all meta function gets the same params on both sides', async () => {
        const prerendered = await fixture.hydrate('docs/a/b.html', '/docs/a/b');
        const navigated = await fixture.hydrate('index.html', '/docs/a/b');

        expect(prerendered.emittedTitle).toBe('Doc a/b');
        expect(prerendered.title).toBe('Doc a/b');
        expect(navigated.title).toBe('Doc a/b');
    }, 30_000);

    // Without `paths` there is no source to read the name from but the file's.
    test('a catch-all served by the SPA shell gets its param by name', async () => {
        const { title } = await fixture.hydrate('index.html', '/guides/x/y');

        expect(title).toBe('Guide x/y');
    }, 30_000);

    // The SSG escapes an inline script's body; compared with the raw text, the
    // pre-rendered copy went unrecognized and the script was added (and run) twice.
    test("a route's inline script is not added a second time", async () => {
        const { head, errors } = await fixture.hydrate('translated.html', '/translated');

        expect(errors).toEqual([]);
        expect(head.match(/<script type="application\/ld\+json">/g)).toHaveLength(1);
    }, 30_000);

    // The route also declares the configured favicon. Treated as the route's, it
    // was removed on the way out, leaving the head without it.
    // The SSG also wrote it twice on the page that repeats it.
    test('a configured tag a route repeats outlives the route', async () => {
        const favicon = /<link rel="icon" href="\/favicon.ico">/g;
        const { head, afterNavigation } = await fixture.hydrate('translated.html', '/translated', '/');

        expect(head.match(favicon)).toHaveLength(1);
        expect(afterNavigation.head.match(favicon)).toHaveLength(1);
    }, 30_000);

    test("a route's repeatable tags come and go with it", async () => {
        const alternate = /<link rel="alternate" hreflang="fr" href="\/fr\/translated">/g;

        const loaded = await fixture.hydrate('translated.html', '/translated', '/');
        expect(loaded.errors).toEqual([]);
        // Written by the SSG, reused by the client rather than added twice.
        expect(loaded.head.match(alternate)).toHaveLength(1);
        expect(loaded.afterNavigation.head.match(alternate)).toBeNull();

        const fromShell = await fixture.hydrate('index.html', '/translated');
        expect(fromShell.head.match(alternate)).toHaveLength(1);
    }, 30_000);

    // Only part of the configured head reached the client, so a configured
    // description a page had overridden vanished instead of coming back.
    test('a configured field a page overrode comes back after it', async () => {
        const { head, afterNavigation } = await fixture.hydrate('translated.html', '/translated', '/');

        expect(head.match(/<meta name="description"[^>]*>/g)).toEqual(['<meta name="description" content="In French too">']);
        expect(afterNavigation.head.match(/<meta name="description"[^>]*>/g)).toEqual(['<meta name="description" content="Site">']);
    }, 30_000);

    // A query change keeps the page mounted, so its <Head> does not run again:
    // rewriting the head then would undo what it set.
    test("a page's own <Head> survives a query change", async () => {
        const { title, afterNavigation } = await fixture.hydrate('index.html', '/headed', '/headed?tab=2');

        expect(title).toBe('From Head');
        expect(afterNavigation.title).toBe('From Head');
    }, 30_000);

    test('a route without a title does not keep the previous one', async () => {
        const { afterNavigation } = await fixture.hydrate('translated.html', '/translated', '/');

        expect(afterNavigation.title).toBe('');
    }, 30_000);
});

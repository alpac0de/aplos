import { describe, test, expect } from 'bun:test';
import { injectMetaTags } from '../../src/build/ssg.js';

const TEMPLATE = '<!doctype html><html><head><script src="/main.js"></script></head><body><div id="root"></div></body></html>';

// The template reaching the SSG already carries the global head config, injected
// by the build. A route's meta has to supersede it, not queue up behind it.
describe('injectMetaTags over an already-populated head', () => {
    const WITH_GLOBAL_HEAD = [
        '<!doctype html><html><head>',
        '    <title>Site</title>',
        '    <meta name="description" content="global">',
        '  </head><body><div id="root"></div></body></html>',
    ].join('\n');

    test('a route title replaces the global one instead of adding a second', () => {
        const out = injectMetaTags(WITH_GLOBAL_HEAD, { title: 'Page' });

        expect(out.match(/<title>/g)).toHaveLength(1);
        expect(out).toContain('<title>Page</title>');
        expect(out).not.toContain('<title>Site</title>');
    });

    // Two descriptions used to be served to crawlers on every static page.
    test('a route description replaces the global one', () => {
        const out = injectMetaTags(WITH_GLOBAL_HEAD, { description: 'page' });

        expect(out.match(/name="description"/g)).toHaveLength(1);
        expect(out).toContain('content="page"');
        expect(out).not.toContain('content="global"');
    });

    test('tags the route does not override are left alone', () => {
        const out = injectMetaTags(WITH_GLOBAL_HEAD, { description: 'page' });

        expect(out).toContain('<title>Site</title>');
    });

    // The build plugin anchors on the last `</head>`; this path used to anchor on
    // the first, which lands the tags inside a script that merely holds the literal.
    test('an inline script containing the literal </head> is left intact', () => {
        const tricky = '<!doctype html><html><head><script>var s = "</head>";</script></head><body></body></html>';

        const out = injectMetaTags(tricky, { title: 'Page' });

        expect(out).toContain('var s = "</head>";');
        expect(out.indexOf('<title>')).toBeLessThan(out.lastIndexOf('</head>'));
    });

    // Markup that only looks like a tag must not be mistaken for one: stripping the
    // "tag" inside a comment leaves the real one in place, so the page ships two.
    test('a meta inside an HTML comment is neither removed nor mistaken for the real one', () => {
        const withComment = [
            '<!doctype html><html><head>',
            '<!-- <meta name="description" content="commented out"> -->',
            '<meta name="description" content="global">',
            '</head><body></body></html>',
        ].join('');

        const out = injectMetaTags(withComment, { description: 'page' });
        const live = out.replace(/<!--[\s\S]*?-->/g, '');

        expect(live.match(/name="description"/g)).toHaveLength(1);
        expect(live).toContain('content="page"');
        expect(live).not.toContain('content="global"');
        expect(out).toContain('<!-- <meta name="description" content="commented out"> -->');
    });

    test('a meta that only appears inside a script body is left alone', () => {
        const withScript = [
            '<!doctype html><html><head>',
            '<script>var t = "<meta name=\\"description\\">";</script>',
            '<meta name="description" content="global">',
            '</head><body></body></html>',
        ].join('');

        const out = injectMetaTags(withScript, { description: 'page' });

        expect(out).toContain('var t = "<meta name=\\"description\\">";');
        expect(out).toContain('content="page"');
        expect(out).not.toContain('content="global"');
    });

    test('attribute order and quoting style do not hide the tag', () => {
        const single = '<!doctype html><html><head><meta content=\'global\' name=\'description\'></head><body></body></html>';

        const out = injectMetaTags(single, { description: 'page' });

        expect(out.match(/name=["']description["']/g)).toHaveLength(1);
        expect(out).not.toContain('global');
    });

    test('an og:title does not get taken for the document title', () => {
        const withOg = '<!doctype html><html><head><title>Site</title><meta property="og:title" content="OG"></head><body></body></html>';

        const out = injectMetaTags(withOg, { title: 'Page' });

        expect(out).toContain('<title>Page</title>');
        expect(out).toContain('property="og:title"');
    });
});

describe('injectMetaTags', () => {
    test('injects title when none exists in template', () => {
        const out = injectMetaTags(TEMPLATE, { title: 'Hello' });
        expect(out).toContain('<title>Hello</title>');
    });

    test('replaces existing title', () => {
        const html = TEMPLATE.replace('</head>', '<title>Old</title></head>');
        const out = injectMetaTags(html, { title: 'New' });
        expect(out).toContain('<title>New</title>');
        expect(out).not.toContain('<title>Old</title>');
    });

    test('escapes HTML special characters in title', () => {
        const out = injectMetaTags(TEMPLATE, { title: '<script>alert(1)</script>' });
        expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(out).not.toContain('<script>alert(1)</script>');
    });

    test('emits description meta tag', () => {
        const out = injectMetaTags(TEMPLATE, { description: 'A page' });
        expect(out).toContain('<meta name="description" content="A page">');
    });

    test('emits canonical link', () => {
        const out = injectMetaTags(TEMPLATE, { canonical: 'https://example.com/' });
        expect(out).toContain('<link rel="canonical" href="https://example.com/">');
    });

    test('joins keywords array with comma', () => {
        const out = injectMetaTags(TEMPLATE, { keywords: ['a', 'b', 'c'] });
        expect(out).toContain('<meta name="keywords" content="a, b, c">');
    });

    test('expands og fields with og: prefix', () => {
        const out = injectMetaTags(TEMPLATE, {
            og: { title: 'T', description: 'D', image: 'https://example.com/i.png' },
        });
        expect(out).toContain('<meta property="og:title" content="T">');
        expect(out).toContain('<meta property="og:description" content="D">');
        expect(out).toContain('<meta property="og:image" content="https://example.com/i.png">');
    });

    test('expands twitter fields with twitter: prefix using name attribute', () => {
        const out = injectMetaTags(TEMPLATE, {
            twitter: { card: 'summary_large_image', site: '@aplosjs' },
        });
        expect(out).toContain('<meta name="twitter:card" content="summary_large_image">');
        expect(out).toContain('<meta name="twitter:site" content="@aplosjs">');
    });

    test('passes through arbitrary meta entries', () => {
        const out = injectMetaTags(TEMPLATE, {
            meta: [{ 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' }],
        });
        expect(out).toContain('<meta http-equiv="X-UA-Compatible" content="IE=edge">');
    });

    test('passes through arbitrary link entries', () => {
        const out = injectMetaTags(TEMPLATE, {
            link: [{ rel: 'alternate', hreflang: 'fr', href: 'https://example.com/fr' }],
        });
        expect(out).toContain('<link rel="alternate" hreflang="fr" href="https://example.com/fr">');
    });

    test('returns html unchanged when meta is empty', () => {
        const out = injectMetaTags(TEMPLATE, {});
        expect(out).toBe(TEMPLATE);
    });
});

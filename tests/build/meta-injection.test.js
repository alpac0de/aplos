import { describe, test, expect } from 'bun:test';
import { injectMetaTags } from '../../src/build/ssg.js';

const TEMPLATE = '<!doctype html><html><head><script src="/main.js"></script></head><body><div id="root"></div></body></html>';

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

import { describe, test, expect } from 'bun:test';
import { toHeadElements, mergeHead, renderHead } from '../../src/build/head.js';

describe('head serialization', () => {
    test('renders a title as character data', () => {
        const html = renderHead(toHeadElements({ defaultTitle: 'Hello' }));

        expect(html.trim()).toBe('<title>Hello</title>');
    });

    test('escapes text content so a title cannot open a tag', () => {
        const html = renderHead(toHeadElements({ title: '</title><script>alert(1)</script>' }));

        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
    });

    test('escapes attribute values so a quote cannot break out', () => {
        const html = renderHead(toHeadElements({
            meta: [{ name: 'description', content: '" onload="alert(1)' }],
        }));

        expect(html).toContain('&quot;');
        expect(html).not.toContain('onload="alert(1)"');
    });

    // The values were escaped before this module existed, but the keys never were,
    // and og/twitter keys can come straight from a CMS.
    test('drops attribute names that are not valid, rather than writing them out', () => {
        const html = renderHead(toHeadElements({
            og: { 'title><script>alert(1)</script': 'x' },
        }));

        expect(html).not.toContain('<script>');
    });

    test('renders a boolean attribute bare, and drops a false one', () => {
        const html = renderHead(toHeadElements({
            script: [{ src: '/a.js', async: true, defer: false }],
        }));

        expect(html).toContain('async');
        expect(html).not.toContain('defer');
        expect(html).toContain('</script>');
    });

    // `innerHTML` used to be written out as an attribute on an empty <script>,
    // so an inline script configured in head never ran.
    test('writes an inline script as the body of the tag, unescaped', () => {
        const html = renderHead(toHeadElements({
            script: [{ innerHTML: 'if (a && b) { window.x = "<b>"; }' }],
        }));

        expect(html).toContain('<script>if (a && b) { window.x = "<b>"; }</script>');
        expect(html).not.toContain('innerHTML');
    });

    test('an inline script cannot close its own tag', () => {
        const html = renderHead(toHeadElements({
            script: [{ innerHTML: 'var s = "</script><script>alert(1)</script>";' }],
        }));

        expect(html.match(/<\/script>/g)).toHaveLength(1);
    });

    // `<!--` then `<script` puts the parser in a state where the real closing
    // tag no longer ends the element, swallowing the rest of the page.
    test('an inline script cannot reach the double-escaped parser state', () => {
        const html = renderHead(toHeadElements({
            script: [{ innerHTML: 'const x = "<!-- <script>";' }],
        }));

        // Without a `<script` after the `<!--`, the closing tag still counts.
        expect(html).not.toMatch(/<!--[\s\S]*<script/i);
        expect(html).toContain('const x = "<!-- \\u003Cscript>";');
    });

    // An old-style comment around a script body is valid JavaScript.
    test('an inline script keeps an HTML-style comment', () => {
        const body = '<!--\nwindow.x = 1;\n//-->';
        const html = renderHead(toHeadElements({ script: [{ innerHTML: body }] }));

        expect(html).toContain(`<script>${body}</script>`);
    });

    // Escaping `<script` too broke code that merely compares with a `script`.
    test('an inline script keeps code that looks like an opening tag', () => {
        const html = renderHead(toHeadElements({
            script: [{ innerHTML: 'if (1 <script) {}' }],
        }));

        expect(html).toContain('<script>if (1 <script) {}</script>');
    });

    test('writes httpEquiv as the http-equiv attribute', () => {
        const html = renderHead(toHeadElements({
            meta: [{ httpEquiv: 'refresh', content: '5' }],
        }));

        expect(html).toContain('<meta http-equiv="refresh" content="5">');
    });

    test('an inline JSON script stays valid JSON', () => {
        const data = { comment: '<!-- example -->', end: '</script>', start: '<script>' };
        const html = renderHead(toHeadElements({
            script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(data) }],
        }));

        const body = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
        expect(JSON.parse(body)).toEqual(data);
    });
});

describe('head merging', () => {
    test('a page title replaces the global one instead of adding a second', () => {
        const merged = mergeHead(
            toHeadElements({ defaultTitle: 'Site' }),
            toHeadElements({ title: 'Page' }),
        );
        const html = renderHead(merged);

        expect(html.match(/<title>/g)).toHaveLength(1);
        expect(html).toContain('<title>Page</title>');
    });

    // A page setting its own description used to ship two of them to crawlers.
    test('a page description replaces the global one', () => {
        const merged = mergeHead(
            toHeadElements({ description: 'global' }),
            toHeadElements({ description: 'page' }),
        );
        const html = renderHead(merged);

        expect(html.match(/name="description"/g)).toHaveLength(1);
        expect(html).toContain('page');
    });

    test('meta with different names accumulate', () => {
        const merged = mergeHead(
            toHeadElements({ meta: [{ name: 'viewport', content: 'width=device-width' }] }),
            toHeadElements({ description: 'page' }),
        );

        expect(renderHead(merged)).toContain('viewport');
        expect(renderHead(merged)).toContain('description');
    });

    test('og tags merge by property, not position', () => {
        const merged = mergeHead(
            toHeadElements({ og: { title: 'global', image: '/a.png' } }),
            toHeadElements({ og: { title: 'page' } }),
        );
        const html = renderHead(merged);

        expect(html.match(/property="og:title"/g)).toHaveLength(1);
        expect(html).toContain('page');
        expect(html).toContain('/a.png');
    });
});

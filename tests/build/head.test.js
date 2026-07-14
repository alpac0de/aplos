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

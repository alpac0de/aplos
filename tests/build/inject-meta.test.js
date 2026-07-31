import { describe, test, expect } from 'bun:test';
import { injectMetaTags } from '../../src/build/ssg.js';

// `injectMetaTags` layers a route's head over a document that already carries the
// global head config. It is pure string work, so it is tested directly rather than
// through a full build: the integration suite proves the wiring, these prove the
// edge cases that made this function grow its comments.
const page = (head) => `<!doctype html><html><head>\n${head}\n</head><body><div id="root"></div></body></html>`;

describe('injectMetaTags', () => {
    test('returns the document untouched when the route declares no head', () => {
        const html = page('  <title>Global</title>');

        expect(injectMetaTags(html, {})).toBe(html);
        expect(injectMetaTags(html, null)).toBe(html);
    });

    test('returns the document untouched when there is no head to anchor on', () => {
        const html = '<html><body>no head here</body></html>';

        expect(injectMetaTags(html, { title: 'Route' })).toBe(html);
    });

    test('a route title replaces the global one instead of queueing behind it', () => {
        const result = injectMetaTags(page('  <title>Global</title>'), { title: 'Route' });

        expect(result.match(/<title>/g)).toHaveLength(1);
        expect(result).toContain('<title>Route</title>');
        expect(result).not.toContain('<title>Global</title>');
    });

    test('a route description replaces the global one', () => {
        const html = page('  <meta name="description" content="Global">');

        const result = injectMetaTags(html, { meta: [{ name: 'description', content: 'Route' }] });

        expect(result.match(/name="description"/g)).toHaveLength(1);
        expect(result).toContain('content="Route"');
        expect(result).not.toContain('content="Global"');
    });

    test('matches a global tag regardless of how its attribute is quoted', () => {
        const html = page("  <meta name='description' content='Global'>");

        const result = injectMetaTags(html, { meta: [{ name: 'description', content: 'Route' }] });

        expect(result.match(/name=["']description["']/g)).toHaveLength(1);
        expect(result).not.toContain('Global');
    });

    test('an og: property is replaced by property, not by name', () => {
        const html = page('  <meta property="og:title" content="Global">');

        const result = injectMetaTags(html, {
            meta: [{ property: 'og:title', content: 'Route' }],
        });

        expect(result.match(/property="og:title"/g)).toHaveLength(1);
        expect(result).toContain('content="Route"');
    });

    test('a canonical link is replaced, other links accumulate', () => {
        const html = page(
            '  <link rel="canonical" href="https://example.com/old">\n' +
            '  <link rel="stylesheet" href="/app.css">',
        );

        const result = injectMetaTags(html, {
            link: [{ rel: 'canonical', href: 'https://example.com/new' }],
        });

        expect(result.match(/rel="canonical"/g)).toHaveLength(1);
        expect(result).toContain('https://example.com/new');
        expect(result).not.toContain('https://example.com/old');
        // Stylesheets are not self-identifying: they must survive untouched.
        expect(result).toContain('/app.css');
    });

    test('a meta with neither name nor property is left alone', () => {
        const html = page('  <meta charset="utf-8">');

        const result = injectMetaTags(html, { meta: [{ charset: 'utf-8' }] });

        // Nothing was removed; the route tag is appended alongside.
        expect(result.match(/charset/g).length).toBeGreaterThanOrEqual(2);
    });

    // The regression the `replaceOutsideInertRegions` helper exists for: a tag
    // pattern happily matches inside a comment or a script body, where the text
    // merely looks like markup. Stripping it there leaves the real tag in place
    // (so the page ships two titles) and corrupts the script.
    describe('inert regions are never treated as markup', () => {
        test('a title inside an inline script is not mistaken for the real one', () => {
            const html = page(
                '  <script>const tpl = "<title>Not the real one</title>";</script>\n' +
                '  <title>Global</title>',
            );

            const result = injectMetaTags(html, { title: 'Route' });

            // The script body survives byte for byte.
            expect(result).toContain('const tpl = "<title>Not the real one</title>";');
            // And the real title was the one replaced.
            expect(result).toContain('<title>Route</title>');
            expect(result).not.toContain('<title>Global</title>');
        });

        test('a meta inside an HTML comment is not mistaken for the real one', () => {
            const html = page(
                '  <!-- <meta name="description" content="Commented out"> -->\n' +
                '  <meta name="description" content="Global">',
            );

            const result = injectMetaTags(html, {
                meta: [{ name: 'description', content: 'Route' }],
            });

            expect(result).toContain('<!-- <meta name="description" content="Commented out"> -->');
            expect(result).toContain('content="Route"');
            expect(result).not.toContain('content="Global"');
        });
    });

    // Anchoring on the FIRST `</head>` lands the tags inside an inline script that
    // merely contains the literal, dropping them from the head entirely.
    test('tags are anchored on the last </head>, not a literal inside a script', () => {
        const html = page('  <script>const s = "</head>";</script>');

        const result = injectMetaTags(html, { title: 'Route' });

        expect(result).toContain('const s = "</head>";');
        // The title landed in the real head: before the body, after the script.
        const titleIndex = result.indexOf('<title>Route</title>');
        const bodyIndex = result.indexOf('<body>');
        expect(titleIndex).toBeGreaterThan(-1);
        expect(titleIndex).toBeLessThan(bodyIndex);
    });

    test('a name containing regex metacharacters is matched literally', () => {
        const html = page('  <meta name="a.b*c" content="Global">');

        const result = injectMetaTags(html, { meta: [{ name: 'a.b*c', content: 'Route' }] });

        expect(result.match(/name="a\.b\*c"/g)).toHaveLength(1);
        expect(result).toContain('content="Route"');
    });

    test('removing a tag does not leave a blank line where it stood', () => {
        const html = page('  <title>Global</title>');

        const result = injectMetaTags(html, { title: 'Route' });

        expect(result).not.toMatch(/\n[ \t]*\n[ \t]*\n/);
    });
});

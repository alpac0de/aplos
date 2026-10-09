import { describe, test, expect } from 'bun:test';
import { extractParams, resolveRouteMeta } from '../../src/runtime/route-meta.js';

describe('route meta params', () => {
    // React Router hands the client decoded params; the pattern path read the
    // raw pathname, so a meta function saw `Jane%20Doe` on one side only.
    test('decodes URL segments, as the router does', () => {
        expect(extractParams('/users/[name]', '/users/Jane%20Doe')).toEqual({ name: 'Jane Doe' });
        expect(extractParams('/docs/[...path]', '/docs/a%20b/c')).toEqual({ path: 'a b/c' });
    });

    test('keeps a segment that is not valid percent-encoding as it is', () => {
        expect(extractParams('/users/[name]', '/users/100%')).toEqual({ name: '100%' });
    });

    test('names params after the file pattern when no paths source is set', () => {
        const meta = (url, params) => ({ title: params.path });

        expect(resolveRouteMeta({ meta, pattern: '/docs/[...path]' }, '/docs/a/b')).toEqual({ title: 'a/b' });
    });
});

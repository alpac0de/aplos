import { describe, test, expect } from 'bun:test';
import { matchRoute } from '../../src/command/router.js';

// `aplos router:match <url>` answers "does this URL hit one of my routes, and
// with what params". `matchRoute` is that answer, so it is tested directly.
describe('matchRoute: static paths', () => {
    test('matches an exact path', () => {
        expect(matchRoute('/', '/').match).toBe(true);
        expect(matchRoute('/about', '/about').match).toBe(true);
    });

    test('does not match a different path', () => {
        expect(matchRoute('/about', '/contact').match).toBe(false);
        expect(matchRoute('/about/team', '/about').match).toBe(false);
    });

    // A literal `.` in a path used to be compiled as "any character", so
    // `/docs/axb` wrongly matched the page at `/docs/a.b`.
    test('a dot in a static path is literal, not a wildcard', () => {
        expect(matchRoute('/docs/a.b', '/docs/a.b').match).toBe(true);
        expect(matchRoute('/docs/axb', '/docs/a.b').match).toBe(false);
    });

    test('a plus in a static path does not blow up the pattern', () => {
        expect(matchRoute('/c++', '/c++').match).toBe(true);
        expect(matchRoute('/cc', '/c++').match).toBe(false);
    });
});

// The regression this file exists for. `buildRouter` turns `[...slug]` into `*`,
// so catch-alls are ordinary framework output, yet `*` was compiled as a
// quantifier on the preceding slash. Every catch-all route reported "does not
// match any route" while `router:debug` listed it one line above.
describe('matchRoute: catch-all routes', () => {
    test('a catch-all matches a single segment', () => {
        expect(matchRoute('/blog/hello', '/blog/*').match).toBe(true);
    });

    test('a catch-all matches several segments', () => {
        expect(matchRoute('/blog/2024/01/post', '/blog/*').match).toBe(true);
    });

    test('a root-level catch-all matches', () => {
        expect(matchRoute('/anything', '/*').match).toBe(true);
        expect(matchRoute('/a/b/c', '/*').match).toBe(true);
    });

    test('a catch-all does not match its bare prefix', () => {
        // `/blog/*` describes something *under* /blog.
        expect(matchRoute('/blog', '/blog/*').match).toBe(false);
    });
});

describe('matchRoute: params and requirements', () => {
    test('binds a param with no requirement', () => {
        const result = matchRoute('/blog/42', '/blog/:id');

        expect(result.match).toBe(true);
        expect(result.params).toEqual({ id: '42' });
    });

    test('a param does not span a slash by default', () => {
        expect(matchRoute('/blog/a/b', '/blog/:id').match).toBe(false);
    });

    test('honours a requirement', () => {
        expect(matchRoute('/blog/42', '/blog/:id', { id: '\\d+' }).match).toBe(true);
        expect(matchRoute('/blog/abc', '/blog/:id', { id: '\\d+' }).match).toBe(false);
    });

    test('binds several params in order', () => {
        const result = matchRoute('/u/7/p/9', '/u/:uid/p/:pid');

        expect(result.params).toEqual({ uid: '7', pid: '9' });
    });

    // A requirement bringing its own capture group used to shift every later
    // param onto its neighbour's value: `pid` came back as `1` instead of `2`.
    test('a requirement carrying its own group does not shift the others', () => {
        const result = matchRoute('/u/1/p/2', '/u/:uid/p/:pid', {
            uid: '(\\d+)',
            pid: '\\d+',
        });

        expect(result.params).toEqual({ uid: '1', pid: '2' });
    });

    test('an alternation requirement binds the whole match', () => {
        const result = matchRoute('/u/ab/p/2', '/u/:uid/p/:pid', {
            uid: '(a|b)+',
            pid: '\\d+',
        });

        expect(result.params).toEqual({ uid: 'ab', pid: '2' });
    });

    test('an escaped parenthesis in a requirement stays literal', () => {
        const result = matchRoute('/x/a(b', '/x/:v', { v: 'a\\(b' });

        expect(result.params).toEqual({ v: 'a(b' });
    });

    test('a parenthesis inside a character class is not a group', () => {
        expect(matchRoute('/x/a', '/x/:v', { v: '[(]?a' }).params).toEqual({ v: 'a' });
    });

    // A typo in aplos.config.js must not take the CLI down with it.
    test('a malformed requirement reports no match instead of throwing', () => {
        expect(() => matchRoute('/x/y', '/x/:v', { v: '([unclosed' })).not.toThrow();
        expect(matchRoute('/x/y', '/x/:v', { v: '([unclosed' }).match).toBe(false);
    });
});

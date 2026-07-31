import { describe, test, expect, afterEach } from 'bun:test';
import { buildRouter } from '../../src/build/router.js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const dirs = [];

async function scaffold(files) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aplos-layouts-'));
    dirs.push(dir);

    for (const [file, contents] of Object.entries(files)) {
        const target = path.join(dir, 'src', 'pages', file);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, contents, 'utf-8');
    }

    return dir;
}

async function buildTree(dir) {
    const original = process.cwd;
    process.cwd = () => dir;
    try {
        await buildRouter({ routes: [] });
    } finally {
        process.cwd = original;
    }

    return fs.readFile(path.join(dir, '.aplos', 'cache', 'routes.js'), 'utf-8');
}

/** Finds the node wrapping `component`, and returns the paths nested under it. */
function childPathsOf(routesSource, component) {
    // routes.js is generated JS, not JSON, so the tree is read by locating the
    // component and scanning its `children` block.
    const marker = `element: ${component}`;
    const start = routesSource.indexOf(marker);
    if (start === -1) return null;

    const childrenIndex = routesSource.indexOf('children:', start);
    if (childrenIndex === -1) return null;

    // Walk to the matching closing bracket of the children array.
    const open = routesSource.indexOf('[', childrenIndex);
    let depth = 0;
    let end = open;
    for (; end < routesSource.length; end++) {
        if (routesSource[end] === '[') depth++;
        else if (routesSource[end] === ']') {
            depth--;
            if (depth === 0) break;
        }
    }

    const block = routesSource.slice(open, end);
    return [...block.matchAll(/path:\s*"([^"]*)"/g)].map((m) => m[1]);
}

const PAGE = 'export default () => null';
const LAYOUT = 'export default ({ children }) => children';

afterEach(async () => {
    while (dirs.length) {
        await fs.rm(dirs.pop(), { recursive: true, force: true });
    }
});

// Nested layouts were emitted into pages.js but never reached the route tree:
// scanLayouts keyed the map with a path.join prefix (`blog`) while the tree
// builder looked up a route path (`/blog`). The lookup never hit, so a project
// following the documented `_layout.jsx` convention got a flat tree, the layout
// silently absent and bundled but unused.
describe('nested layouts reach the route tree', () => {
    test('a page under a directory with _layout is nested inside it', async () => {
        const dir = await scaffold({
            'index.jsx': PAGE,
            'blog/_layout.jsx': LAYOUT,
            'blog/index.jsx': PAGE,
        });

        const routes = await buildTree(dir);

        expect(routes).toContain('BlogLayout');
        expect(childPathsOf(routes, 'BlogLayout')).toEqual(['/blog']);
    });

    test('every page under the layout directory is nested, siblings are not', async () => {
        const dir = await scaffold({
            'index.jsx': PAGE,
            'about.jsx': PAGE,
            'blog/_layout.jsx': LAYOUT,
            'blog/index.jsx': PAGE,
            'blog/post.jsx': PAGE,
        });

        const routes = await buildTree(dir);

        const nested = childPathsOf(routes, 'BlogLayout');
        expect(nested).toContain('/blog');
        expect(nested).toContain('/blog/post');
        expect(nested).not.toContain('/');
        expect(nested).not.toContain('/about');
    });

    // `/blogger` starts with `/blog` as a string but is not nested under it.
    // Both directories need their own layout for this to bite: the nesting is
    // decided by comparing layout keys, so a sibling without one is never a
    // candidate in the first place.
    test('a sibling layout sharing a name prefix is not nested inside it', async () => {
        const dir = await scaffold({
            'index.jsx': PAGE,
            'blog/_layout.jsx': LAYOUT,
            'blog/index.jsx': PAGE,
            'blogger/_layout.jsx': LAYOUT,
            'blogger/index.jsx': PAGE,
        });

        const routes = await buildTree(dir);

        // BloggerLayout must be a sibling of BlogLayout, not one of its children.
        expect(childPathsOf(routes, 'BlogLayout')).toEqual(['/blog']);
        expect(childPathsOf(routes, 'BloggerLayout')).toEqual(['/blogger']);
        expect(routes.indexOf('BloggerLayout')).toBeGreaterThan(-1);
    });

    test('a project with no nested layout still builds a flat tree', async () => {
        const dir = await scaffold({
            'index.jsx': PAGE,
            'about.jsx': PAGE,
        });

        const routes = await buildTree(dir);

        expect(routes).toContain('AppLayout');
        const paths = childPathsOf(routes, 'AppLayout');
        expect(paths).toContain('/');
        expect(paths).toContain('/about');
    });
});

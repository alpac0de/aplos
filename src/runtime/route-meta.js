/**
 * Resolves a page's `meta` export for a URL. Shared by the SSG and the client,
 * so a route gets the same head whether it was pre-rendered or navigated to.
 */

/** A URL segment as the page means it (`Jane%20Doe` is `Jane Doe`), as React Router decodes it. */
function decode(segment) {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
}

/**
 * Params named after the page's source pattern (`/docs/[...path]` gives
 * `{ path: 'a/b' }`), for routes expanded from `paths`.
 */
export function extractParams(sourcePath, url) {
    if (!sourcePath) {
        return {};
    }
    const sourceSegments = sourcePath.split('/').filter(Boolean);
    const urlSegments = url.split('/').filter(Boolean);
    const params = {};
    for (let i = 0; i < sourceSegments.length; i++) {
        const seg = sourceSegments[i];
        const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
        if (catchAll) {
            params[catchAll[1]] = urlSegments.slice(i).map(decode).join('/');
            return params;
        }
        const dynamic = seg.match(/^\[(.+)\]$/);
        if (dynamic) {
            params[dynamic[1]] = decode(urlSegments[i]);
        }
    }
    return params;
}

/**
 * The meta object for `url`: an object export as is, a function export called
 * with the URL and its params, named after the page's pattern: the `paths`
 * source it was expanded from, else its own file pattern. `params` is the
 * fallback for a route that carries neither.
 */
export function resolveRouteMeta({ meta, sourcePath, pattern }, url, params = {}) {
    if (meta === undefined || meta === null) {
        return null;
    }
    if (typeof meta !== 'function') {
        return meta;
    }
    try {
        const source = sourcePath || pattern;
        const result = meta(url, source ? extractParams(source, url) : params);
        return result && typeof result === 'object' ? result : null;
    } catch (err) {
        console.error(`meta() threw for ${url}:`, err.message);
        return null;
    }
}

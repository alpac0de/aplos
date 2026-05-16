/**
 * Sentinel returned by a route middleware to ask Aplos to navigate elsewhere
 * before the matched route renders.
 *
 * A middleware returns the result of `redirect(...)` to short-circuit
 * navigation. Returning `undefined` (or nothing) lets navigation proceed.
 *
 * @example
 *   import { redirect } from 'aplos/redirect';
 *
 *   export default function middleware({ pathname }) {
 *     const token = localStorage.getItem('token');
 *     if (!token && pathname !== '/login') {
 *       return redirect('/login');
 *     }
 *   }
 *
 * @param {string} to - Destination path (e.g. `/login`).
 * @param {{ replace?: boolean }} [options] - `replace: true` (default) swaps
 *   the current history entry so the guarded URL is not kept in history.
 *   Pass `replace: false` to push a new entry instead.
 * @returns {{ __aplosRedirect: true, to: string, replace: boolean }}
 */
export function redirect(to, options = {}) {
    if (typeof to !== 'string' || to.length === 0) {
        throw new TypeError(`redirect(): "to" must be a non-empty string, received ${typeof to}`);
    }
    return {
        __aplosRedirect: true,
        to,
        replace: options.replace !== false,
    };
}

/**
 * @param {unknown} value
 * @returns {value is { __aplosRedirect: true, to: string, replace: boolean }}
 */
export function isRedirect(value) {
    return (
        typeof value === 'object' &&
        value !== null &&
        value.__aplosRedirect === true &&
        typeof value.to === 'string'
    );
}

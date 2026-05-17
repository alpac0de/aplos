/**
 * Default route middleware used when a project does not define
 * `src/middleware.{ts,tsx,js,jsx}`. It never redirects, so navigation always
 * proceeds unchanged.
 *
 * @returns {undefined}
 */
export default function middleware() {
    return undefined;
}

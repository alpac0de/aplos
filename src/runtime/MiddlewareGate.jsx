import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import userMiddleware from '@aplos_middleware';
import defaultMiddleware from 'aplos/internal/default-middleware';
import { isRedirect } from './redirect.js';

// When the project defines no `src/middleware.*`, the generated cache
// re-exports the framework no-op, so `userMiddleware` is identically the
// default function (ESM re-export preserves reference identity). In that
// case there is no decision to make: skip the gate entirely so apps that
// don't use middleware pay zero cost — no `null` frame, no extra render,
// no layout effect on every navigation.
const HAS_MIDDLEWARE = userMiddleware !== defaultMiddleware;

// A middleware can redirect to a path it also intercepts. If the chain never
// reaches a route that renders (each target redirects again), navigation never
// settles: the app freezes on a blank `null` with navigate() looping. No
// amount of documentation prevents a user from writing that by accident, so
// the runtime breaks the loop itself. This bounds *consecutive* redirects
// with no route rendered in between — a legitimate auth→onboarding→dashboard
// hop is a handful; anything past this is a cycle.
const MAX_REDIRECT_CHAIN = 20;

/**
 * Runs the project route middleware before the matched route renders.
 *
 * Placed inside `<BrowserRouter>` and wrapping `<Routes>`, it intercepts every
 * navigation: it calls the user middleware with the current location, and if
 * the middleware returns `redirect(...)` it navigates away *before* committing
 * the guarded route to the DOM. This avoids the "flash of protected content"
 * you get when guarding inside a `useEffect` in a layout/page.
 *
 * The decision runs synchronously in a layout effect (pre-paint). While a
 * redirect is pending we render `null` so the guarded tree is never painted.
 *
 * A middleware may be sync or async. Async middleware cannot block the first
 * paint (we can't await before rendering), so it renders `null` until the
 * promise settles — async is intended for cases where a brief blank frame is
 * acceptable (e.g. token refresh). Prefer sync middleware for auth guards.
 */
export default function MiddlewareGate({ children }) {
    // `HAS_MIDDLEWARE` is a module constant — it never changes for the life of
    // the process — so branching on it here does not violate the Rules of
    // Hooks: a given render path always calls the same hooks. Apps without a
    // middleware render through with no gate machinery at all.
    if (!HAS_MIDDLEWARE) {
        return children;
    }
    return <ActiveMiddlewareGate>{children}</ActiveMiddlewareGate>;
}

function ActiveMiddlewareGate({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    // Key the decision on the full location so back/forward and query changes
    // re-run the middleware. `null` => undecided (don't paint yet).
    const [decidedFor, setDecidedFor] = useState(null);
    const pendingRef = useRef(null);
    // Counts consecutive redirects with no route rendered in between. Reset to
    // 0 whenever a navigation is allowed through (a route renders), so it only
    // grows while the middleware is bouncing the user without ever settling.
    const redirectChainRef = useRef(0);

    const locationKey = location.pathname + location.search;

    useLayoutEffect(() => {
        let cancelled = false;

        function letThrough() {
            redirectChainRef.current = 0;
            setDecidedFor(locationKey);
        }

        function applyResult(result) {
            if (cancelled) return;
            if (isRedirect(result)) {
                if (redirectChainRef.current >= MAX_REDIRECT_CHAIN) {
                    // The middleware is in a redirect cycle (e.g. it redirects
                    // to a path it also intercepts, with no exit condition).
                    // Fail open like a thrown middleware: a guard bug must not
                    // freeze the app. The user sees the route instead of a
                    // hung blank page, and the error names the cause.
                    console.error(
                        `[aplos] route middleware redirected ${redirectChainRef.current} ` +
                        `times without settling — aborting the redirect chain to ` +
                        `avoid an infinite loop. Check that your redirect target ` +
                        `is not itself redirected (its condition must become ` +
                        `false after the redirect).`,
                    );
                    letThrough();
                    return;
                }
                redirectChainRef.current += 1;
                navigate(result.to, { replace: result.replace });
                // Leave `decidedFor` unset for this location: the navigate()
                // will change the location and re-run this effect for the new
                // target, which is where the decision that matters is made.
                return;
            }
            letThrough();
        }

        let result;
        try {
            result = userMiddleware({
                pathname: location.pathname,
                search: location.search,
                searchParams: new URLSearchParams(location.search),
                hash: location.hash,
                state: location.state,
            });
        } catch (error) {
            // A throwing middleware must not wedge navigation. Surface it and
            // fail open (let the route render) so the app stays usable.
            console.error('[aplos] route middleware threw:', error);
            letThrough();
            return () => {
                cancelled = true;
            };
        }

        if (result && typeof result.then === 'function') {
            const token = {};
            pendingRef.current = token;
            Promise.resolve(result)
                .then((resolved) => {
                    if (pendingRef.current === token) applyResult(resolved);
                })
                .catch((error) => {
                    if (pendingRef.current !== token) return;
                    console.error('[aplos] async route middleware rejected:', error);
                    if (!cancelled) letThrough();
                });
        } else {
            applyResult(result);
        }

        return () => {
            cancelled = true;
        };
    }, [locationKey, location.pathname, location.search, location.hash, location.state, navigate]);

    if (decidedFor !== locationKey) {
        return null;
    }

    return children;
}

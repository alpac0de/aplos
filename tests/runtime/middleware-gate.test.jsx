import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Registered here rather than through a global `bunfig.toml` preload: the build
// tests run in a plain Node-like environment and must keep doing so. Registering
// per-file keeps the DOM confined to the runtime suite. The guard matters because
// a second register() throws ("Happy DOM has already been globally registered").
if (typeof window === 'undefined') {
    GlobalRegistrator.register();
}

// `@aplos_middleware` and `aplos/internal/default-middleware` are rspack aliases:
// neither resolves on disk under `bun test`, so both must be mocked before the
// component is imported.
//
// The user middleware is mocked as a stable function that forwards to a mutable
// holder. Swapping `holder.impl` per test changes behaviour WITHOUT changing the
// module's export identity, which matters because MiddlewareGate computes
// `HAS_MIDDLEWARE = userMiddleware !== defaultMiddleware` once at import time.
// Re-mocking with a fresh function per test would be a no-op at best, and would
// silently flip that constant at worst.
const holder = { impl: () => undefined };

mock.module('@aplos_middleware', () => ({
    default: (context) => holder.impl(context),
}));

mock.module('aplos/internal/default-middleware', () => ({
    default: function defaultMiddleware() {
        return undefined;
    },
}));

const React = await import('react');
const { createRoot } = await import('react-dom/client');

const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { redirect } = await import('../../src/runtime/redirect.js');
// Imported AFTER the mocks so its module-level `HAS_MIDDLEWARE` sees them.
const MiddlewareGate = (await import('../../src/runtime/MiddlewareGate.jsx')).default;

// A real timer flush rather than `act()`: the gate settles through a layout
// effect, a microtask and (for async middleware) a promise, and act() would mask
// ordering bugs between them. 60ms is far longer than any of those need.
function flush(ms = 60) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

let container;
let root;
let consoleErrors;
let originalConsoleError;

beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    consoleErrors = [];
    originalConsoleError = console.error;
    console.error = (...args) => {
        consoleErrors.push(args.map(String).join(' '));
    };
});

afterEach(() => {
    console.error = originalConsoleError;
    root.unmount();
    container.remove();
    holder.impl = () => undefined;
});

// Renders the gate over two routes: `/dashboard` is guarded, `/login` is the
// redirect target. Returns the DOM after everything has settled.
async function renderGate({ initial = '/dashboard', onRender } = {}) {
    function Guarded() {
        if (onRender) onRender();
        return <p>SECRET</p>;
    }

    root.render(
        <MemoryRouter initialEntries={[initial]}>
            <MiddlewareGate>
                <Routes>
                    <Route path="/dashboard" element={<Guarded />} />
                    <Route path="/login" element={<p>LOGIN</p>} />
                    <Route path="/onboarding" element={<p>ONBOARDING</p>} />
                </Routes>
            </MiddlewareGate>
        </MemoryRouter>,
    );

    await flush();
    return container.innerHTML;
}

describe('MiddlewareGate: redirect on cold load', () => {
    // The regression this suite exists for. A sync middleware redirecting on the
    // very first mount used to leave the app on a permanently blank page:
    // react-router v7 drops a navigate() issued synchronously from a mount-time
    // layout effect. This is the exact case the docs recommend for auth guards
    // (`redirect('/login')`), and the user hits it by pasting a protected URL.
    test('a sync middleware redirecting on first mount lands on the target', async () => {
        holder.impl = ({ pathname }) => (pathname === '/dashboard' ? redirect('/login') : undefined);

        const html = await renderGate();

        expect(html).toContain('LOGIN');
        expect(html).not.toBe('');
    });

    test('the guarded route is never rendered when the middleware redirects', async () => {
        holder.impl = ({ pathname }) => (pathname === '/dashboard' ? redirect('/login') : undefined);

        let guardedRenders = 0;
        await renderGate({ onRender: () => { guardedRenders += 1; } });

        // The whole point of deciding in a layout effect: the protected tree must
        // never be committed, not even for one frame.
        expect(guardedRenders).toBe(0);
    });

    // Unmounting between the layout effect and the queued microtask must not
    // throw or warn: the redirect is fired one microtask later, by which point a
    // route change or a hot update may have torn the tree down.
    //
    // Honest scope note: this asserts the teardown is clean, NOT that the
    // `cancelled` guard inside the microtask is present. Removing that guard
    // keeps this test green, because navigating an unmounted MemoryRouter is
    // silently inert. Proving the guard would need the router instrumented, and
    // mocking `react-router-dom` wholesale breaks the other tests in this file.
    // The guard is still correct (it avoids the work and matches the effect's
    // own cleanup contract); it is simply not pinned by a test.
    test('unmounting with a redirect in flight is clean', async () => {
        holder.impl = ({ pathname }) => (pathname === '/dashboard' ? redirect('/login') : undefined);

        root.render(
            <MemoryRouter initialEntries={['/dashboard']}>
                <MiddlewareGate>
                    <Routes>
                        <Route path="/dashboard" element={<p>SECRET</p>} />
                        <Route path="/login" element={<p>LOGIN</p>} />
                    </Routes>
                </MiddlewareGate>
            </MemoryRouter>,
        );

        // Unmount synchronously: the layout effect has run and queued the
        // microtask, but the microtask has not fired yet.
        root.unmount();
        await flush();

        expect(container.innerHTML).toBe('');
        expect(consoleErrors.join('\n')).not.toContain('unmounted');

        // afterEach unmounts again; make that a no-op rather than a double
        // unmount on an already-torn-down root.
        root = createRoot(document.createElement('div'));
    });

    test('an async middleware redirecting on first mount lands on the target', async () => {
        holder.impl = async ({ pathname }) => (pathname === '/dashboard' ? redirect('/login') : undefined);

        const html = await renderGate();

        expect(html).toContain('LOGIN');
    });

    test('a redirect chain settles on the final destination', async () => {
        holder.impl = ({ pathname }) => {
            if (pathname === '/dashboard') return redirect('/onboarding');
            if (pathname === '/onboarding') return redirect('/login');
            return undefined;
        };

        const html = await renderGate();

        expect(html).toContain('LOGIN');
    });
});

describe('MiddlewareGate: letting navigation through', () => {
    test('renders the route when the middleware returns nothing', async () => {
        holder.impl = () => undefined;

        const html = await renderGate();

        expect(html).toContain('SECRET');
    });

    test('passes the location to the middleware', async () => {
        let received = null;
        holder.impl = (context) => { received = context; };

        await renderGate({ initial: '/dashboard?tab=billing#top' });

        expect(received).not.toBeNull();
        expect(received.pathname).toBe('/dashboard');
        expect(received.search).toBe('?tab=billing');
        expect(received.searchParams.get('tab')).toBe('billing');
        expect(received.hash).toBe('#top');
    });
});

describe('MiddlewareGate: failure modes must not wedge the app', () => {
    test('a throwing middleware fails open and renders the route', async () => {
        holder.impl = () => {
            throw new Error('boom');
        };

        const html = await renderGate();

        expect(html).toContain('SECRET');
        expect(consoleErrors.join('\n')).toContain('route middleware threw');
    });

    test('a rejected async middleware fails open and renders the route', async () => {
        holder.impl = () => Promise.reject(new Error('nope'));

        const html = await renderGate();

        expect(html).toContain('SECRET');
        expect(consoleErrors.join('\n')).toContain('async route middleware rejected');
    });

    // A middleware that redirects to a path it also intercepts would loop
    // forever, freezing the app on a blank page. The gate bounds the chain and
    // fails open instead.
    test('an unsettling redirect cycle is aborted and the route renders', async () => {
        // Every path redirects somewhere else: the chain never settles.
        holder.impl = ({ pathname }) =>
            (pathname === '/login' ? redirect('/dashboard') : redirect('/login'));

        const html = await renderGate();

        // Failing open means *something* renders rather than a hung blank page.
        expect(html).not.toBe('');
        expect(consoleErrors.join('\n')).toContain('without settling');
    });
});

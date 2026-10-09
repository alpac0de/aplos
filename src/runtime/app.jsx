import React, { createElement, useMemo } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, useRoutes } from 'react-router-dom';

import { routeTree } from '@aplos_routes';
import { CustomError, NoMatch } from '@aplos_pages';
import { reactStrictMode } from '@aplos_head';

import ErrorBoundary from './ErrorBoundary.jsx';
import { toRouteObjects } from './route-objects.js';
import DefaultErrorPage from './DefaultErrorPage.jsx';
import MiddlewareGate from './MiddlewareGate.jsx';
import RouteHead from './route-head.js';

function AppRoutes({ routes }) {
    return useRoutes(routes);
}

function App() {
    const ErrorComponent = CustomError || DefaultErrorPage;
    const routes = useMemo(() => [
        ...toRouteObjects(routeTree),
        { path: '*', element: createElement(NoMatch) },
    ], []);

    return (
        <ErrorBoundary errorComponent={ErrorComponent}>
            <BrowserRouter>
                <MiddlewareGate>
                    {/* Before the routes: its effect runs first, so a page's own
                        <Head> still has the last word on the tags it sets. */}
                    <RouteHead routes={routes} />
                    <AppRoutes routes={routes} />
                </MiddlewareGate>
            </BrowserRouter>
        </ErrorBoundary>
    );
}

const container = document.getElementById('root');

function appElement() {
    if (reactStrictMode) {
        const { StrictMode } = React;
        return <StrictMode><App /></StrictMode>;
    }
    return <App />;
}

// A `use static` build pre-renders the page HTML into `#root`. When that markup
// is present we must hydrate it (attach to the existing DOM) rather than
// createRoot (which discards the server markup and re-renders from scratch —
// losing the SSG paint and risking a flash). An empty `#root` means a SPA-only
// route or the dev server, where there is nothing to hydrate.
//
// Test for an element child rather than hasChildNodes(): a stray whitespace
// text node from template formatting must not be mistaken for pre-rendered
// markup, which would trigger hydration on an effectively empty root.
const isPrerendered = container.firstElementChild !== null;

// Reuse the React root across hot updates so HMR re-renders instead of
// recreating the root (which would force a full reload).
const hotRoot = module.hot && module.hot.data && module.hot.data.root;

let root;
function render() {
    if (hotRoot) {
        root = hotRoot;
        root.render(appElement());
    } else if (isPrerendered) {
        // hydrateRoot takes the initial element at creation time; it does not
        // need a separate render() call for the first commit.
        root = hydrateRoot(container, appElement());
    } else {
        root = createRoot(container);
        root.render(appElement());
    }
}

render();

if (module.hot) {
    // Accept updates here so React Refresh commits them without a full reload.
    module.hot.accept();
    module.hot.dispose((data) => {
        data.root = root;
    });
}

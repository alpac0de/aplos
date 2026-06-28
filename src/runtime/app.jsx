import React, { createElement, useEffect } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Routes, BrowserRouter, Route } from 'react-router-dom';

import { routeTree } from '@aplos_routes';
import { CustomError, NoMatch } from '@aplos_pages';
import headConfig, { reactStrictMode } from '@aplos_head';

import ErrorBoundary from './ErrorBoundary.jsx';
import DefaultErrorPage from './DefaultErrorPage.jsx';
import MiddlewareGate from './MiddlewareGate.jsx';

const MANAGED_ATTR = "data-head-default";

function renderRoutes(nodes) {
    return nodes.map((node, i) => {
        if (node.children) {
            return (
                <Route key={i} element={createElement(node.element)}>
                    {renderRoutes(node.children)}
                </Route>
            );
        }
        return <Route key={i} path={node.path} element={createElement(node.element)} />;
    });
}

function HeadDefaults() {
    useEffect(() => {
        if (!headConfig) return;

        const { defaultTitle, meta = [], link = [], script = [] } = headConfig;

        if (defaultTitle) {
            document.title = defaultTitle;
        }

        const elements = [];

        meta.forEach((m) => {
            const el = document.createElement('meta');
            Object.entries(m).forEach(([key, value]) => el.setAttribute(key, value));
            el.setAttribute(MANAGED_ATTR, 'true');
            document.head.appendChild(el);
            elements.push(el);
        });

        link.forEach((l) => {
            const el = document.createElement('link');
            Object.entries(l).forEach(([key, value]) => el.setAttribute(key, value));
            el.setAttribute(MANAGED_ATTR, 'true');
            document.head.appendChild(el);
            elements.push(el);
        });

        script.forEach((s) => {
            const el = document.createElement('script');
            Object.entries(s).forEach(([key, value]) => {
                if (key === 'innerHTML') {
                    el.textContent = value;
                } else if (typeof value === 'boolean') {
                    if (value) el.setAttribute(key, '');
                } else {
                    el.setAttribute(key, value);
                }
            });
            el.setAttribute(MANAGED_ATTR, 'true');
            document.head.appendChild(el);
            elements.push(el);
        });

        return () => {
            elements.forEach((el) => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        };
    }, []);

    return null;
}

function App() {
    const ErrorComponent = CustomError || DefaultErrorPage;

    return (
        <>
            <HeadDefaults />
            <ErrorBoundary errorComponent={ErrorComponent}>
                <BrowserRouter>
                    <MiddlewareGate>
                        <Routes>
                            {renderRoutes(routeTree)}
                            <Route path="*" element={createElement(NoMatch)} />
                        </Routes>
                    </MiddlewareGate>
                </BrowserRouter>
            </ErrorBoundary>
        </>
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

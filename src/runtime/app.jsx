import React, { createElement, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Routes, BrowserRouter, Route } from 'react-router-dom';

import { routeTree } from '@aplos_routes';
import { CustomError, NoMatch } from '@aplos_pages';
import headConfig, { reactStrictMode } from '@aplos_head';

import ErrorBoundary from './ErrorBoundary.jsx';
import DefaultErrorPage from './DefaultErrorPage.jsx';

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
                    <Routes>
                        {renderRoutes(routeTree)}
                        <Route path="*" element={createElement(NoMatch)} />
                    </Routes>
                </BrowserRouter>
            </ErrorBoundary>
        </>
    );
}

const container = document.getElementById('root');
const root = createRoot(container);

if (reactStrictMode) {
    const { StrictMode } = React;
    root.render(<StrictMode><App /></StrictMode>);
} else {
    root.render(<App />);
}

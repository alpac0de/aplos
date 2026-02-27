import React, { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Routes, BrowserRouter, Route } from 'react-router-dom';

import { routeTree } from '@aplos_routes';
import { CustomError, NoMatch } from '@aplos_pages';
import headConfig, { reactStrictMode } from '@aplos_head';

import ErrorBoundary from './ErrorBoundary.jsx';
import DefaultErrorPage from './DefaultErrorPage.jsx';

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
    if (!headConfig) return null;

    const { defaultTitle, titleTemplate, meta = [], link = [], script = [] } = headConfig;

    if (!defaultTitle && !titleTemplate && meta.length === 0 && link.length === 0 && script.length === 0) {
        return null;
    }

    const helmetProps = {};
    if (defaultTitle) helmetProps.defaultTitle = defaultTitle;
    if (titleTemplate) helmetProps.titleTemplate = titleTemplate;

    return (
        <Helmet {...helmetProps}>
            {meta.map((m, i) => <meta key={i} {...m} />)}
            {link.map((l, i) => <link key={i} {...l} />)}
            {script.map((s, i) => <script key={i} {...s} />)}
        </Helmet>
    );
}

function App() {
    const ErrorComponent = CustomError || DefaultErrorPage;

    return (
        <HelmetProvider>
            <HeadDefaults />
            <ErrorBoundary errorComponent={ErrorComponent}>
                <BrowserRouter>
                    <Routes>
                        {renderRoutes(routeTree)}
                        <Route path="*" element={createElement(NoMatch)} />
                    </Routes>
                </BrowserRouter>
            </ErrorBoundary>
        </HelmetProvider>
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

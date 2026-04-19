import React, { createElement } from 'react';
import { StaticRouter, Routes, Route } from 'react-router';

import { routeTree } from '@aplos_routes';
import { CustomError, NoMatch } from '@aplos_pages';
import { reactStrictMode } from '@aplos_head';

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

export default function AppSSR({ url }) {
    const ErrorComponent = CustomError || DefaultErrorPage;
    const tree = (
        <ErrorBoundary errorComponent={ErrorComponent}>
            <StaticRouter location={url}>
                <Routes>
                    {renderRoutes(routeTree)}
                    <Route path="*" element={createElement(NoMatch)} />
                </Routes>
            </StaticRouter>
        </ErrorBoundary>
    );

    if (reactStrictMode) {
        const { StrictMode } = React;
        return <StrictMode>{tree}</StrictMode>;
    }
    return tree;
}

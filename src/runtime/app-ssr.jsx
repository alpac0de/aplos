import React, { createElement } from 'react';
import { StaticRouter, useRoutes } from 'react-router';

import { routeTree } from '@aplos_routes';
import { CustomError, NoMatch } from '@aplos_pages';
import { reactStrictMode } from '@aplos_head';

import ErrorBoundary from './ErrorBoundary.jsx';
import { toRouteObjects } from './route-objects.js';
import DefaultErrorPage from './DefaultErrorPage.jsx';

function AppRoutes() {
    return useRoutes([
        ...toRouteObjects(routeTree),
        { path: '*', element: createElement(NoMatch) },
    ]);
}

export default function AppSSR({ url }) {
    const ErrorComponent = CustomError || DefaultErrorPage;
    const tree = (
        <ErrorBoundary errorComponent={ErrorComponent}>
            <StaticRouter location={url}>
                <AppRoutes />
            </StaticRouter>
        </ErrorBoundary>
    );

    if (reactStrictMode) {
        const { StrictMode } = React;
        return <StrictMode>{tree}</StrictMode>;
    }
    return tree;
}

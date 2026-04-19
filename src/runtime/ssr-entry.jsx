import React from 'react';
import { renderToString } from 'react-dom/server';
import AppSSR from './app-ssr.jsx';
import { routeTree } from '@aplos_routes';

export function render(url) {
    return renderToString(<AppSSR url={url} />);
}

function isStaticPath(p) {
    if (!p) {
        return false;
    }
    if (p.includes(':')) {
        return false;
    }
    if (p.includes('*')) {
        return false;
    }
    return true;
}

function walk(nodes, acc, forceAll) {
    for (const node of nodes) {
        if (node.path !== undefined && isStaticPath(node.path)) {
            if (forceAll || node.static === true) {
                acc.push(node.path);
            }
        }
        if (node.children) {
            walk(node.children, acc, forceAll);
        }
    }
}

export function getStaticRoutes({ forceAll = false } = {}) {
    const acc = [];
    walk(routeTree, acc, forceAll);
    return Array.from(new Set(acc));
}

export default { render, getStaticRoutes };

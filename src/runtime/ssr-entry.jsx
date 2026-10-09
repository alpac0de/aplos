import React from 'react';
import { renderToString } from 'react-dom/server';
import AppSSR from './app-ssr.jsx';
import { routeTree } from '@aplos_routes';
import { resolveRouteMeta } from './route-meta.js';

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

function collectNodes(nodes, acc) {
    for (const node of nodes) {
        acc.push(node);
        if (node.children) {
            collectNodes(node.children, acc);
        }
    }
    return acc;
}

/**
 * Dynamic routes marked static that no `paths` entry expanded. `walk` has to skip
 * them since there is no concrete URL to render, so they are reported instead of
 * being dropped without a word.
 */
export function getUnexpandedStaticRoutes() {
    const nodes = collectNodes(routeTree, []);
    const expanded = new Set(
        nodes
            .filter((node) => node.sourcePath)
            .map((node) => node.sourcePath.replace(/\[\.\.\..*?]/g, '*').replace(/\[(.*?)]/g, ':$1'))
    );

    return nodes
        .filter((node) => node.static === true && node.path !== undefined && !isStaticPath(node.path))
        .filter((node) => !expanded.has(node.path))
        .map((node) => node.path);
}

function findRouteModule(nodes, url) {
    for (const node of nodes) {
        if (node.children) {
            const found = findRouteModule(node.children, url);
            if (found) return found;
        }
        if (node.path !== undefined && node.path === url) {
            return node;
        }
    }
    return null;
}

/**
 * Return the `meta` export of the page module matching `url`, if any.
 * Pages opt in by exporting `export const meta = { title, description, ... }`
 * or `export const meta = (url, params) => ({ ... })` for per-instance values.
 * When the matched node carries an inline `meta` (from a `paths` entry), that
 * value wins over the component-level export.
 * @param {string} url
 * @returns {object|null}
 */
export function getRouteMeta(url) {
    const node = findRouteModule(routeTree, url);
    return node ? resolveRouteMeta(node, url) : null;
}

export default { render, getStaticRoutes, getUnexpandedStaticRoutes, getRouteMeta };

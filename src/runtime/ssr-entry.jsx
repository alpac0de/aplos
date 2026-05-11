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

function extractParams(sourcePath, url) {
    if (!sourcePath) {
        return {};
    }
    const sourceSegments = sourcePath.split('/').filter(Boolean);
    const urlSegments = url.split('/').filter(Boolean);
    const params = {};
    for (let i = 0; i < sourceSegments.length; i++) {
        const seg = sourceSegments[i];
        const catchAll = seg.match(/^\[\.\.\.(.+)\]$/);
        if (catchAll) {
            params[catchAll[1]] = urlSegments.slice(i).join('/');
            return params;
        }
        const dynamic = seg.match(/^\[(.+)\]$/);
        if (dynamic) {
            params[dynamic[1]] = urlSegments[i];
        }
    }
    return params;
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
    if (!node || node.meta === undefined || node.meta === null) {
        return null;
    }
    if (typeof node.meta === 'function') {
        const params = extractParams(node.sourcePath, url);
        try {
            const result = node.meta(url, params);
            return result && typeof result === 'object' ? result : null;
        } catch (err) {
            console.error(`meta() threw for ${url}:`, err.message);
            return null;
        }
    }
    return node.meta;
}

export default { render, getStaticRoutes, getRouteMeta };

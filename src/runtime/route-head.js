import { useEffect } from 'react';
import { matchRoutes, useLocation } from 'react-router-dom';

import headConfig from '@aplos_head';

import { toHeadElements, mergeHead, identityOf, escapeScript, isValidAttributeName } from '../build/head.js';
import { resolveRouteMeta } from './route-meta.js';

/** The <head> tag whose identity key is `key`, read back from its attributes. */
function findTag(tag, key) {
    for (const candidate of document.head.querySelectorAll(tag)) {
        const attrs = {};
        for (const { name, value } of candidate.attributes) {
            attrs[name] = value;
        }
        if (identityOf({ tag, attrs }) === key) {
            return candidate;
        }
    }
    return null;
}

function createTag(element) {
    const tag = document.createElement(element.tag);
    for (const [name, value] of Object.entries(element.attrs || {})) {
        // Dropped as the serializer drops it: setAttribute would throw on it.
        if (value !== false && value !== null && value !== undefined && isValidAttributeName(name)) {
            tag.setAttribute(name, value === true ? '' : String(value));
        }
    }
    if (element.children) {
        // Escaped as the SSG writes it, so a pre-rendered script is recognized
        // instead of being added and run a second time. The escape reads the
        // same once the script runs.
        tag.textContent = element.tag === 'script' ? escapeScript(element.children) : element.children;
    }
    return tag;
}

/** Writes a tag that exists once, replacing its current version if it differs. */
function writeSingleton(element) {
    const tag = createTag(element);
    const existing = findTag(element.tag, identityOf(element));
    if (!existing) {
        document.head.appendChild(tag);
    } else if (!existing.isEqualNode(tag)) {
        existing.replaceWith(tag);
    }
}

// What the previous route put in the head, so the next one can take it back:
// the identity keys it set, and the repeatable tags (an alternate link, a
// script) that came from its meta rather than from the configured head.
let previousKeys = new Set();
let previousTags = [];
// The title a route without one falls back to. Read from the document on the
// first pass when that route sets none, so a title hardcoded in a custom
// template survives; the configured default otherwise.
let baselineTitle = null;

/**
 * Keeps the head in step with the route on client-side navigation, the way the
 * SSG writes it at build time: the configured head merged with the page's meta.
 * On a pre-rendered page the first pass finds every tag already in place.
 */
export default function RouteHead({ routes }) {
    // Meta only depends on the path. Reacting to a query or hash change would
    // rewrite the head under a page that stays mounted, overriding what its own
    // <Head> set, which does not run again.
    const { pathname } = useLocation();

    useEffect(() => {
        const matches = matchRoutes(routes, pathname) || [];
        const match = matches[matches.length - 1];
        const meta = match?.route.handle
            ? resolveRouteMeta(match.route.handle, pathname, match.params)
            : null;

        const routeElements = toHeadElements(meta || {});
        const elements = mergeHead(toHeadElements(headConfig || {}), routeElements);

        // Tags that exist once: written over, whatever set them.
        const singletons = elements.filter((element) => {
            const key = identityOf(element);
            return key !== null && key !== 'meta:charset';
        });
        const keys = new Set(singletons.map(identityOf));

        if (baselineTitle === null) {
            baselineTitle = toHeadElements(headConfig || {}).find((e) => e.tag === 'title')?.children
                ?? (routeElements.some((e) => e.tag === 'title') ? '' : document.title);
        }
        if (!keys.has('title')) {
            document.title = baselineTitle;
        }
        for (const element of singletons) {
            if (element.tag === 'title') {
                document.title = element.children;
            } else {
                writeSingleton(element);
            }
        }
        for (const key of previousKeys) {
            if (!keys.has(key) && key !== 'title') {
                findTag(key.split(':')[0], key)?.remove();
            }
        }
        previousKeys = keys;

        // Repeatable tags from the route's meta. The ones already in the head,
        // written by the SSG or kept from the previous route, are reused rather
        // than added twice; the previous route's leftovers are removed.
        // A tag the configured head already provides belongs to it, not to the
        // route, and must survive the route's departure.
        const globalTags = toHeadElements(headConfig || {})
            .filter((e) => identityOf(e) === null)
            .map(createTag);
        const tags = [];
        for (const element of routeElements.filter((e) => identityOf(e) === null)) {
            const wanted = createTag(element);
            if (globalTags.some((tag) => tag.isEqualNode(wanted))) {
                continue;
            }
            const existing = [...document.head.querySelectorAll(element.tag)]
                .find((candidate) => candidate.isEqualNode(wanted) && !tags.includes(candidate));
            if (existing) {
                tags.push(existing);
            } else {
                document.head.appendChild(wanted);
                tags.push(wanted);
            }
        }
        for (const tag of previousTags) {
            if (!tags.includes(tag)) {
                tag.remove();
            }
        }
        previousTags = tags;
    }, [routes, pathname]);

    return null;
}

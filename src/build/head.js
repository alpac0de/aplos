// The single owner of everything that goes inside <head>.
//
// This used to be two independent implementations: a plugin rewriting the emitted
// HTML in rspack.config.js, and injectMetaTags() rewriting it again in ssg.js.
// They disagreed on where the head ends (last vs first `</head>`), on how to
// escape, and on what a tag even is, which is why the same class of bug was found
// and fixed three times (85532c5, ba56556, fdc9342) and still lived on in the SSG
// path. Both now build the same descriptors and go through the same serializer.

// A tag is described, never spelled out as a string, so it can be merged by
// identity and escaped in exactly one place.
const IDENTITY = {
    title: () => 'title',
    meta: (attrs) => {
        if (attrs.name) return `meta:name=${attrs.name}`;
        if (attrs.property) return `meta:property=${attrs.property}`;
        if (attrs.httpEquiv || attrs['http-equiv']) {
            return `meta:http-equiv=${attrs.httpEquiv || attrs['http-equiv']}`;
        }
        if (attrs.charset) return 'meta:charset';
        return null;
    },
    link: (attrs) => (attrs.rel === 'canonical' ? 'link:rel=canonical' : null),
};

// HTML attribute names, per the spec's sane subset. Anything else would let a key
// carrying `>` or a quote close the tag and inject markup: the values were escaped
// here, but the keys never were, and og/twitter keys can come straight from a CMS.
const VALID_ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9:_.-]*$/;

/** Whether `name` can be written as an attribute; anything else is dropped. */
export function isValidAttributeName(name) {
    return VALID_ATTRIBUTE_NAME.test(name);
}

/** Escapes character data. `<title>` holds text, so quotes are fine, brackets are not. */
export function escapeText(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Makes a script body safe to inline. It is raw text, so entities would reach
 * the script verbatim (`&&` turning into `&amp;&amp;`). Two things are broken
 * up, following the HTML parser: `</script`, which ends the element early, and
 * a `<script` that follows a `<!--`, the one pairing that switches the parser
 * into a state where the real closing tag no longer counts. A `<!--` alone (an
 * old-style comment) and a `<script` alone (`a <script` is code) stay as they
 * are. `<` reads as `<` in a JavaScript string and in JSON, so an
 * `application/ld+json` body stays valid.
 */
export function escapeScript(value) {
    const body = String(value).replace(/<(?=\/script)/gi, '\\u003C');
    const comment = body.indexOf('<!--');
    if (comment === -1) {
        return body;
    }
    return body.slice(0, comment) + body.slice(comment).replace(/<(?=script)/gi, '\\u003C');
}

/** Escapes an attribute value, which sits inside double quotes. */
export function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Turns an aplos `head` config, or a page's `meta` export, into tag descriptors.
 * Both shapes are accepted so the client build and the SSG describe head the same way.
 */
export function toHeadElements(config = {}) {
    const elements = [];

    const title = config.title || config.defaultTitle;
    if (title) elements.push({ tag: 'title', children: String(title) });

    if (config.description) {
        elements.push({ tag: 'meta', attrs: { name: 'description', content: config.description } });
    }

    if (config.canonical) {
        elements.push({ tag: 'link', attrs: { rel: 'canonical', href: config.canonical } });
    }

    if (Array.isArray(config.keywords) && config.keywords.length > 0) {
        elements.push({ tag: 'meta', attrs: { name: 'keywords', content: config.keywords.join(', ') } });
    }

    for (const [key, content] of Object.entries(config.og || {})) {
        elements.push({ tag: 'meta', attrs: { property: `og:${key}`, content } });
    }

    for (const [key, content] of Object.entries(config.twitter || {})) {
        elements.push({ tag: 'meta', attrs: { name: `twitter:${key}`, content } });
    }

    for (const attrs of config.meta || []) {
        if (attrs && typeof attrs === 'object') {
            // `httpEquiv` is accepted, but the attribute is spelled `http-equiv`;
            // the browser would otherwise read it back as `httpequiv`.
            const { httpEquiv, ...rest } = attrs;
            elements.push({ tag: 'meta', attrs: httpEquiv === undefined ? attrs : { 'http-equiv': httpEquiv, ...rest } });
        }
    }

    for (const attrs of config.link || []) {
        if (attrs && typeof attrs === 'object') elements.push({ tag: 'link', attrs });
    }

    for (const entry of config.script || []) {
        if (entry && typeof entry === 'object') {
            // `innerHTML` is the script's body, not an attribute: written out as
            // one, an inline script was never executed.
            const { innerHTML, ...attrs } = entry;
            elements.push({ tag: 'script', attrs, children: innerHTML === undefined ? '' : String(innerHTML) });
        }
    }

    return elements;
}

/**
 * Merges page-level tags over global ones.
 *
 * Tags that can only appear once (the title, a given meta name, the canonical
 * link) are keyed by identity and the page wins. Everything else accumulates.
 * Without this, a page that sets its own description shipped two of them.
 */
/**
 * The key a tag is merged on (`title`, `meta:name=description`, …), or null for
 * a tag that can legitimately appear several times.
 */
export function identityOf({ tag, attrs = {} }) {
    const identify = IDENTITY[tag];
    const key = identify ? identify(attrs) : null;
    return key === undefined ? null : key;
}

export function mergeHead(globalElements = [], routeElements = []) {
    const merged = [];
    const byIdentity = new Map();

    for (const element of [...globalElements, ...routeElements]) {
        const key = identityOf(element);

        if (key === null) {
            merged.push(element);
            continue;
        }

        if (byIdentity.has(key)) {
            merged[byIdentity.get(key)] = element;
        } else {
            byIdentity.set(key, merged.length);
            merged.push(element);
        }
    }

    return merged;
}

/** Serializes one tag. The only place a head tag becomes a string. */
function renderElement({ tag, attrs = {}, children }) {
    const rendered = Object.entries(attrs)
        .filter(([name, value]) => {
            if (value === false || value === null || value === undefined) return false;
            // A key that cannot be a valid attribute name is dropped rather than
            // written out, where it could close the tag and inject markup.
            return isValidAttributeName(name);
        })
        .map(([name, value]) => (value === true ? name : `${name}="${escapeAttribute(value)}"`))
        .join(' ');

    const open = rendered ? `<${tag} ${rendered}>` : `<${tag}>`;

    if (children === undefined) return open;

    if (tag === 'script') return `${open}${escapeScript(children)}</${tag}>`;

    return `${open}${escapeText(children)}</${tag}>`;
}

/** Serializes head tags, ready to be placed inside <head>. */
export function renderHead(elements, indent = '    ') {
    return elements
        .map((element) => `${indent}${renderElement(element)}`)
        .join('\n');
}

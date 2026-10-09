// Hydrates a pre-rendered page in happy-dom: starts from the HTML the SSG wrote,
// runs the client bundle over it, and prints, as JSON, the resulting #root and
// every error React reported along the way. Runs as its own process so the DOM
// globals it registers never leak into the test runner.
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import fs from 'node:fs';
import path from 'node:path';

const [distDir, url, page, navigateTo] = process.argv.slice(2);
// The bundles are evaluated by hand below; happy-dom must not fetch anything.
GlobalRegistrator.register({
    url: `http://localhost${url}`,
    settings: {
        disableJavaScriptFileLoading: true,
        disableCSSFileLoading: true,
        // A head script from a CDN is skipped, not reported as a page error.
        handleDisabledFileLoadingAsSuccess: true,
    },
});

// Rebuild the whole emitted document, head and <html> attributes included: a
// page reading `document.title` or a body attribute while rendering must see
// what the browser would.
const html = fs.readFileSync(path.join(distDir, page), 'utf8');
const htmlOpen = html.match(/<html([^>]*)>/i);
document.documentElement.innerHTML = html.slice(
    htmlOpen ? htmlOpen.index + htmlOpen[0].length : 0,
    html.toLowerCase().lastIndexOf('</html>'),
);
if (htmlOpen) {
    const probe = document.createElement('div');
    probe.innerHTML = `<div${htmlOpen[1]}></div>`;
    for (const { name, value } of probe.firstChild.attributes) {
        document.documentElement.setAttribute(name, value);
    }
}

// The title the emitted document carries, before any client code runs.
const emittedTitle = document.title;

// A production build reports a mismatch through more than one channel: a
// console.error for a recoverable error, a window error event or an uncaught
// exception otherwise. Any of them counts.
const errors = [];
console.error = (...args) => { errors.push(args.map(String).join(' ')); };
window.addEventListener('error', (event) => { errors.push(String(event.message || event.error)); });
process.on('uncaughtException', (error) => { errors.push(String(error && error.message)); });

// Only the bundles emitted into dist/: a head script from a CDN is not ours to run.
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((src) => !/^(?:[a-z]+:)?\/\//i.test(src));
for (const src of scripts) {
    // Indirect eval runs each chunk in the global scope, as a <script> would.
    (0, eval)(fs.readFileSync(path.join(distDir, src.replace(/^\//, '')), 'utf8'));
}

// Hydration and the errors it raises land asynchronously; 200ms was measured
// to miss them on a page with a few dozen components.
await new Promise((resolve) => setTimeout(resolve, 2000));
const result = {
    root: document.getElementById('root').innerHTML,
    emittedTitle,
    title: document.title,
    head: document.head.innerHTML,
    errors,
};

// Optionally follow a client-side navigation, the way a link click would: a
// history entry, then the popstate the router listens to.
if (navigateTo) {
    window.history.pushState({}, '', navigateTo);
    window.dispatchEvent(new window.PopStateEvent('popstate', { state: {} }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    result.afterNavigation = {
        root: document.getElementById('root').innerHTML,
        title: document.title,
        head: document.head.innerHTML,
    };
}

process.stdout.write(JSON.stringify(result));

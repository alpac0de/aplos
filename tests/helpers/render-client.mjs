// Executes a built client bundle in happy-dom at the given URL and prints what
// ended up in #root. Runs as its own process so the DOM globals it registers
// never leak into the test runner.
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import fs from 'node:fs';
import path from 'node:path';

const [distDir, url] = process.argv.slice(2);
GlobalRegistrator.register({ url: `http://localhost${url}` });

const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
document.body.innerHTML = '<div id="root"></div>';

const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
for (const src of scripts) {
    // Indirect eval runs each chunk in the global scope, as a <script> would.
    (0, eval)(fs.readFileSync(path.join(distDir, src.replace(/^\//, '')), 'utf8'));
}

await new Promise((resolve) => setTimeout(resolve, 200));
process.stdout.write(document.getElementById('root').innerHTML);

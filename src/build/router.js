import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildRouter(aplos) {
    const appExtensions = ['.tsx', '.jsx', '.js'];

    let projectDirectory = process.cwd();
    const pageDirectory = path.join(projectDirectory, 'src', 'pages');

    const pages = [];
    const capitalize = s => s && s[0].toUpperCase() + s.slice(1)

    if (!fs.existsSync(pageDirectory)) {
        console.warn("No pages directory found");
        process.exit(0);
        return;
    }

    const filenames = await getFiles(pageDirectory, appExtensions);
    if (filenames.length === 0) {
        console.warn('No page files found in:', pageDirectory);
    }

    // Build layout tree for nested layouts
    const layoutTree = buildLayoutTree(pageDirectory, appExtensions);

    const routes = aplos.routes || [];

    const generateComponentName = (nameParts, fileName) => {
        const parts = nameParts.filter(part => part && part !== fileName);

        const processedParts = parts.map(part => {
            if (part.startsWith('[')) {
                const parentDir = parts[parts.indexOf(part) - 1];
                return parentDir ?
                    capitalize(formatPath(parentDir)) + capitalize(formatPath(part)) :
                    capitalize(formatPath(part));
            }
            return capitalize(formatPath(part));
        });

        processedParts.push(capitalize(formatPath(fileName)));

        return processedParts.join('');
    }

    filenames.forEach(file => {
        let name = file.replace('~', '').replace(/\.(js|tsx|jsx)$/, '');
        let nameParts = name.split('/');
        let fileName = nameParts.pop();

        let capitalizeName = generateComponentName(nameParts, fileName);

        let path;
        if (fileName === 'index') {
            path = nameParts.join('/') || '/';
        } else {
            path = name;
        }

        let found = routes.find(element => element.source === path);
        if (found && found.destination) {
            path = found.destination;
        }

        path = path.replace(/\[\.\.\..*?]/g, '*');
        path = path.replace(/\[(.*?)]/g, ':$1');

        const absolutePageFile = `${pageDirectory}${file.replace('~', '')}`;
        const staticDirective = hasUseStaticDirective(absolutePageFile);

        let existingPage = pages.find(p => p.path === path);
        if (!existingPage) {
            const config = {
                "path": path,
                "component": capitalizeName,
                "file": file.replaceAll('//', '/'),
                "requirement": {},
                "static": staticDirective
            };

            routes.push(config);
            pages.push(config);
        }
    });

    // Expand `paths` declared in route entries into concrete static pages that
    // share the component of their matching catch-all. Lets the SSG pre-render
    // each URL without asking the user to split the catch-all into many files.
    const configuredRoutes = aplos.routes || [];
    for (const entry of configuredRoutes) {
        if (!entry || !entry.paths || !entry.source) {
            continue;
        }
        const catchAllPath = entry.source.replace(/\[\.\.\..*?]/g, '*').replace(/\[(.*?)]/g, ':$1');
        const catchAll = pages.find(p => p.path === catchAllPath);
        if (!catchAll) {
            console.warn(`Route config: no page matches source "${entry.source}" — skipping paths expansion.`);
            continue;
        }
        let paths = entry.paths;
        if (typeof paths === 'function') {
            try {
                paths = paths();
            } catch (error) {
                console.error(`Route config: paths() threw for source "${entry.source}":`, error.message);
                continue;
            }
        }
        if (!Array.isArray(paths)) {
            console.warn(`Route config: paths for "${entry.source}" must be an array or a function returning one.`);
            continue;
        }
        for (const concretePath of paths) {
            if (typeof concretePath !== 'string' || !concretePath.startsWith('/')) {
                continue;
            }
            if (pages.find(p => p.path === concretePath)) {
                continue;
            }
            pages.push({
                path: concretePath,
                component: catchAll.component,
                file: catchAll.file,
                requirement: {},
                static: true,
            });
        }
    }

    // Detect _app, _404, _error files
    const appFile = findSpecialFile(pageDirectory, '_app', appExtensions);
    const notFoundFile = findSpecialFile(pageDirectory, '_404', appExtensions);
    const errorFile = findSpecialFile(pageDirectory, '_error', appExtensions);

    // Generate pages.js (re-exports for all pages + special files). Pages
    // expanded from `routes[].paths` reuse the same component as their
    // catch-all parent, so we dedupe exports by component name here.
    const pagesExports = [];
    const exportedComponents = new Set();
    pages.forEach(page => {
        if (exportedComponents.has(page.component)) {
            return;
        }
        exportedComponents.add(page.component);
        const componentFileName = page.file.replace('~', '');
        pagesExports.push(`export { default as ${page.component} } from "${projectDirectory}/src/pages${componentFileName}";`);
    });

    // Layout exports
    layoutTree.forEach(layout => {
        pagesExports.push(`export { default as ${layout.component} } from "${projectDirectory}/src/pages/${layout.file}";`);
    });

    // AppLayout
    if (appFile) {
        pagesExports.push(`export { default as AppLayout } from "${projectDirectory}/src/pages/${appFile}";`);
    } else {
        pagesExports.push(`export { default as AppLayout } from "aplos/internal/passthrough-layout";`);
    }

    // NoMatch (404)
    if (notFoundFile) {
        pagesExports.push(`export { default as NoMatch } from "${projectDirectory}/src/pages/${notFoundFile}";`);
    } else {
        pagesExports.push(`export { default as NoMatch } from "aplos/internal/default-not-found";`);
    }

    // CustomError (optional)
    if (errorFile) {
        pagesExports.push(`export { default as CustomError } from "${projectDirectory}/src/pages/${errorFile}";`);
    } else {
        pagesExports.push(`export const CustomError = null;`);
    }

    // Build nested route tree as JS data
    const nestedRoutes = buildNestedRoutes(pages, layoutTree);

    // Generate routes.js
    const routesFileContent = generateRoutesFile(nestedRoutes);

    // Generate head.js
    const headFileContent = generateHeadFile(aplos.head || {}, aplos.reactStrictMode);

    // Ensure cache directory exists and write files
    try {
        const cacheDir = path.join(projectDirectory, '.aplos', 'cache');
        await fs.promises.mkdir(cacheDir, { recursive: true });

        await fs.promises.writeFile(
            path.join(cacheDir, 'router.js'),
            JSON.stringify(routes)
        );
        await fs.promises.writeFile(
            path.join(cacheDir, 'pages.js'),
            pagesExports.join('\n') + '\n'
        );
        await fs.promises.writeFile(
            path.join(cacheDir, 'routes.js'),
            routesFileContent
        );
        await fs.promises.writeFile(
            path.join(cacheDir, 'head.js'),
            headFileContent
        );
        await fs.promises.writeFile(
            path.join(cacheDir, 'config.js'),
            `export default ${JSON.stringify(aplos, null, 2)};`
        );
    } catch (error) {
        console.error('Failed to write cache files:', error.message);
        throw error;
    }
}

/**
 * Find a special file (_app, _404, _error) in the pages directory
 */
function findSpecialFile(pageDirectory, baseName, extensions) {
    return extensions
        .map(ext => `${baseName}${ext}`)
        .find(file => {
            try {
                return fs.existsSync(path.join(pageDirectory, file));
            } catch (error) {
                return false;
            }
        }) || null;
}

/**
 * Generate routes.js content — pure JS, no JSX
 */
function generateRoutesFile(routeTree) {
    const names = collectComponentNames(routeTree);
    const lines = [];
    lines.push(`import { ${names.join(', ')} } from './pages.js';`);
    lines.push('');
    lines.push(`export const routeTree = ${serializeRouteTree(routeTree)};`);
    return lines.join('\n') + '\n';
}

/**
 * Collect all component names referenced in the route tree
 */
function collectComponentNames(nodes) {
    const names = new Set();
    function walk(nodes) {
        for (const node of nodes) {
            if (node.component) names.add(node.component);
            if (node.children) walk(node.children);
        }
    }
    walk(nodes);
    return Array.from(names);
}

/**
 * Serialize route tree to JS source (references to imported components, not strings)
 */
function serializeRouteTree(nodes, indent = '') {
    const inner = indent + '  ';
    const items = nodes.map(node => {
        const parts = [];
        if (node.component) parts.push(`${inner}element: ${node.component}`);
        if (node.path !== undefined) parts.push(`${inner}path: ${JSON.stringify(node.path)}`);
        if (node.static === true) parts.push(`${inner}static: true`);
        if (node.children) {
            parts.push(`${inner}children: ${serializeRouteTree(node.children, inner)}`);
        }
        return `${indent}{\n${parts.join(',\n')}\n${indent}}`;
    });
    return `[\n${items.join(',\n')}\n${indent}]`;
}

/**
 * Generate head.js content — pure JS
 */
function generateHeadFile(head, reactStrictMode) {
    const { defaultTitle, titleTemplate, meta = [], link = [], script = [] } = head;
    const headObj = {};
    if (defaultTitle) headObj.defaultTitle = defaultTitle;
    if (titleTemplate) headObj.titleTemplate = titleTemplate;
    if (meta.length > 0) headObj.meta = meta;
    if (link.length > 0) headObj.link = link;
    if (script.length > 0) headObj.script = script;

    const lines = [];
    lines.push(`export default ${JSON.stringify(headObj, null, 2)};`);
    lines.push(`export const reactStrictMode = ${!!reactStrictMode};`);
    return lines.join('\n') + '\n';
}

/**
 * Detect a leading `'use static'` / `"use static"` directive in a page file.
 * Scans the first non-empty, non-comment lines before any code/import.
 * @param {string} filePath
 * @returns {boolean}
 */
function hasUseStaticDirective(filePath) {
    try {
        const source = fs.readFileSync(filePath, 'utf-8');
        const lines = source.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line === '') {
                continue;
            }
            if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                continue;
            }
            if (line === `'use static';` || line === `"use static";` || line === `'use static'` || line === `"use static"`) {
                return true;
            }
            return false;
        }
    } catch (error) {
        return false;
    }
    return false;
}

/**
 *
 * @param {string} dirPath
 * @param {string[]} extensions
 * @returns {Promise<string[]>}
 */
export async function getFiles(dirPath, extensions) {
    const patterns = extensions.map(ext => `**/*${ext}`);
    const globPattern = patterns.length === 1 ? patterns[0] : `{${patterns.join(',')}}`;

    try {
        const files = await glob(globPattern, {
            cwd: dirPath,
            ignore: ['**/_*'] // ignore files starting with _
        });

        return files.map(file => '/' + file);
    } catch (error) {
        console.error(`Error globbing files in ${dirPath}:`, error);
        return [];
    }
}

/**
 *
 * @param {string} path
 * @returns {string}
 */
export function formatPath(path) {
    return path.replace(/\.\.\./g, '').replace(/[\[\]_-]/g, '');
}

/**
 * Build nested layout tree by scanning for _layout files
 * @param {string} pageDirectory
 * @param {string[]} extensions
 * @returns {Map<string, object>}
 */
function buildLayoutTree(pageDirectory, extensions) {
    const layouts = new Map();

    function generateLayoutName(pathPrefix) {
        if (!pathPrefix || pathPrefix === '/') return 'RootLayout';
        return pathPrefix.split('/').filter(Boolean).map(part =>
            part.charAt(0).toUpperCase() + formatPath(part.slice(1))
        ).join('') + 'Layout';
    }

    function scanLayouts(dir, pathPrefix = '') {
        const layoutFile = extensions
            .map(ext => `_layout${ext}`)
            .find(file => {
                try {
                    return fs.existsSync(path.join(dir, file));
                } catch (error) {
                    return false;
                }
            });

        if (layoutFile) {
            const layoutPath = pathPrefix ? path.join(pathPrefix, layoutFile) : layoutFile;
            layouts.set(pathPrefix || '/', {
                file: layoutPath,
                component: generateLayoutName(pathPrefix),
                path: pathPrefix || '/'
            });
        }

        // Scan subdirectories recursively
        try {
            const subdirs = fs.readdirSync(dir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('_'))
                .map(dirent => dirent.name);

            subdirs.forEach(subdir => {
                const newPathPrefix = pathPrefix ? path.join(pathPrefix, subdir) : subdir;
                scanLayouts(
                    path.join(dir, subdir),
                    newPathPrefix
                );
            });
        } catch (error) {
            // Ignore directories we can't read
        }
    }

    scanLayouts(pageDirectory);
    return layouts;
}

/**
 * Build nested route structure with layouts
 * Returns a JS array (data) instead of JSX strings
 * @param {Array} pages
 * @param {Map} layoutTree
 * @returns {Array}
 */
function buildNestedRoutes(pages, layoutTree) {
    // Group pages by their directory path
    const routesByPath = new Map();

    pages.forEach(page => {
        const pagePath = page.path;
        const segments = pagePath.split('/').filter(Boolean);

        // Find the most specific layout for this page
        let layoutPath = '/';
        for (let i = segments.length; i > 0; i--) {
            const testPath = '/' + segments.slice(0, i).join('/');
            if (layoutTree.has(testPath)) {
                layoutPath = testPath;
                break;
            }
        }

        if (!routesByPath.has(layoutPath)) {
            routesByPath.set(layoutPath, []);
        }
        routesByPath.get(layoutPath).push(page);
    });

    function buildRouteLevel(currentPath = '/') {
        const nodes = [];

        // Add pages for this level
        const pagesAtLevel = routesByPath.get(currentPath) || [];
        pagesAtLevel.forEach(page => {
            const node = { path: page.path, component: page.component };
            if (page.static) {
                node.static = true;
            }
            nodes.push(node);
        });

        // Add nested layouts
        Array.from(layoutTree.keys())
            .filter(layoutPath => layoutPath.startsWith(currentPath) && layoutPath !== currentPath)
            .forEach(layoutPath => {
                const layout = layoutTree.get(layoutPath);
                nodes.push({
                    component: layout.component,
                    children: buildRouteLevel(layoutPath)
                });
            });

        return nodes;
    }

    let innerRoutes = buildRouteLevel();

    // Wrap with root layout if exists
    if (layoutTree.has('/')) {
        const rootLayout = layoutTree.get('/');
        innerRoutes = [{ component: rootLayout.component, children: innerRoutes }];
    }

    // Wrap everything with AppLayout
    return [{ component: 'AppLayout', children: innerRoutes }];
}

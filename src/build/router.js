import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildRouter(aplos) {
    console.info('Building...');
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

        // Générer le path
        let path;
        if (fileName === 'index') {
            // Si c'est un fichier index, utiliser le chemin du dossier parent
            path = nameParts.join('/') || '/';
        } else {
            path = name;
        }

        let found = routes.find(element => element.source === path);
        if (found) {
            path = found.destination;
        }

        path = path.replace(/\[(.*?)]/g, ':$1');

        let existingPage = pages.find(p => p.path === path);
        if (!existingPage) {
            const config = {
                "path": path,
                "component": capitalizeName,
                "file": file.replaceAll('//', '/'),
                "requirement": {}
            };

            routes.push(config);
            pages.push(config);
        }
    });

    // Build nested route structure
    const nestedRoutes = buildNestedRoutes(pages, layoutTree);

    let template = fs.readFileSync(__dirname + "/../../templates/root.jsx").toString();

    template = template.replace('{routes}', nestedRoutes);

    let components = pages.map((route) => {
        const componentFileName = route.file.replace('~', '');

        return `import ${route.component} from "${projectDirectory}/src/pages${componentFileName}";\n`;
    })

    // Add layout imports
    layoutTree.forEach((layout) => {
        components.push(`import ${layout.component} from "${projectDirectory}/src/pages/${layout.file}";\n`);
    });

    const appFileName = '_app';
    const appFile = appExtensions
        .map(ext => `${appFileName}${ext}`)
        .find(file => {
            try {
                return fs.existsSync(path.join(pageDirectory, file));
            } catch (error) {
                console.warn(`Error checking for ${file}:`, error.message);
                return false;
            }
        });

    if (appFile) {
        components.push(`import AppLayout from "${projectDirectory}/src/pages/${appFile}";\n`);
    } else {
        components.push('import { Outlet } from "react-router-dom";')
        components.push(`
        const AppLayout = () => {
            return <Outlet />;
        };\n`);
    }

    if (aplos.reactStrictMode) {
        components.push('import { StrictMode } from "react"; ' + "\n");
        template = template.replace('{strictMode}', '<StrictMode>');
        template = template.replace('{/strictMode}', '</StrictMode>');
    } else {
        template = template.replace('{strictMode}', '');
        template = template.replace('{/strictMode}', '');
    }

    template = template.replace('{components}', components.join(''));

    // Ensure cache directory exists and write files
    try {
        const cacheDir = path.join(projectDirectory, '.aplos', 'cache');
        await fs.promises.mkdir(cacheDir, { recursive: true });

        await fs.promises.writeFile(
            path.join(cacheDir, 'router.js'),
            JSON.stringify(routes)
        );
        await fs.promises.writeFile(
            path.join(cacheDir, 'app.js'),
            template
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
    return path.replace(/[\[\]_-]/g, '');
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
 * @param {Array} pages
 * @param {Map} layoutTree
 * @returns {string}
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

    // Build nested JSX structure
    function buildRouteLevel(currentPath = '/', level = 0) {
        const indent = '                '.repeat(level + 1);
        let routes = '';

        // Add pages for this level
        const pagesAtLevel = routesByPath.get(currentPath) || [];
        pagesAtLevel.forEach(page => {
            routes += `${indent}<Route path="${page.path}" element={<${page.component} />} />\n`;
        });

        // Add nested layouts
        Array.from(layoutTree.keys())
            .filter(layoutPath => layoutPath.startsWith(currentPath) && layoutPath !== currentPath)
            .forEach(layoutPath => {
                const layout = layoutTree.get(layoutPath);
                routes += `${indent}<Route element={<${layout.component} />}>\n`;
                routes += buildRouteLevel(layoutPath, level + 1);
                routes += `${indent}</Route>\n`;
            });

        return routes;
    }

    // Start with app layout wrapping everything
    let routesContent = buildRouteLevel() + '                    <Route path="*" element={<NoMatch />} />';
    
    // Wrap with root layout if exists
    if (layoutTree.has('/')) {
        const rootLayout = layoutTree.get('/');
        routesContent = `<Route element={<${rootLayout.component} />}>\n${routesContent}\n                </Route>`;
    }
    
    // Wrap everything with AppLayout
    return `<Route element={<AppLayout />}>\n                    ${routesContent}\n                </Route>`;
}

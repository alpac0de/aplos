import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

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

    let template = fs.readFileSync(__dirname + "/../../templates/root.jsx").toString();

    let router = pages.map(route => {
        return `<Route path="${route.path}" element={<${route.component} />} />\n`;
    });

    template = template.replace('{routes}', router.join(' '));

    let components = pages.map((route) => {
        const componentFileName = route.file.replace('~', '');

        return `import ${route.component} from "${projectDirectory}/src/pages${componentFileName}";\n`;
    })

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
        components.push(`import Layout from "${projectDirectory}/src/pages/${appFile}";\n`);
    } else {
        components.push('import { Outlet } from "react-router-dom";')
        components.push(`
        const Layout = () => {
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

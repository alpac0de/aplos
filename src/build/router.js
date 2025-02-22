import fs from 'fs';
import path from 'path';

export function buildRouter(aplos) {
    console.log('Building...');

    let projectDirectory = process.cwd();
    const pageDirectory = path.join(projectDirectory, 'src', 'pages');

    const pages = [];
    const capitalize = s => s && s[0].toUpperCase() + s.slice(1)

    if (!fs.existsSync(pageDirectory)) {
        console.log("No pages directory found");
        process.exit(0);
        return;
    }

    const filenames = getFiles(pageDirectory);
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
        let part = nameParts[1] || '';
        let capitalizeName = generateComponentName(nameParts, fileName);
        let path = capitalizeName === 'Index' ? '/' : name;
        let found = routes.find(element => element.source === path);

        if (found) {
            path = found.destination
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

    let router = pages.map((route) => {
        return '<Route path="' + route.path + '" element={<' + route.component + ' /> } /> ' + "\n";
    });

    template = template.replace('{routes}', router.join(' '));

    let components = pages.map((route) => {
        const componentFileName = route.file.replace('~', '');

        return 'import ' + route.component + ' from "' + projectDirectory + '/src/pages' + componentFileName + '"; ' + "\n";
    })

    if (fs.existsSync(pageDirectory + '/_layout.tsx')) {
        components.push('import Layout from "' + projectDirectory + '/src/pages/_layout.tsx"; ' + "\n")
    } else {
        components.push('import Layout from "aplos/layout"; ' + "\n")
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

    fs.writeFileSync(projectDirectory + '/.aplos/cache/router.js', JSON.stringify(routes));
    fs.writeFileSync(projectDirectory + '/.aplos/cache/app.js', template);
}

/**
 *
 * @param {string} dirPath
 * @returns {*[]}
 */
export function getFiles(dirPath) {
    let files = fs.readdirSync(dirPath);
    let fileList = [];
    files.forEach(function (file) {
        if (file.startsWith('_')) {
            return;
        }

        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            fileList = fileList.concat(getFiles(path.join(dirPath, file)));
        } else {
            let filePath = path.join(dirPath, file);
            filePath = filePath.replace(process.cwd() + "/src/pages", "");
            fileList.push(filePath);
        }
    });
    return fileList;
}

/**
 *
 * @param {string} path
 * @returns {string}
 */
export function formatPath(path) {
    return path
        .replaceAll('[', '')
        .replaceAll(']', '')
        .replaceAll('_', '')
        .replaceAll('-', '');
}

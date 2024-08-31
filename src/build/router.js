const fs = require("fs");
const path = require('path');

function buildRouter(aplos) {
    console.log('Building...');

    let projectDirectory = process.cwd();
    const pageDirectory = projectDirectory + '/src/pages';

    const pages = [];
    const capitalize = s => s && s[0].toUpperCase() + s.slice(1)

    if (!fs.existsSync(pageDirectory)) {
        console.log("No pages directory found");
        process.exit(0);
        return;
    }

    let filenames = getFiles(pageDirectory);
    const routes = aplos.rewrites();

    filenames.forEach(file => {
        let name = file.replace('~', '').replace(/\.(js|tsx|jsx)$/, '');
        let nameParts = name.split('/');

        let fileName = nameParts.pop();
        let part = nameParts[1] || '';
        let capitalizeName = capitalize(formatPath(part)) + capitalize(formatPath(fileName));
        let path = capitalizeName === 'Index' ? '/' : name;
        let found = routes.find(element => element.source === path);

        if (found) {
            path = found.destination
        }

        path = path.replace(/\[(.*?)]/g, ':$1');

        let existingPage = pages.find(p => p.path === path);
        if (!existingPage) {
            pages.push({
                "path": path,
                "component": capitalizeName,
                "file": file.replaceAll('//', '/'),
            })
        }
    });

    let template = fs.readFileSync(__dirname + "/../../templates/root.jsx").toString();

    let router = pages.map((route) => {
        return '<Route path="' + route.path + '" element={<' + route.component + ' /> } /> ' + "\n";
    });

    template = template.replace('{routes}', router.join(' '));

    let components = pages.map((route) => {
        return 'import ' + route.component + ' from "' + projectDirectory + '/src/pages' + route.file + '"; ' + "\n";
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


    template = template.replace('{components}', components.join(''));

    fs.writeFileSync(projectDirectory + '/.aplos/cache/app.js', template);
}

/**
 *
 * @param {string} dirPath
 * @returns {*[]}
 */

function getFiles(dirPath) {
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
function formatPath(path) {
    return path
        .replaceAll('[', '')
        .replaceAll(']', '')
        .replaceAll('_', '')
        .replaceAll('-', '');
}

module.exports = {
    buildRouter,
    getFiles,
    formatPath
};

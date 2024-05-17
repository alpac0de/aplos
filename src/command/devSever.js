const path = require("path");
const fs = require("fs");
const Webpack = require('webpack');
let aplos = {
    rewrites: () => []
};

try {
    aplos = require(process.cwd() + "/aplos.config.js");
} catch (error) {
}

console.log(aplos);

module.exports = () => {
    let projectDirectory = process.cwd();

    if (!fs.existsSync(projectDirectory + '/.aplos/')) {
        fs.mkdirSync(projectDirectory + '/.aplos/');
    }

    const pages = [];
    const capitalize = s => s && s[0].toUpperCase() + s.slice(1)

    let filenames = fs.readdirSync(process.cwd() + "/src/pages");
    const routes = aplos.rewrites();

    filenames.forEach(file => {
        let name = file.replace('.js', '');
        let capitalizeName = capitalize(name);
        let path = capitalizeName === 'Index' ? '/':  '/'+ name;

        let found = routes.find(element => element.source === path);

        if (found) {
            path = found.destination
        }

        pages.push({
            "name": capitalizeName,
            "path": path,
            "component": capitalizeName
        })
    });

    let template = fs.readFileSync(__dirname + "/../../templates/root.jsx").toString();

    let router = pages.map((route) => {
        let pathName = formatPath(route.name);

        return '<Route path="' + route.path + '" element="<' + pathName + ' />" />';
    });

    template = template.replace('{routes}', router.join(' '));

    let components = pages.map((route) => {
        let pathName = formatPath(route.name);
        return 'import ' + pathName + ' from "' + projectDirectory + '/src/pages/' + route.name.toLowerCase() + '.js"; ' + "\n";
    })

    template = template.replace('{components}', components.join(''));

    if (!fs.existsSync(projectDirectory + '/.aplos/generated')) {
        fs.mkdirSync(projectDirectory + '/.aplos/generated');
    }

    fs.writeFileSync(projectDirectory + '/.aplos/generated/app.js', template);

    let runtime_dir = __dirname + "/..";

    const WebpackDevServer = require('webpack-dev-server');
    const webpackConfig = require(runtime_dir + '/../webpack.config.js');
    webpackConfig.mode = 'development';
    webpackConfig.entry  = [
        projectDirectory + "/.aplos/generated/app.js"
    ];

    const compiler = Webpack(webpackConfig);
    const devServerOptions = {
        open: false,
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname+ '/../client/', 'public'),
        }
    };
    const server = new WebpackDevServer(devServerOptions, compiler);

    const runServer = async () => {
        console.log('Starting server...');
        await server.start();
    };

    runServer();
}

function formatPath(path) {
    return path.replace('[', '').replace(']', '');
}

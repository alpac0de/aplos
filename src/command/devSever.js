const path = require("path");
const fs = require("fs");
const Webpack = require('webpack');
let ruru = {};

try {
    ruru = require(process.cwd() + "/ruru.config.js");
} catch (error) {
}

console.log(ruru);

module.exports = () => {
    let projectDirectory = process.cwd();

    const pages = [];
    const capitalize = s => s && s[0].toUpperCase() + s.slice(1)

    let filenames = fs.readdirSync(process.cwd() + "/src/pages");
    const routes = ruru.rewrites();

    filenames.forEach(file => {
        let name = file.replace('.js', '');
        let capitalizeName = capitalize(name);
        let path = '/'+ name;

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
        return '<Route path="' + route.path + '"><' + route.name + ' /></Route>';
    });

    template = template.replace('{routes}', router.join(' '));

    let components = pages.map((route) => {
        return 'import ' + route.name + ' from "' + projectDirectory + '/src/pages/' + route.name.toLowerCase() + '.js"; ';
    })

    template = template.replace('{components}', components.join(' '));

    fs.writeFileSync(projectDirectory + '/.ruru/generated/app.js', template);

    let runtime_dir = __dirname + "/..";

    const WebpackDevServer = require('webpack-dev-server');
    const webpackConfig = require(runtime_dir + '/../webpack.config.js');
    webpackConfig.mode = 'development';
    webpackConfig.entry  = [
        projectDirectory + "/.ruru/generated/app.js"
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

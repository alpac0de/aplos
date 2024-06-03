const path = require("path");
const fs = require("fs");
const Webpack = require('webpack');
const {buildRouter} = require('../build/router');
const chokidar = require('chokidar');

let aplos = {
    rewrites: () => []
};

try {
    let config = require(process.cwd() + "/aplos.config.js");
    aplos = {...aplos, ...config};
} catch (error) {
}

console.log(aplos);

fs.writeFileSync(process.cwd() + '/.aplos/cache/config.js', 'module.exports = ' + JSON.stringify(aplos));


module.exports = () => {
    let projectDirectory = process.cwd();
    console.log(projectDirectory);


    const watcher = chokidar.watch(projectDirectory + '/src', {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true
    });

    watcher.on('change', path => {
        console.log(`File ${path} has been changed`);
        buildRouter(aplos);
    });

    watcher.on('add', path => {
        buildRouter(aplos);
    });

    buildRouter(aplos);

    let runtime_dir = __dirname + "/..";

    const WebpackDevServer = require('webpack-dev-server');
    const webpackConfig = require(runtime_dir + '/../webpack.config.js');
    webpackConfig.mode = 'development';
    webpackConfig.entry  = [
        projectDirectory + "/.aplos/cache/app.js"
    ];

    webpackConfig.resolve.alias = {
        '@': projectDirectory + '/src/',
        '@config': projectDirectory + '/.aplos/cache/config.js'
    };

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

    runServer().catch(error => console.error(error));
}




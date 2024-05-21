const path = require("path");
const fs = require("fs");
const Webpack = require('webpack');
const {build, getFiles} = require('../build');
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

    build(aplos);

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




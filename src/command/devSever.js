import path from "path";
import fs from "fs";
import Webpack from "webpack";
import {buildRouter} from "../build/router";
import chokidar from "chokidar";
import get_config from "../build/config";
import WebpackDevServer from "webpack-dev-server";

let config = get_config(process.cwd());

const cacheDirectory = process.cwd() + "/.aplos/cache";

fs.writeFileSync(
    cacheDirectory + "/config.js",
    "module.exports = " + JSON.stringify(config),
);

export default () => {
    let projectDirectory = process.cwd();
    let firstBuild = true;
    buildRouter(config);

    const watcher = chokidar.watch(projectDirectory + "/src", {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    });

    watcher.on("change", (path) => {
        console.log(`File ${path} has been changed`);
        buildRouter(config);
    });

    const changedFiles = [];
    watcher.on("add", (path) => {
        if (firstBuild && !changedFiles.includes(path)) {
            buildRouter(config);
            changedFiles.push(path);
        }

        firstBuild = false;
    });

    watcher.on("unlink", () => {
        buildRouter(config);
    });

    let runtime_dir = __dirname + "/..";

    const webpackConfig = require(runtime_dir + "/../webpack.config.js");
    webpackConfig.mode = "development";
    webpackConfig.entry = [projectDirectory + "/.aplos/cache/app.js"];

    const compiler = Webpack(webpackConfig);
    const devServerOptions = {
        open: false,
        port: config.server.port,
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname + "/../client/", "public"),
        },
    };
    const server = new WebpackDevServer(devServerOptions, compiler);

    const runServer = async () => {
        console.log("Starting server...");
        await server.start();
    };

    runServer().catch((error) => console.error(error));
};

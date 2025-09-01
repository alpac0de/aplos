import path from "path";
import fs from "fs";
import { rspack } from "@rspack/core";
import { RspackDevServer } from "@rspack/dev-server";
import {buildRouter} from "../build/router.js";
import chokidar from "chokidar";
import get_config from "../build/config.js";
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let config = get_config(process.cwd());

const cacheDirectory = process.cwd() + "/.aplos/cache";

fs.writeFileSync(
    cacheDirectory + "/config.js",
    "module.exports = " + JSON.stringify(config),
);

export default async () => {
    let projectDirectory = process.cwd();
    let firstBuild = true;
    await buildRouter(config);

    const watcher = chokidar.watch(projectDirectory + "/src", {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    });

    watcher.on("change", async (path) => {
        console.log(`File ${path} has been changed`);
        await buildRouter(config);
    });

    const changedFiles = [];
    watcher.on("add", async (path) => {
        if (firstBuild && !changedFiles.includes(path)) {
            await buildRouter(config);
            changedFiles.push(path);
        }

        firstBuild = false;
    });

    watcher.on("unlink", async () => {
        await buildRouter(config);
    });

    let runtime_dir = __dirname + "/..";

    const { default: rspackConfig } = await import(runtime_dir + "/../rspack.config.js");
    rspackConfig.mode = "development";
    rspackConfig.entry = [projectDirectory + "/.aplos/cache/app.js"];

    const compiler = rspack(rspackConfig);
    const devServerOptions = {
        hot: true,
        open: false,
        port: config.server.port,
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname + "/../client/", "public"),
        },
    };
    const server = new RspackDevServer(devServerOptions, compiler);

    const runServer = async () => {
        console.log("Starting server...");
        await server.start();
    };

    runServer().catch((error) => console.error(error));
};
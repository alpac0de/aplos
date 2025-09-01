import path from "path";
import fs from "fs";
import { rspack } from "@rspack/core";
import { RspackDevServer } from "@rspack/dev-server";
import {buildRouter} from "../build/router.js";
import chokidar from "chokidar";
import get_config from "../build/config.js";
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Function to check if port is available
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        
        server.on('error', () => resolve(false));
    });
};

// Function to find next available port
const findAvailablePort = async (startPort) => {
    let port = startPort;
    while (port < startPort + 100) { // Try up to 100 ports
        if (await isPortAvailable(port)) {
            return port;
        }
        port++;
    }
    throw new Error(`No available port found starting from ${startPort}`);
};

export default async () => {
    const config = await get_config(process.cwd());
    const cacheDirectory = process.cwd() + "/.aplos/cache";

    // Ensure cache directory exists first
    try {
        if (!fs.existsSync(cacheDirectory)) {
            fs.mkdirSync(cacheDirectory, { recursive: true });
        }
    } catch (err) {
        console.error('Error creating cache directory:', err);
    }

    fs.writeFileSync(
        cacheDirectory + "/config.js",
        "module.exports = " + JSON.stringify(config),
    );
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
    
    // Determine port logic based on environment variable
    let finalPort = config.server.port;
    const isPortExplicitlySet = process.env.APLOS_SERVER_PORT;
    
    // If no explicit port set, find available port
    if (!isPortExplicitlySet) {
        try {
            finalPort = await findAvailablePort(config.server.port);
            if (finalPort !== config.server.port) {
                console.log(`Port ${config.server.port} is busy, using port ${finalPort}`);
            }
        } catch (error) {
            console.error(`Could not find available port: ${error.message}`);
            process.exit(1);
        }
    }
    
    const devServerOptions = {
        hot: true,
        open: false,
        port: finalPort,
        historyApiFallback: true,
        static: {
            directory: path.join(__dirname + "/../client/", "public"),
        },
    };
    const server = new RspackDevServer(devServerOptions, compiler);

    const runServer = async () => {
        console.log(`Starting server on port ${finalPort}...`);
        await server.start();
    };

    runServer().catch((error) => {
        if (isPortExplicitlySet && error.code === 'EADDRINUSE') {
            console.error(`Port ${finalPort} is already in use. Since APLOS_SERVER_PORT is set, refusing to use alternative port.`);
        } else {
            console.error(error);
        }
        process.exit(1);
    });
};
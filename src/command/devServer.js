import path from "path";
import fs from "fs";
import { rspack } from "@rspack/core";
import { RspackDevServer } from "@rspack/dev-server";
import {buildRouter} from "../build/router.js";
import get_config from "../build/config.js";
import { fileURLToPath } from 'url';
import net from 'net';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getNetworkUrl = (port) => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return `http://${iface.address}:${port}`;
            }
        }
    }
    return null;
};

const detectFeatures = (projectDirectory) => {
    const features = [];
    const hasTsConfig = fs.existsSync(path.join(projectDirectory, 'tsconfig.json'));
    const hasPostcss = fs.existsSync(path.join(projectDirectory, 'postcss.config.js'))
        || fs.existsSync(path.join(projectDirectory, 'postcss.config.cjs'));

    if (hasTsConfig) features.push('TypeScript');
    if (hasPostcss) features.push('PostCSS');
    features.push('React Compiler');
    features.push('HMR');

    return features;
};

const printStartupMessage = (port, projectDirectory, readyTime) => {
    const networkUrl = getNetworkUrl(port);
    const features = detectFeatures(projectDirectory);

    console.log();
    console.log('  \x1b[1m\x1b[36mAPLOS\x1b[0m \x1b[2mv0.0.1\x1b[0m  \x1b[32mready in ' + readyTime + 'ms\x1b[0m');
    console.log();
    console.log(`  \x1b[1mLocal:\x1b[0m   http://localhost:${port}/`);
    if (networkUrl) {
        console.log(`  \x1b[1mNetwork:\x1b[0m ${networkUrl}/`);
    }
    console.log(`  \x1b[2m${features.join(' | ')}\x1b[0m`);
    console.log();
};

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
        // The cache is consumed via `import Config from "@config"` (ESM), so it
        // must expose a default export — not CommonJS `module.exports`, which
        // has no `default` binding under ESM linking.
        "export default " + JSON.stringify(config),
    );
    let projectDirectory = process.cwd();

    // Initial build
    const startTime = Date.now();
    console.log('\x1b[36m⚡ Building routes...\x1b[0m');
    const buildStart = performance.now();
    await buildRouter(config);
    console.log(`\x1b[32m✓ Ready in ${Date.now() - startTime}ms\x1b[0m`);

    let runtime_dir = __dirname + "/..";

    const { default: rspackConfig } = await import(runtime_dir + "/../rspack.config.js");
    rspackConfig.mode = "development";
    rspackConfig.entry = [runtime_dir + "/runtime/app.jsx"];

    const compiler = rspack(rspackConfig);

    // Regenerate the router cache only when a page file is added or removed.
    const pagesDir = path.join(projectDirectory, "src", "pages");
    const touchesPages = (files) => {
        if (!files) return false;
        for (const f of files) {
            if (f && f.startsWith(pagesDir)) return true;
        }
        return false;
    };

    let routerReady = Promise.resolve();
    compiler.hooks.watchRun.tapPromise("aplos-router", async (c) => {
        const added = c.modifiedFiles;
        const removed = c.removedFiles;
        if (!added && !removed) return;
        if (!touchesPages(added) && !touchesPages(removed)) return;

        const startTime = Date.now();
        console.log(`\x1b[36m⚡ Rebuilding routes...\x1b[0m`);
        routerReady = buildRouter(config);
        await routerReady;
        console.log(`\x1b[32m✓ Built in ${Date.now() - startTime}ms\x1b[0m`);
    });

    let isFirstCompilation = true;
    compiler.hooks.done.tap('aplos-startup', () => {
        if (isFirstCompilation) {
            const readyTime = Math.round(performance.now() - buildStart);
            printStartupMessage(finalPort, projectDirectory, readyTime);
            isFirstCompilation = false;
        }
    });

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
        client: {
            overlay: {
                errors: true,
                warnings: false,
            },
            logging: 'error',
        },
        static: [
            { directory: path.join(projectDirectory, "public") },
            { directory: path.join(__dirname + "/../client/", "public") },
        ],
    };
    const server = new RspackDevServer(devServerOptions, compiler);

    const runServer = async () => {
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
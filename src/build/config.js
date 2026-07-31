import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export default async () => {
    const cacheDirectory = process.cwd() + "/.aplos/cache";

    try {
        if (!fs.existsSync(cacheDirectory)) {
            fs.mkdirSync(cacheDirectory, {recursive: true});
        }
    } catch (err) {
        console.error(err);
    }

    const defaultServer = {
        port: 3000,
        // Whether `port` is a constraint or a preference. False lets a busy port
        // fall back to the next free one; true fails instead. See the rationale
        // in src/command/devServer.js.
        strictPort: false,
    };

    let aplos = {
        server: {...defaultServer},
        routes: [],
        head: {
            defaultTitle: '',
            titleTemplate: '',
            meta: [],
            link: [],
        },
    };

    const configPath = path.join(process.cwd(), 'aplos.config.js');

    if (fs.existsSync(configPath)) {
        try {
            const configModule = await import(pathToFileURL(configPath).href);
            const config = configModule.default || configModule;
            aplos = {...aplos, ...config};
            // `server` is merged one level deeper than the rest. The spread above
            // replaces the whole object, so a project declaring `server: { port }`
            // used to drop every other server default. That is how APLOS_SERVER_PORT
            // came to be ignored whenever a project set a port: the env var was
            // baked into the default `server`, which the project's own block then
            // replaced wholesale.
            aplos.server = {...defaultServer, ...(config.server || {})};
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }

    // Applied after the config file so it wins over `server.port`, which is what
    // an explicit env var is for: overriding the committed value for one run.
    // Read here rather than as a default so it cannot be silently replaced.
    if (process.env.APLOS_SERVER_PORT) {
        const port = Number(process.env.APLOS_SERVER_PORT);
        if (Number.isInteger(port) && port >= 0 && port <= 65535) {
            aplos.server.port = port;
        } else {
            console.warn(
                `[aplos] ignoring APLOS_SERVER_PORT="${process.env.APLOS_SERVER_PORT}": not a valid port.`,
            );
        }
    }

    return aplos;
};

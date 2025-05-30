import fs from "fs";
import path from "path";

export default () => {
    const cacheDirectory = process.cwd() + "/.aplos/cache";

    try {
        if (!fs.existsSync(cacheDirectory)) {
            fs.mkdirSync(cacheDirectory, {recursive: true});
        }
    } catch (err) {
        console.error(err);
    }

    let aplos = {
        server: {
            port: process.env.APLOS_SERVER_PORT || 3000,
        },
        routes: [],
    };

    const configPath = path.join(process.cwd(), 'aplos.config.js');

    try {
        if (fs.existsSync(configPath)) {
            let config = require(configPath);
            aplos = {...aplos, ...config};
        }
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration :', error);
    }

    return aplos;
};

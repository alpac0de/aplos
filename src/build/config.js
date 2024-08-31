const fs = require("fs");

module.exports = (projectDirectory) => {

    const cacheDirectory = process.cwd() + '/.aplos/cache';

    try {
        if (!fs.existsSync(cacheDirectory)) {
            fs.mkdirSync(cacheDirectory, {recursive: true});
        }
    } catch (err) {
        console.error(err);
    }

    let aplos = {
        rewrites: () => []
    };

    try {
        let config = require(process.cwd() + "/aplos.config.js");
        aplos = {...aplos, ...config};
    } catch (error) {
    }

    return aplos;
}

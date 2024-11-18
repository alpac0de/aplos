const {exec} = require("child_process");
const {buildRouter} = require("../build/router");
const get_config = require('../build/config');

module.exports = (options) => {
    let projectDirectory = process.cwd();
    let runtime_dir = __dirname + "/..";
    let node_modules = projectDirectory + "/node_modules";

    buildRouter(get_config(projectDirectory));

    exec(node_modules + "/.bin/webpack-cli --mode="+options.mode+" --config " + runtime_dir + "/../webpack.config.js --entry " + projectDirectory + "/.aplos/cache/app.js", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }

        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }

        console.log(`${stdout}`);
    });
};
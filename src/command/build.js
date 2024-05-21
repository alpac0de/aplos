const {exec} = require("child_process");
const {build} = require("../build");

module.exports = (options) => {
    let projectDirectory = process.cwd();
    let runtime_dir = __dirname + "/..";
    let node_modules = __dirname + "/../../node_modules";

    build({
        rewrites: () => []
    });

    exec(node_modules + "/.bin/webpack-cli --mode="+options.mode+" --config " + runtime_dir + "/../webpack.config.js --entry " + projectDirectory + "/.aplos/generated/app.js", (error, stdout, stderr) => {
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
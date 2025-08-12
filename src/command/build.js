import {exec} from "child_process";
import {buildRouter}  from "../build/router";
import get_config from '../build/config';

export default (options) => {
    let projectDirectory = process.cwd();
    let runtime_dir = __dirname + "/..";
    let node_modules = projectDirectory + "/node_modules";

    buildRouter(get_config(projectDirectory));

    exec(node_modules + "/.bin/rspack --mode="+options.mode+" --config " + runtime_dir + "/../rspack.config.js --entry " + projectDirectory + "/.aplos/cache/app.js", (error, stdout, stderr) => {
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
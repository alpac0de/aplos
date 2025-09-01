import {spawn} from "child_process";
import {buildRouter}  from "../build/router";
import get_config from '../build/config';

export default (options) => {
    let projectDirectory = process.cwd();
    let runtime_dir = __dirname + "/..";
    let node_modules = projectDirectory + "/node_modules";

    buildRouter(get_config(projectDirectory));

    const rspack = spawn(node_modules + "/.bin/rspack", [
        "--mode=" + options.mode,
        "--config", runtime_dir + "/../rspack.config.js",
        "--entry", projectDirectory + "/.aplos/cache/app.js"
    ]);

    rspack.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    rspack.stderr.on('data', (data) => {
        console.log(`stderr: ${data.toString()}`);
    });

    rspack.on('close', (code) => {
        if (code !== 0) {
            console.log(`error: Process exited with code ${code}`);
        }
    });
};
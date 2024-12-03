const {buildRouter} = require("../build/router");
const get_config = require('../build/config');
const Table = require('cli-table3');
const fs = require("fs");


module.exports = (options) => {
    let projectDirectory = process.cwd();

    buildRouter(get_config(projectDirectory));

    const table = new Table({
        head: ['Component', 'Scheme', 'Host', 'Path']
    });

    const data = fs.readFileSync(projectDirectory + '/.aplos/cache/router.js').toString();
    const routes = JSON.parse(data);
    console.log(routes);

    routes.map((route) => {
        table.push([
            route.component,
            'Any',
            'Any',
            route.path
        ]);
    });

    console.log(table.toString());
}

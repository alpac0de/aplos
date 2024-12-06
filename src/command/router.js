const {buildRouter} = require("../build/router");
const get_config = require('../build/config');
const Table = require('cli-table3');
const fs = require("fs");

module.exports = (options) => {
    let projectDirectory = process.cwd();

    buildRouter(get_config(projectDirectory));

    const data = fs.readFileSync(projectDirectory + '/.aplos/cache/router.js').toString();
    const routes = JSON.parse(data);


    if (typeof options === 'string') {
        const table = new Table({
            head: ['Property', 'Value']
        });

        const route = routes.find((route) => route.component === options);
        if (route) {
            table.push([
                'Route name',
                route.path
            ]);

            table.push([
                'Path',
                route.path
            ]);

            table.push([
                'Path Regex',
                ''
            ]);

            table.push([
                'Host',
                ''
            ]);

            table.push([
                'Scheme',
                ''
            ]);

            table.push([
                'Requirement',
                route.requirement
            ]);

            console.log(table.toString());

        } else {
            console.log('Component not found');
        }
    } else {
        const table = new Table({
            head: ['Component', 'Scheme', 'Host', 'Path']
        });

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
}

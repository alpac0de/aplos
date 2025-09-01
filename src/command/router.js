import { buildRouter } from "../build/router.js";
import get_config from "../build/config.js";
import Table from "cli-table3";
import fs from "fs";


export default async (options) => {
  let projectDirectory = process.cwd();

  await buildRouter(get_config(projectDirectory));

  const data = fs
    .readFileSync(projectDirectory + "/.aplos/cache/router.js")
    .toString();
  const routes = JSON.parse(data);

  if (typeof options === "string") {
    const table = new Table({
      head: ["Property", "Value"],
    });

    const route = routes.find((route) => route.component === options);
    if (route) {
      table.push(["Route name", route.path]);

      table.push(["Path", route.path]);

      table.push(["Path Regex", ""]);

      table.push(["Host", ""]);

      table.push(["Scheme", ""]);

      table.push(["Requirement", route.requirement]);

      console.log(table.toString());
    } else {
      console.log("Component not found");
    }
  } else {
    const table = new Table({
      head: ["Component", "Scheme", "Host", "Path"],
    });

    routes.map((route) => {
      table.push([route.component, "Any", "Any", route.path]);
    });
    console.log(table.toString());
  }
};

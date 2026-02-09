import { buildRouter } from "../build/router.js";
import get_config from "../build/config.js";
import Table from "cli-table3";
import fs from "fs";


// Function to check if URL matches a route pattern with requirements
const matchRoute = (url, routePath, requirements = {}) => {
  // Convert React Router path to regex
  let pattern = routePath.replace(/\//g, '\\/');  // Escape forward slashes
  
  // Get parameter names first
  const paramNames = [...routePath.matchAll(/:([^/]+)/g)].map(m => m[1]);
  
  // Replace each parameter with its requirement pattern or default
  paramNames.forEach(paramName => {
    const requirement = requirements[paramName] || '[^/]+';
    pattern = pattern.replace(`:${paramName}`, `(${requirement})`);
  });
    
  const regex = new RegExp(`^${pattern}$`);
  const match = url.match(regex);
  
  if (match) {
    // Extract parameters
    const params = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    return { match: true, params };
  }
  
  return { match: false };
};

export default async (options) => {
  let projectDirectory = process.cwd();

  await buildRouter(await get_config(projectDirectory));

  const data = fs
    .readFileSync(projectDirectory + "/.aplos/cache/router.js")
    .toString();
  const routes = JSON.parse(data);

  // Handle router:match command
  if (options && options.url) {
    const url = options.url;
    let matchedRoute = null;
    let matchParams = {};

    // Test each route
    for (const route of routes) {
      // Skip config routes without path
      if (!route.path) continue;
      
      const result = matchRoute(url, route.path, route.requirements || route.requirement || {});
      if (result.match) {
        matchedRoute = route;
        matchParams = result.params;
        break;
      }
    }

    const table = new Table({
      head: ["Property", "Value"],
    });

    if (matchedRoute) {
      table.push(["Route Name", matchedRoute.component]);
      table.push(["Path", matchedRoute.path]);
      table.push(["File", matchedRoute.file ? `src/pages${matchedRoute.file}` : "-"]);
      const regexPattern = matchedRoute.path.replace(/\//g, '\\/').replace(/:([^/]+)/g, '(?P<$1>[^/]++)');
      table.push(["Path Regex", `{^${regexPattern}$}`]);
      table.push(["Host", "ANY"]);
      table.push(["Scheme", "ANY"]);
      const reqs = matchedRoute.requirements || matchedRoute.requirement || {};
      table.push(["Requirements", Object.keys(reqs).length > 0 ? JSON.stringify(reqs) : "NO CUSTOM"]);
      
      if (Object.keys(matchParams).length > 0) {
        table.push(["Parameters", JSON.stringify(matchParams)]);
      }
      
      console.log(`✅ URL "${url}" matches route:`);
      console.log(table.toString());
    } else {
      console.log(`❌ URL "${url}" does not match any route.`);
      console.log("\nAvailable routes:");
      const availableTable = new Table({
        head: ["Component", "Path"],
      });
      routes.forEach(route => {
        if (route.path) {
          availableTable.push([route.component, route.path]);
        }
      });
      console.log(availableTable.toString());
    }
    return;
  }

  if (typeof options === "string") {
    const table = new Table({
      head: ["Property", "Value"],
    });

    const route = routes.find((route) => route.component === options);
    if (route) {
      table.push(["Route name", route.path]);

      table.push(["Path", route.path]);

      table.push(["File", route.file ? `src/pages${route.file}` : "-"]);

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
      head: ["Component", "File", "Scheme", "Host", "Path"],
    });

    routes.map((route) => {
      table.push([route.component, route.file ? `src/pages${route.file}` : "-", "Any", "Any", route.path]);
    });
    console.log(table.toString());
  }
};

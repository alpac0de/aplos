import { buildRouter } from "../build/router.js";
import get_config from "../build/config.js";
import Table from "cli-table3";


/**
 * Tests a URL against a route path, honouring the route's `requirements`.
 *
 * Exported for tests: the URL-to-route answer this gives is the whole point of
 * `aplos router:match`, and it is pure logic worth pinning directly.
 *
 * The path is built segment by segment rather than by patching a half-escaped
 * string. The previous version escaped `/` only and left every other regex
 * metacharacter live, so the `*` that `buildRouter` emits for a catch-all
 * (`[...slug]` becomes `*`) was read as a quantifier: `/blog/*` compiled to
 * `^\/blog\/*$`, which does not match `/blog/hello`. Every catch-all route in a
 * project reported "does not match any route" while `router:debug` listed it.
 * A literal `.` or `+` in a static path was mis-handled the same way.
 */
export const matchRoute = (url, routePath, requirements = {}) => {
  const paramNames = [];

  // `*` (catch-all) and `:param` are the only two dynamic constructs; everything
  // else is literal text and gets escaped.
  const pattern = routePath.replace(/\*|:([^/]+)|[^*:]+|:/g, (token, paramName) => {
    if (token === '*') {
      return '(.*)';
    }
    if (paramName) {
      paramNames.push(paramName);
      const requirement = requirements[paramName] || '[^/]+';
      // Each param must contribute exactly ONE capture group, in order, or the
      // index-based binding below hands a param its neighbour's value. A
      // requirement is free to contain its own groups (`(\\d+)`, `(a|b)`), so
      // they are demoted to non-capturing before wrapping.
      return `(${neutralizeGroups(requirement)})`;
    }
    return escapeForRegExp(token);
  });

  let regex;
  try {
    regex = new RegExp(`^${pattern}$`);
  } catch {
    // A malformed requirement must not crash the CLI.
    return { match: false };
  }

  const match = url.match(regex);
  if (!match) {
    return { match: false };
  }

  const params = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });
  return { match: true, params };
};

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Turns capturing groups in a user-supplied requirement into non-capturing ones,
 * so each route param still owns exactly one group.
 *
 * A `(` that is escaped (`\(`) or already special (`(?:`, `(?=`, `(?<name>`) is
 * left alone. The scan tracks escapes and character classes, where `(` is a
 * literal and must not be rewritten.
 */
function neutralizeGroups(requirement) {
  let out = '';
  let inClass = false;

  for (let i = 0; i < requirement.length; i++) {
    const char = requirement[i];

    if (char === '\\') {
      // Copy the escape and whatever it escapes, verbatim.
      out += char + (requirement[i + 1] ?? '');
      i++;
      continue;
    }
    if (char === '[') inClass = true;
    else if (char === ']') inClass = false;

    if (char === '(' && !inClass && requirement[i + 1] !== '?') {
      out += '(?:';
      continue;
    }
    out += char;
  }

  return out;
}

export default async (options) => {
  let projectDirectory = process.cwd();

  // Read from what the build returned rather than writing the cache, reading it
  // back and parsing it. The round trip through disk was also what surfaced the
  // raw aplos.config.js route entries (no component, no path) that used to
  // render as a junk row: the returned result only contains real routes.
  const { routes } = await buildRouter(await get_config(projectDirectory));

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
      // A failed match exits non-zero so the command can be scripted: `aplos
      // router:match "$url" || …` was previously indistinguishable from a hit,
      // since both returned 0.
      process.exitCode = 1;
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

      const reqs = route.requirements || {};
      table.push(["Requirements", Object.keys(reqs).length > 0 ? JSON.stringify(reqs) : "NO CUSTOM"]);

      console.log(table.toString());
    } else {
      console.log("Component not found");
      process.exitCode = 1;
    }
  } else {
    const table = new Table({
      head: ["Component", "File", "Scheme", "Host", "Path"],
    });

    // The guard is redundant now that the routes come from buildRouter's return
    // value rather than the cache file (which also held raw aplos.config.js
    // entries with no component or path, and rendered them as a blank row). Kept
    // as a cheap invariant: nothing here should ever render a pathless row.
    routes
      .filter((route) => route.path)
      .forEach((route) => {
        table.push([route.component, route.file ? `src/pages${route.file}` : "-", "Any", "Any", route.path]);
      });
    console.log(table.toString());
  }
};

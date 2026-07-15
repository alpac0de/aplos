import path from "path";
import { CssExtractRspackPlugin } from "@rspack/core";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import { merge } from "webpack-merge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This module lives in src/build/, so the framework root is two levels up.
const frameworkRoot = path.resolve(__dirname, "../..");

export async function createSSRConfig({
  mode = "production",
  entry,
  projectDirectory = process.cwd(),
} = {}) {
  const isDevelopment = mode !== "production";

  // Anchor the SSR persistent cache under $XDG_CACHE_HOME/aplos when available so
  // it survives across PaaS deploys (rspack defaults to node_modules/.cache and
  // ignores XDG). Separate key from the client cache so they never collide. See
  // the matching helper in rspack-config.js for the full rationale.
  function rspackCacheDir(key) {
    const base = process.env.XDG_CACHE_HOME
      ? path.join(process.env.XDG_CACHE_HOME, "aplos")
      : path.join(projectDirectory, "node_modules", ".cache", "aplos");
    return path.join(base, key);
  }

  // Inherit project aliases/loaders from the client config (e.g. `@docs` alias,
  // `.md` loader). A dedicated `rspack.ssr.config.js` in the project can override.
  //
  // Known limitation: the client build and this SSR build both run in-process and
  // both import the project's rspack.config.js, which the module loader evaluates
  // once. A user PLUGIN INSTANCE that mutates state across apply() is therefore
  // shared between the two compilers, where the old CLI-subprocess build gave each
  // a fresh instance. There is no portable fix (both Node and Bun cache dynamic
  // imports by content, so cache-busting the URL does nothing), and no project
  // currently ships a custom rspack.config.js. If this ever bites, the answer is
  // for the user config to export a factory the framework calls per build, the way
  // rspack's own config-as-function works.
  let userConfig = {};
  const userClientConfigPath = path.resolve(projectDirectory, "rspack.config.js");
  if (
    fs.existsSync(userClientConfigPath) &&
    userClientConfigPath !== path.resolve(frameworkRoot, "rspack.config.js")
  ) {
    try {
      const userModule = await import(pathToFileURL(userClientConfigPath).href);
      userConfig = userModule.default || userModule;
    } catch (error) {
      console.error("Error loading project rspack.config.js for SSR:", error.message);
    }
  }
  const userSSRConfigPath = path.resolve(projectDirectory, "rspack.ssr.config.js");
  // Guard against self-import: inside aplos's own repo the project's
  // rspack.ssr.config.js is the thin adapter that calls this function, and a
  // circular ESM import would hang the process. Skip the framework's own file.
  if (
    fs.existsSync(userSSRConfigPath) &&
    userSSRConfigPath !== path.resolve(frameworkRoot, "rspack.ssr.config.js")
  ) {
    try {
      const userModule = await import(pathToFileURL(userSSRConfigPath).href);
      userConfig = merge(userConfig, userModule.default || userModule);
    } catch (error) {
      console.error("Error loading project rspack.ssr.config.js:", error.message);
    }
  }

  const frameworkConfig = {
    mode: "production",
    target: "node",
    devtool: false,
    stats: "errors-warnings",
    infrastructureLogging: { level: "error" },
    // Same trade as the client compilation: on by default for warm builds, off via
    // APLOS_BUILD_CACHE=0 when the builder cannot afford the serialisation overhead.
    cache: process.env.APLOS_BUILD_CACHE !== "0" && {
      type: "persistent",
      storage: {
        type: "filesystem",
        directory: rspackCacheDir("rspack-ssr"),
      },
      buildDependencies: [path.resolve(frameworkRoot, "rspack.ssr.config.js")],
    },
    output: {
      path: path.resolve(projectDirectory, "./.aplos/cache"),
      filename: "ssr-bundle.cjs",
      library: { type: "commonjs2" },
      clean: false,
    },
    externals: {
      react: "commonjs react",
      "react-dom": "commonjs react-dom",
      "react-dom/server": "commonjs react-dom/server",
      "react-router": "commonjs react-router",
      "react-router-dom": "commonjs react-router-dom",
    },
    optimization: {
      minimize: false,
      splitChunks: false,
      usedExports: false,
      // Kept off here (unlike the client config, where it is left at rspack's
      // production default): this bundle is executed once by ssg.js to emit HTML,
      // never shipped. Size is irrelevant, and eliding a side-effectful module —
      // a CSS import, a polyfill — would silently change the rendered output.
      sideEffects: false,
    },
    module: {
      rules: [
        {
          test: /\.(js|ts|jsx|tsx)$/,
          exclude: /node_modules\/(?!aplos)|bower_components|\.aplos[\\/]cache/,
          use: [
            {
              loader: "builtin:swc-loader",
              options: {
                jsc: {
                  parser: { syntax: "typescript", tsx: true },
                  transform: {
                    react: { runtime: "automatic", refresh: false },
                  },
                },
                env: { targets: { node: "18" } },
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [CssExtractRspackPlugin.loader, "css-loader", "postcss-loader"],
        },
        {
          test: /\.md$/,
          type: "asset/source",
        },
      ],
    },
    plugins: [
      new CssExtractRspackPlugin({
        filename: "ssr-[name].css",
        chunkFilename: "ssr-[id].css",
      }),
    ],
    resolveLoader: {
      modules: [
        path.resolve(projectDirectory, "node_modules"),
        path.resolve(frameworkRoot, "node_modules"),
        "node_modules",
      ],
    },
    resolve: {
      alias: {
        "react": path.resolve(projectDirectory, "node_modules/react"),
        "react-dom": path.resolve(projectDirectory, "node_modules/react-dom"),
        "react-router-dom": path.resolve(projectDirectory, "node_modules/react-router-dom"),
        "react-router": path.resolve(projectDirectory, "node_modules/react-router"),
        "aplos/config": path.resolve(frameworkRoot, "src/config.js"),
        "aplos/navigation": path.resolve(frameworkRoot, "src/components/navigation.jsx"),
        "aplos/head": path.resolve(frameworkRoot, "src/components/head.jsx"),
        // Route middleware does not run during static rendering, but a shared
        // module may still import `redirect`. Resolve it so the SSG build does
        // not fail on a missing module — the sentinel is inert without the
        // client MiddlewareGate.
        "aplos/redirect": path.resolve(frameworkRoot, "src/runtime/redirect.js"),
        "@": projectDirectory + "/src",
        "~": projectDirectory + "/src",
        "@aplos_config": projectDirectory + "/.aplos/cache/config.js",
        "@aplos_routes": projectDirectory + "/.aplos/cache/routes.js",
        "@aplos_pages": projectDirectory + "/.aplos/cache/pages.js",
        "@aplos_head": projectDirectory + "/.aplos/cache/head.js",
        "aplos/internal/passthrough-layout": path.resolve(frameworkRoot, "src/runtime/passthrough-layout.jsx"),
        "aplos/internal/default-not-found": path.resolve(frameworkRoot, "src/runtime/default-not-found.jsx"),
      },
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
  };

  const config = merge(frameworkConfig, userConfig);

  // `mode` and `entry` are chosen by the command running the build, not by the
  // project. They are applied AFTER the merge so a project's rspack.ssr.config.js
  // cannot override them: otherwise a user config could replace the framework
  // entry point or flip the build mode.
  config.mode = isDevelopment ? "development" : "production";
  if (entry) {
    config.entry = entry;
  }

  return config;
}

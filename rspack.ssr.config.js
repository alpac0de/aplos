import path from "path";
import { CssExtractRspackPlugin } from "@rspack/core";
import { fileURLToPath, pathToFileURL } from "url";
import fs from "fs";
import { merge } from "webpack-merge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDirectory = process.cwd();

// Anchor the SSR persistent cache under $XDG_CACHE_HOME/aplos when available so
// it survives across PaaS deploys (rspack defaults to node_modules/.cache and
// ignores XDG). Separate key from the client cache so they never collide. See
// the matching helper in rspack.config.js for the full rationale.
function rspackCacheDir(key) {
  const base = process.env.XDG_CACHE_HOME
    ? path.join(process.env.XDG_CACHE_HOME, "aplos")
    : path.join(projectDirectory, "node_modules", ".cache", "aplos");
  return path.join(base, key);
}

// Inherit project aliases/loaders from the client config (e.g. `@docs` alias,
// `.md` loader). A dedicated `rspack.ssr.config.js` in the project can override.
let userConfig = {};
const userClientConfigPath = path.resolve(projectDirectory, "rspack.config.js");
if (fs.existsSync(userClientConfigPath)) {
  try {
    const userModule = await import(pathToFileURL(userClientConfigPath).href);
    userConfig = userModule.default || userModule;
  } catch (error) {
    console.error("Error loading project rspack.config.js for SSR:", error.message);
  }
}
const userSSRConfigPath = path.resolve(projectDirectory, "rspack.ssr.config.js");
// Guard against self-import (see rspack.config.js): inside aplos's own repo this
// path IS the current file, and a circular ESM import would hang the process.
if (fs.existsSync(userSSRConfigPath) && userSSRConfigPath !== __filename) {
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
  cache: {
    type: "filesystem",
    storage: {
      type: "filesystem",
      directory: rspackCacheDir("rspack-ssr"),
    },
    buildDependencies: {
      config: [path.resolve(__dirname, "rspack.ssr.config.js")],
    },
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
      path.resolve(__dirname, "node_modules"),
      "node_modules",
    ],
  },
  resolve: {
    alias: {
      "react": path.resolve(projectDirectory, "node_modules/react"),
      "react-dom": path.resolve(projectDirectory, "node_modules/react-dom"),
      "react-router-dom": path.resolve(projectDirectory, "node_modules/react-router-dom"),
      "react-router": path.resolve(projectDirectory, "node_modules/react-router"),
      "aplos/config": path.resolve(__dirname, "src/config.js"),
      "aplos/navigation": path.resolve(__dirname, "src/components/navigation.jsx"),
      "aplos/head": path.resolve(__dirname, "src/components/head.jsx"),
      // Route middleware does not run during static rendering, but a shared
      // module may still import `redirect`. Resolve it so the SSG build does
      // not fail on a missing module — the sentinel is inert without the
      // client MiddlewareGate.
      "aplos/redirect": path.resolve(__dirname, "src/runtime/redirect.js"),
      "@": projectDirectory + "/src",
      "~": projectDirectory + "/src",
      "@aplos_config": projectDirectory + "/.aplos/cache/config.js",
      "@aplos_routes": projectDirectory + "/.aplos/cache/routes.js",
      "@aplos_pages": projectDirectory + "/.aplos/cache/pages.js",
      "@aplos_head": projectDirectory + "/.aplos/cache/head.js",
      "aplos/internal/passthrough-layout": path.resolve(__dirname, "src/runtime/passthrough-layout.jsx"),
      "aplos/internal/default-not-found": path.resolve(__dirname, "src/runtime/default-not-found.jsx"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
};

export default merge(frameworkConfig, userConfig);

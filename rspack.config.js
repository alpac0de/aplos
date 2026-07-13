import path from "path";
import { HtmlRspackPlugin, CssExtractRspackPlugin, CopyRspackPlugin, sources } from "@rspack/core";
import { ReactRefreshRspackPlugin as ReactRefreshPlugin } from "@rspack/plugin-react-refresh";
import { fileURLToPath } from "url";
import fs from "fs";
import { pathToFileURL } from "url";
import { merge } from "webpack-merge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== "production";
const projectDirectory = process.cwd();

// Output directory, relative to the project root. Forwarded by `aplos build`
// (which resolves --out-dir / $APLOS_OUT_DIR / the `dist` default) through the
// APLOS_OUT_DIR env var, since this config runs in a separate rspack process.
const outDir = process.env.APLOS_OUT_DIR || "dist";

// Rspack's persistent cache defaults to node_modules/.cache/rspack and does NOT
// honour XDG_CACHE_HOME. On PaaS builders that persist a cache volume via
// XDG_CACHE_HOME (e.g. Kemeter mounts it at /opt/build-cache), the default
// location is wiped on every deploy → every deploy is a cold build. Anchor the
// cache under $XDG_CACHE_HOME/aplos when available so it survives across
// deploys; fall back to node_modules/.cache locally. `key` keeps the client and
// SSR caches in separate directories so they never invalidate each other.
function rspackCacheDir(key) {
  const base = process.env.XDG_CACHE_HOME
    ? path.join(process.env.XDG_CACHE_HOME, "aplos")
    : path.join(projectDirectory, "node_modules", ".cache", "aplos");
  return path.join(base, key);
}

// Determine HTML template path
// Priority: 1. public/index.html (user override), 2. default template
const defaultTemplate = path.resolve(__dirname, "./src/client/public/index.html");
const userTemplate = path.resolve(projectDirectory, "public/index.html");

let htmlTemplate = defaultTemplate;
if (fs.existsSync(userTemplate)) {
  htmlTemplate = userTemplate;
  console.log("Using custom HTML template from public/index.html");
}

// Load project configuration
let headConfig = { meta: [], link: [], script: [] };
let reactCompilerEnabled = false;
const configPath = path.join(projectDirectory, 'aplos.config.js');
if (fs.existsSync(configPath)) {
  try {
    const configModule = await import(pathToFileURL(configPath).href);
    const config = configModule.default || configModule;
    headConfig = config.head || headConfig;
    reactCompilerEnabled = config.reactCompiler === true;
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

// Escape a value interpolated into a double-quoted HTML attribute. Without this,
// a `"` in a config value (say a `description` containing a quotation) closes the
// attribute early and the rest of the value is parsed as markup.
// `&` goes first, otherwise it would re-escape the entities introduced below.
function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Escape text content. `<title>` holds character data, so quotes are fine but
// angle brackets and ampersands are not.
function escapeText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Serialize a tag's attributes. A `true` boolean renders as a bare attribute
// (`async`), `false` and `null`/`undefined` drop the attribute entirely.
function renderAttributes(attrs) {
  return Object.entries(attrs)
    .map(([key, value]) => {
      if (value === true) return key;
      if (value === false || value == null) return "";
      return `${key}="${escapeAttribute(value)}"`;
    })
    .filter(Boolean)
    .join(" ");
}

// Custom plugin to inject head tags.
//
// HtmlRspackPlugin's own `meta` option is a Record and it cannot inject
// arbitrary <link>/<script> tags, so it cannot express aplos's `head` config
// (arrays of attribute objects). Hence this plugin.
class InjectHeadTagsPlugin {
  constructor(config) {
    this.headConfig = config;
  }

  apply(compiler) {
    compiler.hooks.thisCompilation.tap('InjectHeadTagsPlugin', (compilation) => {
      const hooks = compilation.hooks;

      hooks.processAssets.tapAsync(
        {
          name: 'InjectHeadTagsPlugin',
          // PROCESS_ASSETS_STAGE_* are static properties of Compilation, not
          // instance ones: reading them off `compilation` yields undefined,
          // which rspack treats as stage 0. That ran the hook long before
          // HtmlRspackPlugin emits index.html at stage 700, so no .html asset
          // was ever found and the entire `head` config was silently dropped.
          //
          // REPORT (5000), not SUMMARIZE (1000): the content hashes are only
          // substituted into the HTML at OPTIMIZE_HASH (2500). Replacing the asset
          // with a RawSource before that froze the markup while its script tags still
          // carried stale chunk names, so every hash in the emitted index.html —
          // scripts and stylesheet alike — pointed at files the build never wrote.
          // Production bundles could not load at all; dev was unaffected because its
          // filenames carry no hash.
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_REPORT,
        },
        (assets, callback) => {
          const htmlFiles = Object.keys(assets).filter(file => file.endsWith('.html'));

          htmlFiles.forEach(filename => {
            const asset = assets[filename];
            let html = asset.source().toString();

            const tags = [];

            // Title first, so it stays at the top of <head>.
            if (this.headConfig.defaultTitle) {
              tags.push(`<title>${escapeText(this.headConfig.defaultTitle)}</title>`);
            }

            for (const meta of this.headConfig.meta || []) {
              tags.push(`<meta ${renderAttributes(meta)}>`);
            }

            for (const link of this.headConfig.link || []) {
              tags.push(`<link ${renderAttributes(link)}>`);
            }

            for (const script of this.headConfig.script || []) {
              tags.push(`<script ${renderAttributes(script)}></script>`);
            }

            if (tags.length === 0) return;

            const headTags = tags.map(tag => `\n    ${tag}`).join('');

            // Anchor on the LAST `</head>`, not the first. A template may carry
            // an inline script holding that literal in a string, and injecting
            // at the first match lands the tags inside the script: the head
            // config is lost and the script body is corrupted. HtmlRspackPlugin
            // normalizes the document, so the closing tag is always present and
            // any literal occurrence necessarily precedes it.
            const closeIndex = html.lastIndexOf('</head>');
            if (closeIndex === -1) return;
            html =
              html.slice(0, closeIndex) +
              `${headTags}\n  ` +
              html.slice(closeIndex);

            // Hand rspack a real Source over UTF-8 bytes. A plain object literal
            // bypasses the asset pipeline, and `html.length` counts UTF-16 code
            // units, so a title with an accent or an emoji under-reports the
            // asset size.
            compilation.updateAsset(filename, new sources.RawSource(Buffer.from(html, 'utf8')));
          });

          callback();
        }
      );
    });
  }
}

const plugins = [
  new HtmlRspackPlugin({
    template: htmlTemplate,
    minify: !isDevelopment,
  }),
  new InjectHeadTagsPlugin(headConfig),
  new CssExtractRspackPlugin({
    filename: isDevelopment ? "[name].css" : "[name].[contenthash:8].css",
    chunkFilename: isDevelopment ? "[id].css" : "[id].[contenthash:8].css",
  }),
];

if (isDevelopment) {
  plugins.push(new ReactRefreshPlugin());
}

const userPublicDir = path.resolve(projectDirectory, "public");
if (!isDevelopment && fs.existsSync(userPublicDir)) {
  plugins.push(
    new CopyRspackPlugin({
      patterns: [
        {
          from: userPublicDir,
          to: path.resolve(projectDirectory, outDir),
          globOptions: {
            ignore: ["**/index.html"],
          },
          // `public/` existing is not enough: the glob still has to match
          // something. A directory that is empty, or whose only entry is the
          // `index.html` ignored just above, makes the copy fail the build.
          noErrorOnMissing: true,
        },
      ],
    })
  );
}

// Load project's rspack.config.js if it exists.
// Guard against self-import: when aplos runs inside its own repo, the cwd's
// rspack.config.js IS this file. Importing it would create a circular ESM
// dependency whose top-level await never settles, silently killing the process.
let userConfig = {};
const userConfigPath = path.resolve(projectDirectory, "rspack.config.js");
if (fs.existsSync(userConfigPath) && userConfigPath !== __filename) {
  try {
    const userModule = await import(pathToFileURL(userConfigPath).href);
    userConfig = userModule.default || userModule;
    console.log("Using custom rspack config from rspack.config.js");
  } catch (error) {
    console.error("Error loading project rspack.config.js:", error.message);
  }
}

// The persistent cache is what a warm build is made of, so it stays on by default. It
// is not free, though: serialising the module graph to disk keeps the live graph and
// its serialisation buffer resident at once, which measured ~83 MB of peak RSS on an
// app whose bundle is under a megabyte. On a memory-capped builder that overhead is
// enough to get the bundler OOM-killed, and a build that dies buys no warm builds at
// all — hence the escape hatch. Set APLOS_BUILD_CACHE=0 to trade warm builds for the
// lower peak.
const buildCacheEnabled = process.env.APLOS_BUILD_CACHE !== "0";

// Production source maps emit megabytes of .map files that nothing fetches, so they are
// off by default. Set APLOS_SOURCE_MAPS=1 to restore them, e.g. to feed an error monitor.
const productionSourceMaps = process.env.APLOS_SOURCE_MAPS === "1";

const frameworkConfig = {
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment
    ? "eval-source-map"
    : productionSourceMaps && "hidden-source-map",
  cache: buildCacheEnabled && {
    type: "persistent",
    storage: {
      type: "filesystem",
      directory: rspackCacheDir("rspack-client"),
    },
    buildDependencies: [path.resolve(__dirname, "rspack.config.js")],
  },
  stats: isDevelopment ? 'none' : 'normal',
  infrastructureLogging: {
    level: isDevelopment ? 'error' : 'info',
  },
  optimization: {
    minimize: !isDevelopment,
    splitChunks: !isDevelopment
      ? {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
              priority: 10,
            },
            common: {
              minChunks: 2,
              name: "common",
              chunks: "all",
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        }
      : false,
    usedExports: !isDevelopment,
  },
  output: {
    path: path.resolve(projectDirectory, outDir),
    publicPath: "/",
    filename: isDevelopment ? "[name].js" : "[name].[contenthash:8].js",
    chunkFilename: isDevelopment ? "[name].js" : "[name].[contenthash:8].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|jsx|tsx)$/,
        exclude: /node_modules\/(?!aplos)|bower_components|\.aplos[\\/]cache/,
        use: [
          // Loaders run bottom-up: SWC transpiles first (TS/JSX → JS), then the
          // React Compiler loader (opt-in) runs on top. react-refresh is handled
          // natively by SWC (see transform.react.refresh below), so Babel is no
          // longer on the dev path at all — SWC alone is ~7x faster.
          //
          // When `reactCompiler: true`, the loader uses @swc/react-compiler's
          // native detector to invoke Babel ONLY on files that actually contain
          // components/hooks to memoize; everything else stays SWC-only. Enable
          // via `reactCompiler: true` in aplos.config.js.
          reactCompilerEnabled && {
            loader: path.resolve(__dirname, "src/build/react-compiler-loader.cjs"),
          },
          {
            loader: "builtin:swc-loader",
            options: {
              jsc: {
                parser: {
                  syntax: "typescript",
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: "automatic",
                    refresh: isDevelopment,
                  },
                },
              },
              env: {
                targets: "defaults",
              },
            },
          },
        ].filter(Boolean),
      },
      {
        test: /\.css$/,
        use: [CssExtractRspackPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  resolveLoader: {
    modules: [
      path.resolve(projectDirectory, "node_modules"),
      path.resolve(__dirname, "node_modules"),
      "node_modules",
    ],
  },
  resolve: {
    alias: {
      // Force single instance (avoid duplicates when framework != project dir).
      // Use `$` exact-match so subpath imports (e.g. `react-router/dom`) still
      // resolve via the package's exports map instead of being rewritten to a
      // directory path.
      "react$": path.resolve(projectDirectory, "node_modules/react"),
      "react-dom$": path.resolve(projectDirectory, "node_modules/react-dom"),
      "react-router-dom$": path.resolve(projectDirectory, "node_modules/react-router-dom"),
      "react-router$": path.resolve(projectDirectory, "node_modules/react-router"),
      "aplos/config": path.resolve(__dirname, "src/config.js"),
      "aplos/navigation": path.resolve(
        __dirname,
        "src/components/navigation.jsx",
      ),
      "aplos/head": path.resolve(__dirname, "src/components/head.jsx"),
      "@": projectDirectory + "/src",
      "~": projectDirectory + "/src",
      "@aplos_config": projectDirectory + "/.aplos/cache/config.js",
      "@aplos_routes": projectDirectory + "/.aplos/cache/routes.js",
      "@aplos_pages": projectDirectory + "/.aplos/cache/pages.js",
      "@aplos_head": projectDirectory + "/.aplos/cache/head.js",
      "@aplos_middleware": projectDirectory + "/.aplos/cache/middleware.js",
      "aplos/internal/passthrough-layout": path.resolve(__dirname, "src/runtime/passthrough-layout.jsx"),
      "aplos/internal/default-not-found": path.resolve(__dirname, "src/runtime/default-not-found.jsx"),
      "aplos/internal/default-middleware": path.resolve(__dirname, "src/runtime/default-middleware.js"),
      "aplos/redirect": path.resolve(__dirname, "src/runtime/redirect.js"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  plugins,
  devServer: {
    hot: true,
    historyApiFallback: true,
  },
};

export default merge(frameworkConfig, userConfig);

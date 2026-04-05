import path from "path";
import { HtmlRspackPlugin, CssExtractRspackPlugin, CopyRspackPlugin } from "@rspack/core";
import ReactRefreshPlugin from "@rspack/plugin-react-refresh";
import { fileURLToPath } from "url";
import fs from "fs";
import { pathToFileURL } from "url";
import { merge } from "webpack-merge";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== "production";
const projectDirectory = process.cwd();

// Determine HTML template path
// Priority: 1. public/index.html (user override), 2. default template
const defaultTemplate = path.resolve(__dirname, "./src/client/public/index.html");
const userTemplate = path.resolve(projectDirectory, "public/index.html");

let htmlTemplate = defaultTemplate;
if (fs.existsSync(userTemplate)) {
  htmlTemplate = userTemplate;
  console.log("Using custom HTML template from public/index.html");
}

// Load configuration to get head meta tags
let headConfig = { meta: [], link: [], script: [] };
const configPath = path.join(projectDirectory, 'aplos.config.js');
if (fs.existsSync(configPath)) {
  try {
    const configModule = await import(pathToFileURL(configPath).href);
    const config = configModule.default || configModule;
    headConfig = config.head || headConfig;
  } catch (error) {
    console.error('Error loading configuration for head tags:', error);
  }
}

// Custom plugin to inject head tags
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
          stage: compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
        },
        (assets, callback) => {
          const htmlFiles = Object.keys(assets).filter(file => file.endsWith('.html'));

          htmlFiles.forEach(filename => {
            const asset = assets[filename];
            let html = asset.source().toString();

            let headTags = '';

            // Add meta tags
            if (this.headConfig.meta) {
              this.headConfig.meta.forEach(meta => {
                const attrs = Object.entries(meta)
                  .map(([key, value]) => `${key}="${value}"`)
                  .join(' ');
                headTags += `\n    <meta ${attrs}>`;
              });
            }

            // Add link tags
            if (this.headConfig.link) {
              this.headConfig.link.forEach(link => {
                const attrs = Object.entries(link)
                  .map(([key, value]) => `${key}="${value}"`)
                  .join(' ');
                headTags += `\n    <link ${attrs}>`;
              });
            }

            // Add script tags
            if (this.headConfig.script) {
              this.headConfig.script.forEach(script => {
                const attrs = Object.entries(script)
                  .map(([key, value]) => {
                    if (typeof value === 'boolean' && value) {
                      return key;
                    }
                    return typeof value !== 'boolean' ? `${key}="${value}"` : '';
                  })
                  .filter(Boolean)
                  .join(' ');
                headTags += `\n    <script ${attrs}></script>`;
              });
            }

            // Add title if configured
            if (this.headConfig.defaultTitle) {
              headTags = `\n    <title>${this.headConfig.defaultTitle}</title>` + headTags;
            }

            // Inject into HTML
            html = html.replace('</head>', `${headTags}\n  </head>`);

            assets[filename] = {
              source: () => html,
              size: () => html.length
            };
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
          to: path.resolve(projectDirectory, "./public/dist"),
          globOptions: {
            ignore: ["**/dist/**", "**/index.html"],
          },
        },
      ],
    })
  );
}

// Load project's rspack.config.js if it exists
let userConfig = {};
const userConfigPath = path.resolve(projectDirectory, "rspack.config.js");
if (fs.existsSync(userConfigPath)) {
  try {
    const userModule = await import(pathToFileURL(userConfigPath).href);
    userConfig = userModule.default || userModule;
    console.log("Using custom rspack config from rspack.config.js");
  } catch (error) {
    console.error("Error loading project rspack.config.js:", error.message);
  }
}

const frameworkConfig = {
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment ? "eval-source-map" : false,
  cache: {
    type: "filesystem",
    buildDependencies: {
      config: [path.resolve(__dirname, "rspack.config.js")],
    },
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
    sideEffects: false,
  },
  output: {
    path: path.resolve(process.cwd(), "./public/dist"),
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
          // SWC handles transpilation (TS, JSX, env targets) — much faster than Babel
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
          // Babel is kept solely for React Compiler (no SWC equivalent yet)
          // and react-refresh/babel in dev. Runs after SWC so it receives
          // already-transpiled JS, keeping its workload minimal.
          {
            loader: "babel-loader",
            options: {
              presets: [],
              plugins: [
                ["babel-plugin-react-compiler", {}],
                isDevelopment && "react-refresh/babel",
              ].filter(Boolean),
            },
          },
        ],
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
      // Force single instance (avoid duplicates when framework != project dir)
      "react": path.resolve(projectDirectory, "node_modules/react"),
      "react-dom": path.resolve(projectDirectory, "node_modules/react-dom"),
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
      "aplos/internal/passthrough-layout": path.resolve(__dirname, "src/runtime/passthrough-layout.jsx"),
      "aplos/internal/default-not-found": path.resolve(__dirname, "src/runtime/default-not-found.jsx"),
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

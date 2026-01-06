import path from "path";
import { HtmlRspackPlugin, CssExtractRspackPlugin } from "@rspack/core";
import ReactRefreshPlugin from "@rspack/plugin-react-refresh";
import { fileURLToPath } from "url";
import fs from "fs";
import { pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== "production";
const projectDirectory = process.cwd();

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
    template: path.resolve(__dirname, "./src/client/public/index.html"),
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

export default {
  mode: isDevelopment ? "development" : "production",
  devtool: isDevelopment ? "eval-source-map" : "source-map",
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
        exclude: /node_modules\/(?!aplos)|bower_components/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { modules: false }],
              ["@babel/preset-react", { runtime: "automatic" }],
              "@babel/preset-typescript",
            ],
            plugins: [
              ["babel-plugin-react-compiler", {}],
              isDevelopment && "react-refresh/babel",
            ].filter(Boolean),
          },
        },
      },
      {
        test: /\.css$/,
        use: [CssExtractRspackPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
  resolve: {
    alias: {
      // Force single React instance (avoid duplicate React in linked packages)
      "react": path.resolve(projectDirectory, "node_modules/react"),
      "react-dom": path.resolve(projectDirectory, "node_modules/react-dom"),
      "react-helmet-async": path.resolve(projectDirectory, "node_modules/react-helmet-async"),
      "aplos/config": path.resolve(__dirname, "src/config.js"),
      "aplos/navigation": path.resolve(
        __dirname,
        "src/components/navigation.jsx",
      ),
      "aplos/head": path.resolve(__dirname, "src/components/head.jsx"),
      "@": projectDirectory + "/src",
      "~": projectDirectory + "/src",
      "@aplos_config": projectDirectory + "/.aplos/cache/config.js",
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  plugins,
  devServer: {
    hot: true,
    historyApiFallback: true,
  },
};

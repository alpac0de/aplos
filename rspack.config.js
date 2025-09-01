import path from "path";
import { HtmlRspackPlugin, CssExtractRspackPlugin } from "@rspack/core";
import ReactRefreshPlugin from "@rspack/plugin-react-refresh";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDevelopment = process.env.NODE_ENV !== 'production';
const projectDirectory = process.cwd();

const plugins = [
    new HtmlRspackPlugin({
        template: path.resolve(__dirname, "./src/client/public/index.html"),
    }),
    new CssExtractRspackPlugin(),
];

if (isDevelopment) {
    plugins.push(new ReactRefreshPlugin());
}

export default {
    mode: isDevelopment ? 'development' : 'production',
    optimization: {
        minimize: !isDevelopment,
    },
    output: {
        path: path.resolve(process.cwd(), "./public/dist"),
        publicPath: "/",
    },
    module: {
        rules: [
            {
                test: /\.(js|ts|jsx|tsx)$/,
                exclude: /node_modules\/(?!aplos)|bower_components/,
                use: {
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
                                    development: isDevelopment,
                                    refresh: isDevelopment,
                                },
                            },
                        },
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    CssExtractRspackPlugin.loader,
                    "css-loader",
                    "postcss-loader"
                ],
            },
        ],
    },
    resolve: {
        alias: {
            "aplos/config": path.resolve(__dirname, "src/components/config.js"),
            "aplos/navigation": path.resolve(__dirname, "src/components/navigation.jsx"),
            "aplos/head": path.resolve(__dirname, "src/components/head.jsx"),
            "@": projectDirectory + "/src",
            "~": projectDirectory + "/src",
            "@config": projectDirectory + "/.aplos/cache/config.js",
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    plugins,
    devServer: {
        hot: true,
        historyApiFallback: true,
    }
};

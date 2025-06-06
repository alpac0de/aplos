const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const isDevelopment = process.env.NODE_ENV !== 'production';
const isBun = process.versions?.bun != null;

const plugins = [
    new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "./src/client/public/index.html"),
    }),
    new MiniCssExtractPlugin(),
];

if (isDevelopment) {
    const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
    plugins.push(new ReactRefreshWebpackPlugin());
}

const projectDirectory = process.cwd();

module.exports = {
    mode: isDevelopment ? 'development' : 'production',
    optimization: {
        minimize: !isDevelopment,
        minimizer: !isDevelopment ? [
            {
                apply: (compiler) => {
                    compiler.options.optimization = {
                        ...compiler.options.optimization,
                        minimize: true,
                        parallel: !isBun
                    };
                }
            }
        ] : []
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
                    loader: "babel-loader",
                    options: {
                        plugins: [
                            ["@babel/plugin-proposal-decorators", {legacy: true}],
                            isDevelopment && "react-refresh/babel"
                        ].filter(Boolean),
                        presets: [
                            "@babel/preset-env",
                            "@babel/preset-react",
                            "@babel/preset-typescript",
                        ],
                    },
                },
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, "css-loader", 'postcss-loader'],
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
    plugins
};

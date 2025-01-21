const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const projectDirectory = process.cwd();

module.exports = {
    output: {
        path: path.resolve(process.cwd(), "./public/dist"),
        publicPath: "/",
    },
    module: {
        rules: [
            {
                test: /\.(js|ts|jsx|tsx)$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: "babel-loader",
                    options: {
                        plugins: [["@babel/plugin-proposal-decorators", {legacy: true}]],
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
                use: [MiniCssExtractPlugin.loader, "css-loader"],
            },
        ],
    },
    resolve: {
        alias: {
            "aplos/layout": path.resolve(__dirname, "src/components/layout.tsx"),
            "aplos/config": path.resolve(__dirname, "src/components/config.js"),
            "aplos/navigation": path.resolve(__dirname, "src/components/navigation.jsx"),
            "aplos/head": path.resolve(__dirname, "src/components/head.jsx"),
            "@": projectDirectory + "/src",
            "~": projectDirectory + "/src",
            "@config": projectDirectory + "/.aplos/cache/config.js",
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx']
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, "./src/client/public/index.html"),
        }),
        new MiniCssExtractPlugin(),
    ],
};

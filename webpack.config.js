const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    output: {
        path: path.resolve(process.cwd(), "./public/dist"),
        publicPath: '/',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src/')
        },
    },
    module: {
        rules: [
            {
                test: /\.(js|ts|jsx|tsx)$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        "plugins": [['@babel/plugin-proposal-decorators', { legacy: true }]],
                        "presets": ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"]
                    }
                }
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ]
    },
    plugins: [
        new HtmlWebpackPlugin({
            template:  path.resolve(__dirname, "./src/client/public/index.html"),
        }),
        new MiniCssExtractPlugin(),
    ]
}

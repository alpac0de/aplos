const path = require("path");

module.exports = {
    output: {
        path: path.resolve(__dirname, "./src/client/public/dist"),
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        "presets": ["@babel/preset-env", "@babel/preset-react"]
                    }
                }
            }
        ]
    }
}

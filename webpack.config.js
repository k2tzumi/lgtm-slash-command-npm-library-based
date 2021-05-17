/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const webpack = require('webpack');
const GasPlugin = require("gas-webpack-plugin");

module.exports = {
    mode: "development",
    devtool: false,
    context: __dirname,
    entry: "./src/index.ts",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "index.js",
        globalObject: 'this',
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            buffer: "buffer",
            // http: "stream-http",
            // https: "https-browserify",
            path: "path-browserify",
            process: "process/browser",
            stream: "stream-browserify",
            timers: "timers-browserify",
            util: "util",
            zlib: "browserify-zlib",
        },
        fallback: {
            assert: false,
            fs: false,
            http: false,
            https: false,
            // timers: false,
        }
    },
    node: {
        __dirname: true,
    },
    stats: {
        errorDetails: true
    },
    module: {
        rules: [
            {
                test: /\.[tj]s$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-typescript', '@babel/preset-env'],
                    }
                }
            },
            {
                test: /node_modules\/jpeg-js\/lib\/decoder\.js/,
                use: [
                    'es3ify-loader',
                    {

                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-typescript', '@babel/preset-env'],
                            plugins: ['add-module-exports'],
                        }
                    }
                ]
            },
            {
                enforce: "pre",
                test: /\.[tj]s$/,
                exclude: /node_modules/,
                loader: "eslint-loader",
            }
        ],
    },
    plugins: [
        new GasPlugin({ autoGlobalExportsFiles: ['*.ts'] }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/',
            util: 'util/',
        }),
    ],
};
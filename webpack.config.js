const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require("copy-webpack-plugin");
const {CleanWebpackPlugin} = require('clean-webpack-plugin')

const path = require('path');
const {
    NODE_ENV = 'production',
} = process.env;

module.exports = {
    entry: './src/index.js',
    mode: NODE_ENV,
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: 'index.js'
    },
    resolve: {
        extensions: ['.js'],
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@core': path.resolve(__dirname, './src/core')
        }
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, "./src/config"),
                    to: path.resolve(__dirname, "./build/config")
                },
                {
                    from: path.resolve(__dirname, "./src/static"),
                    to: path.resolve(__dirname, "./build/static")
                }
            ],
        }),
    ],
    externals: [nodeExternals()]
}

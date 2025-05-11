const path = require("path");
const nodeExternals = require("webpack-node-externals");
const webpack = require("webpack");
const dotenv = require("dotenv");

module.exports = {
  target: "node",
  entry: "./src/server.ts",
  mode: "production",
  output: {
    filename: "server.js",
    path: path.resolve(__dirname, "dist"),
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      path: false,
      fs: false,
    },
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            compilerOptions: {
              module: "commonjs",
            },
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env": JSON.stringify(dotenv.config().parsed || {}),
    }),
  ],
  //   stats: "verbose",
  optimization: {
    minimize: false,
  },
  devtool: "source-map",
};

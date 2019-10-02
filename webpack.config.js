// This library allows us to combine paths easily
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
   entry: path.resolve(__dirname, 'src', 'rdf2h.js'),
   output: {
      path: path.resolve(__dirname, 'distribution', 'latest'),
      filename: 'rdf2h.js',
      libraryTarget: 'umd',
      libraryExport: "default",
      library:'rdf2h'
   },
   module: {
      rules: [
         {
             test: /\.js/,
             exclude: /node_modules/,
             use: ['babel-loader']
         }
      ]
   },
   externals: {
     'node-fetch': 'fetch',
     'xmldom': 'window',
     'ext-rdflib': "$rdf"
   },
   devtool: 'source-map'
};
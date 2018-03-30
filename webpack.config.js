// This library allows us to combine paths easily
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJSPlugin = require("uglifyjs-webpack-plugin");

module.exports = {
   entry: path.resolve(__dirname, 'src', 'rdf2h.js'),
   output: {
      path: path.resolve(__dirname, 'output'),
      filename: 'js/rdf2h.js',
      libraryTarget: 'var',
      library: 'rdf2h'
   }
   module: {
      rules: [
         {
             test: /\.js/,
             exclude: /node_modules/,
             use: {
                loader: 'babel-loader',
                options: { presets: ['env'] }
             }
         }
      ]
   },
   externals: {
     'node-fetch': 'fetch',
     'xmldom': 'window',
     'rdflib': "$rdf"
   },
   devtool: 'source-map',
   plugins: [
    new UglifyJSPlugin({
      test: /\.js($|\?)/i,
      sourceMap: true,
      uglifyOptions: {
          compress: true
      }
    })
  ]
};
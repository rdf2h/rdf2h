// This library allows us to combine paths easily
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
   entry: path.resolve(__dirname, 'src', 'index.js'),
   output: {
      path: path.resolve(__dirname, 'output'),
      filename: 'js/bundle.js'
   },
   resolve: {
      extensions: ['.js', '.jsx']
   },
   module: {
      rules: [
         {
             test: /\.js/,
             use: {
                loader: 'babel-loader',
                options: { presets: ['react', 'es2015'] }
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
    new HtmlWebpackPlugin({
      filename: 'index.html',
      title: 'Try RDF2h in your browser',
      template: 'webpack-templates/index.ejs', // Load a custom template (ejs by default see the FAQ for details) 
    })
  ]
};
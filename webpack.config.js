var path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: __dirname + '/docs',
    publicPath: '/',
    filename: 'main.js'
  },
  devServer: {
    contentBase: path.join(__dirname, 'docs'),
    compress: true,
    port: 8080
  }
};
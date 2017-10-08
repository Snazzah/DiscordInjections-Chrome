/*
  ONLY RUN BUILDS WITH `npm run webpack`!
  DO NOT USE NORMAL WEBPACK! IT WILL NOT WORK!
*/

const webpack = require('webpack');
const createVariants = require('parallel-webpack').createVariants;
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const createConfig = options => {
  const plugins = [
    new webpack.DefinePlugin({ 'global.GENTLY': false }),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        __NU_WEBPACK__: '"true"',
      },
    }),
  ];

  if (options.minify) {
    plugins.push(new UglifyJSPlugin({
      uglifyOptions: {
        mangle: { keep_classnames: true },
        output: { comments: false },
      },
    }));
  }

  const filename = `./webpack/nodeutils${options.minify ? '.min' : ''}.js`; // eslint-disable-line

  return {
    entry: './browser.js',
    output: {
      path: __dirname,
      filename,
    },
    node: {
      fs: 'empty',
      __dirname: true,
    },
    plugins,
  };
};

module.exports = createVariants({}, { minify: [false, true] }, createConfig);
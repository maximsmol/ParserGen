import fs from 'fs';
import path from 'path';

import HtmlWebpackPlugin from 'html-webpack-plugin';

import postcssNormalize from 'postcss-normalize';

const p = x => path.resolve(__dirname, x);

const mode = fs.existsSync(p('devlock')) ? 'development' : 'production';

module.exports = {
  entry: p('script/main.js'),
  output: {
    path: p('dist'),
  },
  mode,
  plugins: [
    new HtmlWebpackPlugin({
      template: '!babel-loader!./page/index.js',
    })
  ],
  resolve: {
    alias: {
      '@@webpackMode': p(`build/webpack_${mode}.js`)
    }
  },
  module: {
    rules: [
      {
        test: /\.js/,
        exclude: /node_modules/,
        use: [
          'babel-loader'
        ]
      },
      {
        test: /\.styl/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name() {
                if (mode === 'development') {
                  return '[path][name].css';
                }

                return '[contenthash].css';
              },
            }
          },
          {
            loader: 'extract-loader'
          },
          {
            loader: 'css-loader',
            options: {
              // modules: true,
              sourceMap: true,
              importLoaders: 1
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: () => [
                postcssNormalize()
              ]
            }
          },
          {
            loader: 'stylus-loader'
          }
        ]
      }
    ]
  }
};

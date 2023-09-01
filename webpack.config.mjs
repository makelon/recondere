const API_URL = 'http://localhost:8080';

import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

const filenamePattern = '[name].[contenthash:8]';

const apiUrlWithTrailingSlash = API_URL.slice(-1) === '/'
	? API_URL
	: API_URL + '/';

export default {
	mode: 'production',
	context: path.resolve('static'),
	entry: ['./scripts/main.js', './style.css'],
	output: {
		path: path.resolve('dist', 'static'),
		filename: `${filenamePattern}.js`,
		clean: true
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, 'css-loader']
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
		  'API_URL': `'${apiUrlWithTrailingSlash}'`
		}),
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './index.html',
			minify: false,
			templateParameters: {
				'API_URL': apiUrlWithTrailingSlash
			},
			inject: 'body',
		}),
		new MiniCssExtractPlugin({
			filename: `${filenamePattern}.css`
		})
	],
	optimization: {
  	minimize: false
	}
};

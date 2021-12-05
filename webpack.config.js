const API_URL = 'http://localhost:8080';

const path = require('path'),
	webpack = require('webpack'),
	HtmlWebpackPlugin = require('html-webpack-plugin');
	MiniCssExtractPlugin = require('mini-css-extract-plugin'),
	RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');

const filenamePattern = '[name].[contenthash:8]';

const apiUrlWithTrailingSlash = API_URL.slice(-1) === '/'
	? API_URL
	: API_URL + '/';

module.exports = {
	mode: 'production',
	context: path.resolve(__dirname, 'static'),
	entry: {
		app: './scripts/main.js',
		style: './style.css'
	},
	output: {
		path: path.resolve(__dirname, 'dist', 'static'),
		filename: `${filenamePattern}.js`,
		clean: true
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: 'css-loader'
					}
				]
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
		  'API_URL': `'${apiUrlWithTrailingSlash}'`
		}),
		new RemoveEmptyScriptsPlugin(),
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

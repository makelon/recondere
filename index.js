const express = require('express');
const http = require('http');
const { cli } = require('./src/cli');
const { handler } = require('./src/server');

function start() {
	const port = process.env.PORT || 8080;
	const server = express();
	server.use(express.json())
	server.all('*', handler);
	server.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
}

if (module === require.main) {
	process.argv.length > 2
		? cli()
		: start();
}

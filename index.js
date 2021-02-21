const express = require('express');
const http = require('http');
const { cli } = require('./src/cli');
const { handler } = require('./src/server');

function start() {
	//const server = http.createServer(handler);
  const server = express();
  server.use(express.json())
  server.all('*', handler);
	const port = process.env.PORT || 8080;
	server.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
}

if (module === require.main) {
  if (process.argv.length > 2) {
    cli();
  }
  else {
    start();
  }
}

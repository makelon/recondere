import express from 'express';

import { cli } from './src/cli';
import { handler } from './src/server';

function start(): void {
	const port = process.env.PORT ? Number(process.env.PORT) : 8080;
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

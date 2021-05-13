import express from 'express';

import CliHandler from './api/cli-handler';
import ExpressHandler from './api/express-handler';
import Application from './application';
import { getStorageClient } from './storage/storage-client';

async function runCli(): Promise<void> {
	const storageClient = await getStorageClient();
	new CliHandler(new Application(storageClient)).handle();
}

async function runExpress(): Promise<void> {
	const port = process.env.PORT ? Number(process.env.PORT) : 8080;
	const httpServer = express();
	const storageClient = await getStorageClient();
	const expressHandler = new ExpressHandler(new Application(storageClient));
	httpServer.use(express.json());
	httpServer.all('*', expressHandler.handle.bind(expressHandler));
	httpServer.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
}

async function run(): Promise<void> {
	try {
		await (process.argv.length > 2
			? runCli()
			: runExpress());
	} catch (err) {
		console.error(`Failed to start application: ${err.message}`);
	}
}

if (module === require.main) {
	run();
}

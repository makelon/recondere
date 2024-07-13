import { Request, Response } from 'express';

import ExpressHandler from './api/express-handler.js';
import Application from './application.js';
import { getStorageClient } from './storage/storage-client.js';

let expressHandler: ExpressHandler;

export async function handle(req: Request<void>, res: Response): Promise<void> {
	try {
		if (!expressHandler) {
			const application = new Application(await getStorageClient());
			expressHandler = new ExpressHandler(application);
		}
		expressHandler.handle(req, res);
	} catch (err) {
		console.error(`Application failed to start: ${err.message}`);
	}
}

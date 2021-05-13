import { Request, Response } from 'express';

import Application from '../application';

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const MAX_LENGTH = 1000;

interface StoreRequestBody {
	data: string;
	ttl?: number;
}

export default class ExpressHandler {
	readonly #application: Application;

	constructor(application: Application) {
		this.#application = application;
	}

	private validateRequestBody(body: unknown): body is StoreRequestBody {
		if (!(body && typeof body === 'object')) {
			return false;
		}
		if (!('data' in body) || typeof (body as { data: unknown }).data !== 'string') {
			return false;
		}
		if ('ttl' in body && typeof (body as { ttl: unknown }).ttl !== 'number') {
			return false;
		}
		return true;
	}

	private parseStoreRequest(body: unknown): Required<StoreRequestBody> {
		if (!this.validateRequestBody(body)) {
			throw new Error('Invalid request parameters');
		}
		return {
			data: body.data,
			ttl: body.ttl ? Math.min(body.ttl, 30) : 0,
		};
	}

	private async readEncrypted(req: Request<void>, res: Response<string>): Promise<void> {
		res.set('Cache-Control', 'no-store');
		const linkDetails = decodeURIComponent(req.path.slice(1));
		try {
			const decrypted = await this.#application.readEncrypted(linkDetails);
			res.send(decrypted);
		} catch (err) {
			console.error(err.message);
			res.status(HTTP_BAD_REQUEST)
				.send(err.message);
		}
	}

	private async removeEncrypted(req: Request<void>, res: Response<void>): Promise<void> {
		const id = decodeURIComponent(req.path.slice(1));
		try {
			const numRemoved = await this.#application.removeEncrypted(id);
			if (numRemoved > 0) {
				console.log(`Removed ${numRemoved} records`);
			}
		} catch (err) {
			console.error(err.message);
		}
		res.send();
	}

	private async storeEncrypted(req: Request<void, string, unknown>, res: Response<string>): Promise<void> {
		let requestBody: Required<StoreRequestBody>;
		try {
			requestBody = this.parseStoreRequest(req.body);
		} catch (err) {
			res.status(HTTP_BAD_REQUEST)
				.send(err.message);
			return;
		}

		if (requestBody.data.length > MAX_LENGTH) {
			res.status(HTTP_PAYLOAD_TOO_LARGE)
				.send(`Content exceeds maximum allowed size of ${MAX_LENGTH} bytes`);
			return;
		}

		try {
			const paramString = await this.#application.storeEncrypted(requestBody.data, requestBody.ttl);
			res.send(paramString);
		} catch (err) {
			console.error(err);
			res.status(HTTP_INTERNAL_SERVER_ERROR)
				.send(err.message);
		}
	}

	public handle(req: Request<void>, res: Response): void {
		res.set('Access-Control-Allow-Origin', '*');
		switch (req.method) {
			case 'GET':
				this.readEncrypted(req, res);
				break;
			case 'POST':
				this.storeEncrypted(req, res);
				break;
			case 'DELETE':
				this.removeEncrypted(req, res);
				break;
			case 'OPTIONS':
				res.set('Access-Control-Allow-Methods', 'POST, GET, DELETE');
				res.set('Access-Control-Max-Age', '86400');
				res.set('Access-Control-Allow-Headers', 'Content-Type');
				res.send();
				break;
		}
	}
}

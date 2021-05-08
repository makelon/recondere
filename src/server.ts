import { Request, Response } from 'express';

import { removeEncrypted, readEncrypted, storeEncrypted } from './pwshare';

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const MAX_LENGTH = 1000;

interface StoreRequestBody {
	data: string;
	ttl?: number;
}

function validateRequestBody(body: unknown): body is StoreRequestBody {
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

function parseStoreRequest(body: unknown): Required<StoreRequestBody> {
	if (!validateRequestBody(body)) {
		throw new Error('Invalid request parameters');
	}
	return {
		data: body.data,
		ttl: body.ttl ? Math.min(body.ttl, 30) : 0,
	};
}

function setupResponse(res: Response) {
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.set('Access-Control-Max-Age', '86400');
	res.set('Access-Control-Allow-Headers', 'content-type');
	res.set('Cache-Control', 'no-store');
}

export async function handler(req: Request, res: Response) {
	setupResponse(res);
	if (req.method === 'POST') {
		const { ttl, data } = parseStoreRequest(req.body);
		if (data.length > MAX_LENGTH) {
			res.status(HTTP_PAYLOAD_TOO_LARGE)
				.send(`Content exceeds maximum allowed size of ${MAX_LENGTH} bytes`);
			return;
		}
		try {
			const paramString = await storeEncrypted(data, ttl);
			res.send(paramString);
		} catch (err) {
			console.log(err);
			res.status(HTTP_INTERNAL_SERVER_ERROR)
				.send(err.message);
		}
	} else if (req.method === 'GET') {
		const paramString = req.path.slice(1);
		try {
			const decrypted = await readEncrypted(decodeURIComponent(paramString));
			res.send(decrypted);
		} catch (err) {
			console.log(err.message);
			res.status(HTTP_BAD_REQUEST).send(err.message);
		}
	} else if (req.method === 'DELETE') {
		const paramString = req.path.slice(1);
		try {
			await removeEncrypted(decodeURIComponent(paramString));
		} catch (err) {
			console.log(err.message);
		}
		res.end();
	} else if (req.method === 'OPTIONS') {
		res.end();
	}
}

import { handler } from './server';
import { disconnect } from './storage';

interface Request {
	get(): string;
	method: string;
	path?: string;
	body?: {
		data: string;
	};
}

interface Response {
	set(name: string, value: string): Response;
	send(msg: any): Response;
	status(code: number): Response;
	sendStatus(code: number): Response;
}

function createRequest(): Request {
	const operation = process.argv[2];
	const parameters = process.argv[3] || '';
	const get = () => '';
	if (operation === 'get') {
		return {
			get,
			method: 'GET',
			path: `/${parameters}`,
		}
	}
	if (operation === 'delete') {
		return {
			get,
			method: 'DELETE',
			path: `/${parameters}`,
		}
	}
	if (operation === 'set') {
		return {
			get,
			method: 'POST',
			path: '/',
			body: {
				data: parameters,
			},
		}
	}
	console.log(
`Available operations:
	delete [id]        Remove specified record or clear expired records if <id> is ommitted
	get <params>       Decrypt specified record
	set <content>      Create new record`
	);
	process.exit(1);
}

function createResponse(): Response {
	const res = {
		end: () => {
			return res;
		},
		send: (msg: string) => {
			console.log(msg);
			return res;
		},
		sendStatus: (code: number) => {
			console.log(`Empty HTTP response with status code ${code}`);
			return res;
		},
		status: (code: number) => {
			console.log(`Setting HTTP status code to ${code}`);
			return res;
		},
		set: (_name: string, _value: string) => {
			return res;
		},
	};
	return res;
}

export async function cli() {
	try {
		await handler(createRequest() as any, createResponse() as any);
	} finally {
		await disconnect();
	}
}

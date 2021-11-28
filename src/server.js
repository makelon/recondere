const http = require('http'),
	{ setPersistent, storeEncrypted, readEncrypted } = require('./pwshare');

const DEFAULT_PORT = 8080,
	HTTP_PAYLOAD_TOO_LARGE = 413,
	MAX_LENGTH = 1000;

function parseRequest(req) {
	if (req.get('content-type') === 'application/json') {
		try {
			const { ttl, data } = JSON.parse(req.body);
			return {
				data,
				ttl: Math.min(ttl, 30),
			};
		} catch (err) {
			console.log(err);
		}
	} else {
		return { data: req.body, ttl: false };
	}
}

function setupResponse(res) {
	if (!res.status) {
		res.status = status => {
			res.statusCode = status;
			return res;
		};
		res.send = data => {
			res.end(data);
			return res;
		};
		res.sendStatus = status => {
			res.statusCode = status;
			res.end();
			return res;
		};
		res.set = (name, value) => {
			res.setHeader(name, value);
			return res;
		};
	}
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.set('Access-Control-Max-Age', '86400');
	res.set('Access-Control-Allow-Headers', 'content-type');
}

function setupRequest(req) {
	if (!req.get) {
		req.get = header => req.headers[header];
		req.path = req.url;
	}
}

function readRequestData(req) {
	return new Promise((resolve, reject) => {
		req.body = '';
		req.on('data', data => {
			req.body += data;
		});
		req.on('end', data => {
			if (data) {
				req.body += data;
			}
			resolve();
		});
		req.on('error', err => {
			reject(err);
			req.close();
		});
	});
}

async function handler(req, res) {
	setupResponse(res);
	setupRequest(req);
	if (req.method === 'POST') {
		if (!req.hasOwnProperty('body')) {
			await readRequestData(req);
		}
		if (req.body.length > MAX_LENGTH) {
			return res.status(HTTP_PAYLOAD_TOO_LARGE)
				.send(`Content exceeds maximum allowed size of ${MAX_LENGTH} bytes`);
		}
		try {
			const { ttl, data } = parseRequest(req);
			const paramString = await storeEncrypted(data, ttl);
			res.send(paramString);
		} catch (err) {
			console.log(err);
			res.send(err.message);
		}
	} else if (req.method === 'GET') {
		const paramString = req.path[0] === '/' ? req.path.slice(1) : req.path;
		try {
			const decrypted = await readEncrypted(decodeURIComponent(paramString));
			res.send(decrypted && decrypted.toString());
		} catch (err) {
			console.log(err);
			res.status(400).send(err.message);
		}
	} else if (req.method === 'OPTIONS') {
		res.end();
	}
}

function start() {
	const server = http.createServer(handler);
	const port = process.env.PORT || DEFAULT_PORT
	server.listen(port, () => {
		console.log(`Server listening on port ${port}`);
	});
}

module.exports = {
	handler,
	start,
};

const { storeEncrypted, readEncrypted } = require('./pwshare');

const HTTP_PAYLOAD_TOO_LARGE = 413;
const MAX_LENGTH = 1000;

function parseRequest(body) {
	if ('data' in body) {
		return {
			data: body.data,
			ttl: body.ttl ? Math.min(body.ttl, 30) : false,
		}
	}
}

function setupResponse(res) {
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
	res.set('Access-Control-Max-Age', '86400');
	res.set('Access-Control-Allow-Headers', 'content-type');
}

async function handler(req, res) {
	setupResponse(res);
	if (req.method === 'POST') {
		const { ttl, data } = parseRequest(req.body);
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
			res.status(500)
				.send(err.message);
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

module.exports = {
	handler,
};

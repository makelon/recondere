const { handler } = require('./server');
const { disconnect } = require('./storage');

function createRequest() {
	const req = {
		get: header => '',
	};
	if (process.argv[2] === 'd') {
		req.method = 'GET';
		req.path = process.argv[3];
	} else {
		req.method ='POST';
		req.body = {
			data: process.argv.length > 3 ? process.argv[3] : '',
		};
	}
	return req;
}

function createResponse() {
	const res = {
		send: msg => {
			console.log(msg);
			return res;
		},
		sendStatus: code => {
			console.log(`Empty HTTP response with status code ${code}`);
			return res;
		},
		status: code => {
			console.log(`Setting HTTP status code to ${code}`);
			return res;
		},
		set: (name, value) => {
			return res;
		},
	};
	return res;
}

async function cli() {
	try {
		await handler(createRequest(), createResponse());
	} finally {
		await disconnect();
	}
}

module.exports = {
	cli,
};

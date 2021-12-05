export default function request(url, options) {
	var xhr = new XMLHttpRequest();
	options = options || {};

	xhr.open(options.method || 'GET', url);
	if (options.method === 'POST') {
		xhr.setRequestHeader('content-type', 'application/json');
	}

	function cleanup() {
		xhr.removeEventListener('error', onError);
		xhr.removeEventListener('abort', onError);
		xhr.removeEventListener('load', onLoad);
		xhr.removeEventListener('timeout', onError);
	}

	function onLoad() {
		var headers = xhr.getAllResponseHeaders().split('\n').map(function(headerLine) {
			headerLine = headerLine.split(':');
			var name = headerLine[0],
				value = headerLine[1];
			return [name.trim().toLocaleLowerCase(), value];
		});
		var status = xhr.status;
		var originalBody = xhr.responseText;

		var body = null;
		var ok = status >= 200 && status < 300;
		var error;

		try {
			body = originalBody !== '' && headers['content-type'] === 'application/json'
				? JSON.parse(originalBody)
				: originalBody;
		} catch (e) {
			ok = false;
			error = e;
		}

		if (options.done) {
			if (ok) {
				options.done({
					body: body,
					headers: headers,
					status: status
				});
			} else {
				options.done({
					error: {
						error: error,
						text: originalBody
					},
					headers: headers,
					status: status,
				});
			}
		}
		cleanup();
	};

	function onError() {
		if (options.done) {
			options.done({
				error: {
					error: 'An unknown error occurred.'
				},
				headers: null,
				status: xhr.status || 0,
			});
		}
		cleanup();
	};

	xhr.addEventListener('load', onLoad);
	xhr.addEventListener('error', onError);
	xhr.addEventListener('timeout', onError);
	xhr.addEventListener('abort', onError);

	xhr.send(options.body);
}

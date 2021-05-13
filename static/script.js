var basePath = window.location.protocol + '//' + window.location.host + window.location.pathname;

function getApiUrl() {
	var apiUrl = '%API_URL%';
	return apiUrl.slice(-1) === '/'
		? apiUrl
		: apiUrl + '/';
}

function _(idOrElement, effect) {
	var element = typeof idOrElement === 'object'
		? idOrElement
		: document.getElementById(idOrElement);
	return element && effect
		? effect(element)
		: element;
}

function listen(id, eventName, handler) {
	_(id, function(element) {
		element.addEventListener(eventName, handler);
	});
}

function disable(id, state) {
	_(id, function(element) {
		element.disabled = state !== false;
	});
}

function show(id, state) {
	_(id, function(element) {
		state === false
			? addClass(element, 'hide')
			: removeClass(element, 'hide');
	});
}

function displayDecryptedData(data, isError) {
	_('read-content', function(element) {
		if (isError) {
			element.textContent = 'The service returned an error: '
				+ data
				+ '\nThis may mean that the link has expired.';
			addClass(element, 'error');
		} else {
			element.textContent = data;
			removeClass(element, 'error');
		}
	});
	_('read-params', function(element) {
		element.value = '';
	});
	show('read-content-group');
	if (!isError) {
		show('read-reveal', false);
		show('read-label-success');
		show('read-hide');
	} else {
		disable('read-params', false);
	}
	if ('history' in window && typeof window.history.replaceState === 'function') {
		window.history.replaceState(null, '', basePath);
	}
}

function hideDecryptedData() {
	_('read-content', function(element) {
		removeClass(element, 'error');
	});
	show('read-label-success', false);
	show('read-content-group', false);
	show('read-hide', false);
	show('read-reveal');
	disable('read-params', false);
}

function displayGeneratedLink(paramString) {
	_('create-output', function(element) {
		removeClass(element, 'error');
		element.textContent = basePath + '#' + paramString;
	});
	show('create-copy');
	show('create-output-group');
}

function displayGeneratedLinkError(error) {
	show('create-output-group');
	_('create-output', function(element) {
		element.textContent = error.text || error.error;
		addClass(element, 'error');
	});
}

var readDecryptedData, getEncryptedLink;
(function() {
	var apiUrl = getApiUrl();

	function onReadDecryptedData(response) {
		response.error
			? displayDecryptedData(response.error.text || response.error.error, true)
			: displayDecryptedData(response.body, false);
		disable('read-reveal', false);
	}

	readDecryptedData = function(event) {
		event.preventDefault();
		disable('read-reveal');
		var paramString = encodeURIComponent(event.target.params.value);
		request(apiUrl + paramString, {
			done: onReadDecryptedData
		});
	};

	function onGetEncryptedLink(response) {
		if (response.error) {
			displayGeneratedLinkError(response.error);
		} else {
			_('create-content', function(element) {
				element.value = '';
			});
			displayGeneratedLink(response.body);
		}
	}

	getEncryptedLink = function(event) {
		event.preventDefault();
		disable('create-submit');
		var form = event.target;
		var ttl = Number(form.ttl.value);
		if (isNaN(ttl)) {
			displayGeneratedLinkError('TTL must be a number');
		} else {
			request(apiUrl, {
				method: 'POST',
				body: JSON.stringify({
					ttl: ttl,
					data: form.content.value
				}),
				done: onGetEncryptedLink
			});
		}
		disable('create-submit', false);
	};
})();

function request(url, options) {
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

function switchTab(tabIndex) {
	return function(event) {
		if (event) {
			event.preventDefault();
		}
		var tabContentNodes = document.getElementsByClassName('tab-content');
		var tabButtons = document.getElementsByClassName('tab-button');
		if (tabButtons[tabIndex]) {
			for (var i = 0; i < tabButtons.length; ++i) {
				show(tabContentNodes[i], false);
				removeClass(tabButtons[i], 'active');
			}
			show(tabContentNodes[tabIndex]);
			addClass(tabButtons[tabIndex], 'active');
		}
	}
}

function addClass(element, className) {
	var classNames = element.className.split(' ');
	for (var i = 0; i < classNames.length; ++i) {
		if (classNames[i] === className) {
			return;
		}
	}
	classNames.push(className);
	element.className = classNames.join(' ');
}

function removeClass(element, className) {
	var classNames = element.className.split(' ');
	for (var i = 0; i < classNames.length; ++i) {
		if (classNames[i] === className) {
			classNames.splice(i, 1);
			break;
		}
	}
	element.className = classNames.join(' ');
}

function onHashChange() {
	if (window.location.hash.length > 1) {
		disable('read-params');
		_('read-form').params.value = window.location.hash.slice(1);
		show('read-content-group', false);
		_('read-content', function(element) {
			removeClass(element, 'error');
		});
		switchTab(1)();
	} else {
		disable('read-params', false);
	}
}

listen('read-form', 'submit', readDecryptedData);
listen('create-form', 'submit', getEncryptedLink);
listen('read-hide', 'click', hideDecryptedData);
listen('nav-create', 'click', switchTab(0));
listen('nav-read', 'click', switchTab(1));
listen('nav-info', 'click', switchTab(2));
listen(window, 'hashchange', onHashChange);

onHashChange();

import { _, disable, show, addClass, removeClass, getBasePath } from './dom';
import request from './request';

export function getEncryptedLink(event) {
	event.preventDefault();
	disable('create-submit');
	var form = event.target;
	var ttl = Number(form.ttl.value);
	if (isNaN(ttl)) {
		displayGeneratedLinkError('TTL must be a number');
	} else {
		request(API_URL, {
			method: 'POST',
			body: JSON.stringify({
				ttl: ttl,
				data: form.content.value
			}),
			done: onGetEncryptedLink
		});
	}
	disable('create-submit', false);
}

function onGetEncryptedLink(response) {
	if (response.error) {
		displayGeneratedLinkError(response.error);
	} else {
		_('create-content').value = '';
		displayGeneratedLink(response.body);
	}
}

function displayGeneratedLink(paramString) {
	_('create-output', function(element) {
		removeClass(element, 'error');
		element.textContent = getBasePath() + '#' + paramString;
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

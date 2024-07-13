import { _, disable, show, addClass, removeClass } from './dom.js';
import request from './request.js';
import { base64Encode, basePath } from './utils.js';

export var hasWebCrypto = window.crypto && window.crypto.subtle && typeof window.crypto.subtle.encrypt === 'function';

export function getEncryptionParams() {
	return {
		name: 'AES-GCM',
		iv: Uint8Array.from('0'.repeat(12))
	};
}

export function getEncryptionKey(password) {
	var keyPromise = window.crypto.subtle.importKey(
		'raw',
		password,
		{ name: 'AES-GCM' },
		false,
		['encrypt', 'decrypt']
	);
	if (!(keyPromise instanceof Promise)) {
		return Promise.reject(new Error('Client-side encryption requires a more recent web browser'));
	}
	return keyPromise;
}

export function getEncryptedLink(event) {
	event.preventDefault();
	disable('create-submit');
	var form = event.target;
	var ttl = Number(form.ttl.value);
	if (isNaN(ttl)) {
		displayGeneratedLinkError('TTL must be a number');
	} else {
		var payload = form.content.value;
		if (hasWebCrypto) {
			encryptPayload(payload).then(function(encryptionResult) {
				sendPayload(encryptionResult.payload, ttl, function(response) {
					handleEncryptedLinkResponse(response, encryptionResult.password);
				});
			});
		} else {
			sendPayload(payload, ttl, handleEncryptedLinkResponse);
		}
	}
	disable('create-submit', false);
}

function encryptPayload(payload) {
	var passwordBytes = window.crypto.getRandomValues(new Uint8Array(32));
	return getEncryptionKey(passwordBytes).then(function(key) {
		var payloadBuffer = new TextEncoder().encode(payload);
		return window.crypto.subtle.encrypt(getEncryptionParams(), key, payloadBuffer);
	}).then(function(encryptedPayloadBuffer) {
		var encryptedPayloadView = new Uint8Array(encryptedPayloadBuffer);
		var password = String.fromCharCode.apply(null, passwordBytes);
		return {
			payload: String.fromCharCode.apply(null, encryptedPayloadView),
			password: password
		};
	}).catch(function(error) {
		displayGeneratedLinkError({ text: error.message });
	});
}

function sendPayload(payload, ttl, callback) {
	request(API_URL, {
		method: 'POST',
		body: JSON.stringify({
			ttl: ttl,
			data: payload
		}),
		done: callback
	});
}

function handleEncryptedLinkResponse(response, password) {
	if (response.error) {
		displayGeneratedLinkError(response.error);
	} else {
		_('create-content').value = '';
		var paramString = response.body;
		if (password) {
			paramString += ':' + base64Encode(password);
		}
		displayGeneratedLink(paramString);
	}
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

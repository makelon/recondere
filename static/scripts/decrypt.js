import { _, disable, show, addClass, removeClass } from './dom';
import { getEncryptionParams, getEncryptionKey, hasWebCrypto } from './encrypt';
import request from './request';
import { base64Decode, basePath, stringToBuffer } from './utils';

export function readDecryptedData(event) {
	event.preventDefault();
	disable('read-reveal');
	var paramString = event.target.params.value;
	var paramStringParts = paramString.split(':');
	if (paramStringParts.length === 1) {
		getPayload(paramString, function(response) {
			handleDecryptedDataResponse(response);
			disable('read-reveal', false);
		});
	} else if (hasWebCrypto) {
		paramString = paramStringParts[0];
		var password = base64Decode(paramStringParts[1]);
		var passwordBytes = stringToBuffer(password);
		getEncryptionKey(passwordBytes).then(function(key) {
			getPayload(paramString, function(response) {
				handleDecryptedDataResponse(response, key);
				disable('read-reveal', false);
			});
		});
	} else {
		_('read-content', function(element) {
			element.textContent = 'This link can only be viewed using a more recent web browser.';
			addClass(element, 'error');
		});
		show('read-content-group');
	}
}

function getPayload(paramString, callback) {
	request(API_URL + encodeURIComponent(paramString), {
		done: callback
	});
}

function handleDecryptedDataResponse(response, decryptionKey) {
	if (response.error) {
		displayDecryptedData(response.error.text || response.error.error, true);
	} else if (decryptionKey) {
		decryptPayload(response.body, decryptionKey).then(function(decryptedPayload) {
			displayDecryptedData(decryptedPayload, false);
		});
	} else {
		displayDecryptedData(response.body, false);
	}
}

function decryptPayload(encryptedPayload, key) {
	var encryptedPayloadBuffer = stringToBuffer(encryptedPayload);
	return window.crypto.subtle.decrypt(getEncryptionParams(), key, encryptedPayloadBuffer).then(function(decryptedPayloadBuffer) {
		return new TextDecoder().decode(decryptedPayloadBuffer);
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
	_('read-params').value = '';
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

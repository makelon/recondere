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
		});
	} else if (hasWebCrypto) {
		paramString = paramStringParts[0];
		var password = base64Decode(paramStringParts[1]);
		var passwordBytes = stringToBuffer(password);
		getEncryptionKey(passwordBytes).then(function(key) {
			getPayload(paramString, function(response) {
				handleDecryptedDataResponse(response, key);
			});
		}).catch(function(error) {
			disable('read-reveal', false);
			displayError('Failed to set up decryption key: ' + error.message);
		});
	} else {
		displayError('This link can only be viewed using a more recent web browser.');
	}
}

function getPayload(paramString, callback) {
	request(API_URL + encodeURIComponent(paramString), {
		done: callback,
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
	disable('read-reveal', false);
}

function decryptPayload(encryptedPayload, key) {
	var encryptedPayloadBuffer = stringToBuffer(encryptedPayload);
	return window.crypto.subtle.decrypt(getEncryptionParams(), key, encryptedPayloadBuffer).then(function(decryptedPayloadBuffer) {
		return new TextDecoder().decode(decryptedPayloadBuffer);
	}).catch(function(error) {
		displayError('Failed to decrypt data: ' + error.message);
	});
}

function displayDecryptedData(data, isError) {
	if (isError) {
		displayError('The service returned an error: '
			+ data
			+ '\nThis may mean that the link has expired.');
		disable('read-params', false);
	} else {
		_('read-content', function(element) {
			element.textContent = data;
			removeClass(element, 'error');
		});
		show('read-content-group');
		show('read-reveal', false);
		show('read-label-success');
		show('read-hide');
	}
	_('read-params').value = '';
	if ('history' in window && typeof window.history.replaceState === 'function') {
		window.history.replaceState(null, '', basePath);
	}
}

function displayError(message) {
	_('read-content', function(element) {
		element.textContent = message;
		addClass(element, 'error');
	});
	show('read-content-group');
}

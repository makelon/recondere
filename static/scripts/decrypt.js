import { _, disable, show, addClass, removeClass, getBasePath } from './dom';
import request from './request';

export function readDecryptedData(event) {
	event.preventDefault();
	disable('read-reveal');
	var paramString = encodeURIComponent(event.target.params.value);
	request(API_URL + paramString, {
		done: onReadDecryptedData
	});
}

function onReadDecryptedData(response) {
	response.error
		? displayDecryptedData(response.error.text || response.error.error, true)
		: displayDecryptedData(response.body, false);
	disable('read-reveal', false);
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
		window.history.replaceState(null, '', getBasePath());
	}
}


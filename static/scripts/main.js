import { _, listen, disable, show, addClass, removeClass } from './dom.js';
import { readDecryptedData } from './decrypt.js';
import { getEncryptedLink } from './encrypt.js';

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
	};
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

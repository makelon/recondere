export function _(idOrElement, effect) {
	var element = typeof idOrElement === 'object'
		? idOrElement
		: document.getElementById(idOrElement);
	return element && effect
		? effect(element)
		: element;
}

export function listen(id, eventName, handler) {
	_(id, function(element) {
		element.addEventListener(eventName, handler);
	});
}

export function disable(id, state) {
	_(id, function(element) {
		element.disabled = state !== false;
	});
}

export function show(id, state) {
	_(id, function(element) {
		state === false
			? addClass(element, 'hide')
			: removeClass(element, 'hide');
	});
}

export function addClass(element, className) {
	var classNames = element.className.split(' ');
	for (var i = 0; i < classNames.length; ++i) {
		if (classNames[i] === className) {
			return;
		}
	}
	classNames.push(className);
	element.className = classNames.join(' ');
}

export function removeClass(element, className) {
	var classNames = element.className.split(' ');
	for (var i = 0; i < classNames.length; ++i) {
		if (classNames[i] === className) {
			classNames.splice(i, 1);
			break;
		}
	}
	element.className = classNames.join(' ');
}

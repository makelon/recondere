export var basePath = window.location.protocol + '//' + window.location.host + window.location.pathname;

export function base64Decode(string) {
	var padding = 4 - string.length % 4;
	if (padding === 4) {
		padding = 0;
	}
	var base64String = string
		.replace(/_/g, '/')
		.replace(/-/g, '+')
		.padEnd(string.length + padding, '=');
	return atob(base64String);
}

export function base64Encode(string) {
	return btoa(string)
		.replace(/=+$/, '')
		.replace(/\//g, '_')
		.replace(/\+/g, '-');
}

export function stringToBuffer(string) {
	var stringBytes = new Uint8Array(string.length);
	for (var i = 0; i < string.length; ++i) {
		stringBytes[i] = string.charCodeAt(i);
	}
	return stringBytes.buffer;
}

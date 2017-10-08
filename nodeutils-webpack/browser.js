const browser = typeof window !== 'undefined';
const webpack = !!process.env.__NU_WEBPACK__;

module.exports = {
	Buffer,
	zlib: require('./zlib'),
	EventEmitter: require('eventemitter3')
};
if (browser && webpack) window.NodeUtils = {
	Buffer,
	zlib: require('./zlib'),
	EventEmitter: require('eventemitter3')
};
// eslint-disable-next-line no-console
else if (!browser) console.warn('Warning: Attempting to use browser version of erlpack in a non-browser environment!');
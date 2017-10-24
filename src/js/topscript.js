/*global chrome, NodeUtils */
(function () {
	'use strict';
	let DI = window.DI = {
		extensionId: document.querySelector("#diTopScript").getAttribute("data-extension-id"),
		log(...a){ console.log(`%c[DiscordInjections:TopScript]`, `color: #7289DA; font-weight: bold; `, ...a); },
		loadClientMods(fn, name = Math.random().toString()) {
	        return window.webpackJsonp([name], { [name]: fn }, [name]);
	    }
	}
	DI.log('Started script, running extension ID', DI.extensionId);
	DI.PORT = chrome.runtime.connect(DI.extensionId, { name: "di-topScript" });
	DI.PORT.onMessage.addListener((data, port) => {
		DI.log('ext', data, port);
		switch(data.action){
			case 'ping':
				DI.PORT.postMessage({ action: 'pong' });
				break;
			case 'websocketSend':
				DI.WS.onmessage({ data: JSON.stringify(data.data) });
		}
	});

	// Intercept WebSocket

	class RoutingWebSocket extends window.WebSocket {
		constructor(url, protocols) {
			super(url, protocols);

			if (url.includes('encoding')) {
				DI.WS = this;
				DI.log('Routing WebSocket has been initialized.');
			}

			/* Depricated code since discord build number 6235 
			super.addEventListener('message', e => {
				let data = e.data;
				if (data instanceof ArrayBuffer) data = NodeUtils.Buffer.from(new Uint8Array(data));
				console.log(data);
				chrome.runtime.sendMessage(extensionId, { action: 'websocketRecv', data });
			});*/
		}
	}

	window.WebSocket = RoutingWebSocket;
}());
/*global chrome, NodeUtils */
(function () {
	'use strict';
	let extensionId = document.querySelector("#diTopScript").getAttribute("data-extension-id");
	let log = function(...a){
		console.log(`%c[DiscordInjections:TopScript]`, `color: #7289DA; font-weight: bold; `, ...a);
	}
	log('Started script, running extension ID', extensionId);
	window.DI_PORT = chrome.runtime.connect(extensionId, { name: "di-topScript" });
	window.DI_PORT.onMessage.addListener((data, port) => {
		log('ext', data, port);
		switch(data.action){
			case 'ping':
				window.DI_PORT.postMessage({ action: 'pong' });
				break;
			case 'websocketSend':
				window.DI_WS.onmessage({ data: JSON.stringify(data.data) });
		}
	});

	// Intercept WebSocket

	class RoutingWebSocket extends window.WebSocket {
		constructor(url, protocols) {
			super(url, protocols);

			if (url.includes('encoding')) {
				window.DI_WS = this;
				log('Routing WebSocket has been initialized.');
			}
			super.addEventListener('message', e => {
				let data = e.data;
				if (data instanceof ArrayBuffer) data = NodeUtils.Buffer.from(new Uint8Array(data));
				chrome.runtime.sendMessage(extensionId, { action: 'websocketRecv', data });
			});
		}
	}

	window.WebSocket = RoutingWebSocket;
}());
/*global chrome, NodeUtils */
(function () {
	'use strict';
	let DI = window.DI = {
		extensionId: document.querySelector("#diTopScript").getAttribute("data-extension-id"),
		log(...a){ console.log(`%c[DiscordInjections:TopScript]`, `color: #7289DA; font-weight: bold; `, ...a); },
		debug(...a){ console.debug(`%c[DiscordInjections:TopScript]`, `color: #7289DA; font-weight: bold; `, ...a); },
		loadClientMods(fn, name = Math.random().toString()) {
	        return window.webpackJsonp([name], { [name]: fn }, [name]);
	    }
	}
	DI.log('Started script, running extension ID', DI.extensionId);
	DI.PORT = chrome.runtime.connect(DI.extensionId, { name: "di-topScript" });
	DI.PORT.onMessage.addListener((data, port) => {
		DI.debug('ext', data, port);
		switch(data.action){
			case 'ping':
				DI.PORT.postMessage({ action: 'pong' });
				break;
			case 'sendAsClyde':
				DI._sendAsClydeRaw(data.channel, data.message);
				break;
			case 'fakeMessageRaw':
				DI._fakeMessageRaw(data.channel, data.message);
				break;
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

	// Add things only top script can provide

	window.onload = () => {
		DI.log('Document has loaded.')
		DI.loadClientMods((m, e, r) => {
			let i = 0, interval;
		    let tick = () => {
				if (DI._sendAsClydeRaw && DI._fakeMessageRaw) return clearInterval(interval);
				let d; try { d = r.c[i].exports; } catch (e) { ++i; return; }
				for (let key in d) {
					if (key === 'sendBotMessage' && typeof d[key] === 'function') {
						DI.log('Found sendBotMessage');
						DI._sendAsClydeRaw = d[key].bind(d);
					}
					if (key === 'receiveMessage' && typeof d[key] === 'function') {
						DI.log('Found receiveMessage');
						DI._fakeMessageRaw = d[key].bind(d);
					}
				}
				if (++i >= 7000) return clearInterval(interval);
			};
			interval = setInterval(tick, 5);
		});
	};
}());
/*global chrome */
var dataVer = '6';
var ports = {};
console.clear();

class BGPort {
	constructor(port){
		this.port = port;
		port.postMessage({ action: 'ping' });
		port.onMessage.addListener((data, port) => {
			switch(data.action){
				case 'pong':
					ports[port.sender.tab.id] = this;
					this.id = port.sender.tab.id;
					chrome.tabs.sendMessage(port.sender.tab.id, { action: 'websocketConnect' });
					break;
				default:
					ports[port.sender.tab.id] = this;
					this.id = port.sender.tab.id;
					data.from = 'topscript';
					chrome.tabs.sendMessage(port.sender.tab.id, data);
					break;
			}
			console.log('port', this.id, data);
		});
		port.onDisconnect.addListener(port => {
			chrome.tabs.sendMessage(port.sender.tab.id, { action: 'websocketDisconnect' });
			console.log('port', this.id, 'disconnect');
		});
	}
}

chrome.runtime.onMessage.addListener((req, sender, res) => {
	console.log(req, sender);
	switch(req.action){
		case 'chrome':
			res(chrome);
			break;
		case 'activeTab':
			chrome.tabs.query(req.window ? {active:true,windowId:req.window} : {active:true}, tabs => res(tabs[0]));
			break;
		case 'extensionId':
			res(chrome.runtime.id);
			break;
		case 'identify':
			res(sender);
			break;
		case 'platform':
			chrome.runtime.getPlatformInfo(req);
			break;
	}
	if(req.directedTo === 'topscript') ports[sender.tab.id].port.postMessage(req);
});

chrome.storage.local.get(data => {
	console.log("init getdata with data ver", dataVer, data);
	if(Object.keys(data).length === 0){
		console.log("building data");
		chrome.storage.local.set({
			dataVer,
			options: {
				selectedUpdate: 100,
				autoOverwrite: false,
				reloadDiscord: false
			},
			plugins: [],
			themes: []
		}, () => {
			console.log("finished building");
		});
	}else if(data.dataVer !== dataVer){
		console.log("rebuilding data");
		let nD = data;
		if(!nD.themes) nD.themes = [];
		if(!nD.plugins) nD.plugins = [];
		if(nD.options && nD.options.refrate && !nD.options.refrate.selectedUpdate || nD.options && nD.options.refrate && typeof nD.options.refrate.selectedUpdate === 'boolean') nD.options.refrate.selectedUpdate = 100;
		if(nD.options && nD.options.refrate && typeof nD.options.refrate.tab !== 'undefined') delete nD.options.refrate.tab;
		if(nD.options && nD.options.refrate && typeof nD.options.refrate.selectedUpdate !== 'undefined'){
			nD.options.selectedUpdate = nD.options.refrate.selectedUpdate;
			delete nD.options.refrate;
		}
		if(nD.options && !nD.options.autoOverwrite) nD.options.autoOverwrite = false;
		if(nD.options && !nD.options.reloadDiscord) nD.options.reloadDiscord = false;
		if(nD.cssPath) { delete nD.cssPath; chrome.storage.local.delete('cssPath') }
		if(!(nD.plugins instanceof Array)) nD.plugins = [];
		nD.dataVer = dataVer;
		chrome.storage.local.set(nD, () =>  console.log("finished building"));
		if(data.options.reloadDiscord) chrome.tabs.query({}, tabs => tabs.filter(t => t.url.match(/^https:\/\/(\w+\.|)discordapp.com\/channels/g)).map(t => chrome.tabs.reload(t.id)));
	}else if(data.options.reloadDiscord) chrome.tabs.query({}, tabs => tabs.filter(t => t.url.match(/^https:\/\/(\w+\.|)discordapp.com\/channels/g)).map(t => chrome.tabs.reload(t.id)));
});

chrome.runtime.onMessageExternal.addListener((req, sender) => {
	req.external = true;
	chrome.tabs.sendMessage(sender.tab.id, req);
	if(req.action === 'websocketRecv') return console.log('Suppressed websocketRecv event');
	console.log('external', req, sender);
});

chrome.runtime.onConnectExternal.addListener(p => {
	console.log('onConnectExternal', p);
	new BGPort(p);
});

chrome.tabs.query({}, function(tabs) {
	tabs.map(t => {
		if(t.url.match(/https:\/\/(\w+\.|)discordapp\.com/)){
			let subDomain = t.url.match(/https:\/\/(\w+\.|)discordapp\.com/)[1];
			if(subDomain === "canary.") chrome.browserAction.setIcon({tabId:t.id,path:"canaryicon19.png"});
		}else chrome.browserAction.setIcon({tabId:t.id,path:"disabledicon19.png"});
	});
});

chrome.tabs.onUpdated.addListener(function(ti, c) {
	if(c.url){
		if(c.url.match(/https:\/\/(\w+\.|)discordapp\.com/)){
			let subDomain = c.url.match(/https:\/\/(\w+\.|)discordapp\.com/)[1];
			if(subDomain === "canary.") chrome.browserAction.setIcon({tabId:ti,path:"canaryicon19.png"});
		}else chrome.browserAction.setIcon({tabId:ti,path:"disabledicon19.png"});
	}
});

chrome.tabs.onCreated.addListener(function(t) {
	if(t.url.match(/https:\/\/(\w+\.|)discordapp\.com/)){
		let subDomain = t.url.match(/https:\/\/(\w+\.|)discordapp\.com/)[1];
		if(subDomain === "canary.") chrome.browserAction.setIcon({tabId:t.id,path:"canaryicon19.png"});
	}else chrome.browserAction.setIcon({tabId:t.id,path:"disabledicon19.png"});
});

// Chrome OS Exclusive stuff

let rInt = (min, max) => {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

let sanitize = message => {
	return message.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
}

let genID = () => {
	let randomBlock = () => {
		let rS = String("1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM");
		return rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)]+rS[rInt(0, rS.length-1)];
	}
	return randomBlock() + "-" + randomBlock() + "-" + randomBlock();
}

let handleFiles = files => {
	chrome.storage.local.get(storage => {
		let resmsg = chrome.i18n.getMessage('addedFiles');
		files.map(f => {
			if(f[0].type === 'text/css'){
				console.log('detect css', f);
				let data = {
					title: f[0].name,
					subtitle: '',
					content: f[1],
					name: f[0].name,
					url: genID()
				};
				storage.themes.push(data);
				resmsg += `\n - ${sanitize(f[0].name)}`;
				chrome.storage.local.set({themes: storage.themes});
			}else if(f[0].type === 'application/javascript'){
				console.log('detect js', f);
				let data = {
					title: f[0].name,
					subtitle: '',
					content: f[1],
					name: f[0].name,
					url: genID()
				};
				storage.plugins.push(data);
				resmsg += `\n - ${sanitize(f[0].name)}`;
				chrome.storage.local.set({plugins: storage.plugins});
			}
		});
		if(resmsg === chrome.i18n.getMessage('addedFiles')) resmsg = chrome.i18n.getMessage('noNewFiles');
		chrome.notifications.create({
			type: "basic",
			iconUrl: "icon128.png",
			title: chrome.i18n.getMessage('extName'),
			message: resmsg
		});
	});
}

if(chrome.fileBrowserHandler) chrome.fileBrowserHandler.onExecute.addListener(function(id, details) {
	if (id === 'upload') {
		var fileEntries = details.entries;
		let files = [];
		let onEnd = () => handleFiles(files);
		let len = fileEntries.length;
		for (var i = 0; i < len; ++i) { // eslint-disable-line conditional
			entry = fileEntries[i];
			entry.file(function(f) {
				let fr = new FileReader();
				fr.readAsText(f, 'utf8');
				fr.onloadend = () => {
					files.push([f, fr.result]);
					console.log(len, files.length)
					if (len === files.length) onEnd();
				}
			});
		}
	}
});
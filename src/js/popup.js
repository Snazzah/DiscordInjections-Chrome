/*global chrome, diLocalize */
(function () {
    'use strict';
	diLocalize.documentReadyAndLocalisedAsPromsied(document);
	chrome.windows.getCurrent(w => {
		chrome.tabs.query({active:true,windowId:w.id}, function(tabs) {
			var currentTab = tabs[0];
			console.log(currentTab);
			if(currentTab && currentTab.url.match(/https:\/\/(\w+\.|)discordapp\.com/)){
				console.log("matched regex");
				let subDomain = currentTab.url.match(/https:\/\/(\w+\.|)discordapp\.com/)[1];
				console.log(subDomain);
				if(subDomain === "canary.") {
					document.querySelector(".main-row").classList.remove("discord");
					document.querySelector(".main-row").classList.add("canary");
					document.querySelector(".warp-current-row").classList.add("canary");
				}
				if(currentTab && currentTab.url.match(/https:\/\/(\w+\.|)discordapp\.com\/channels/)){
					console.log("matched webapp regex");
					switch(subDomain){
						case "canary.":
							document.querySelector("#info").innerHTML = chrome.i18n.getMessage("runningWebapp", chrome.i18n.getMessage("canary")) + `<i> v${chrome.runtime.getManifest().version}</i>`;
							chrome.browserAction.setIcon({tabId:currentTab.id,path:"canaryicon19.png"});
							break;
						case "ptb.":
							document.querySelector("#info").innerHTML = chrome.i18n.getMessage("runningWebapp", chrome.i18n.getMessage("PTBs")) + `<i> v${chrome.runtime.getManifest().version}</i>`;
							break;
						default:
							document.querySelector("#info").innerHTML = chrome.i18n.getMessage("runningWebapp", chrome.i18n.getMessage("stable")) + `<i> v${chrome.runtime.getManifest().version}</i>`;
							break;
					}
				}else{
					document.querySelector("#info").innerHTML = chrome.i18n.getMessage("inDiscordWebsite") + `<i> v${chrome.runtime.getManifest().version}</i>`;
					document.querySelector("#wtwa").href = `${currentTab.url.match(/https:\/\/(\w+\.|)discordapp\.com/)[0]}/channels/@me`;
					document.querySelector(".warp-current-row").classList.remove('hide');
					document.body.style = document.querySelector("body").style = "height:196px!important";
				}
			}else{
				chrome.browserAction.setIcon({tabId:currentTab.id,path:"disabledicon19.png"});
				document.querySelector("#info").innerHTML = chrome.i18n.getMessage("notInDiscord") + `<i> v${chrome.runtime.getManifest().version}</i>`;
				document.querySelector(".main-row").classList.add("disabled-row");
				document.body.removeChild(document.querySelector(".warp-current-row"));
			}

			document.onclick = e => {
				console.log(e);
				if(e && e.target && e.target.localName === "a"){
					if(e.target.getAttribute('target') === '_target') chrome.tabs.create({url:e.target.href});
						else chrome.tabs.update(currentTab.id, {url:e.target.href});
					window.close();
				}
			}
		});
	});
}());
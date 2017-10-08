/*global chrome, diLocalize, CodeMirror */
/*jshint evil:false */
(function () {
    'use strict';
	diLocalize.documentReadyAndLocalisedAsPromsied(document);
	const diUtils = window.diUtils = {
		navigate(path, object){
			let steps = path.split('.');
			let destination = object;
			steps.map(step => destination = destination[step]);
			return destination;
		},
		setInPath(path, object, value){
			let steps = path.split('.');
			let destination = object;
			eval("destination"+steps.map(step => `['${step}']`).join('')+" = value");
			return destination;
		},
		convertURL(url){
			const GITHUB_API_URL = 'https://api.github.com';

			const REGEX_GIST_URL     = /^https?:\/\/gist\.github\.com\/.+?\/([0-9a-f]+)(?:\/([0-9a-f]+))?/i;
			const REGEX_RAW_GIST_URL = /^https?:\/\/gist\.githubusercontent\.com\/(.+?\/[0-9a-f]+\/raw\/(?:[0-9a-f]+\/)?.+\..+)$/i;
			const REGEX_RAW_GITHUB_REPO_URL = /^https?:\/\/raw\.github(?:usercontent)?\.com\/(.+?)\/(.+?)\/(.+?)\/(.+)/i;
			const REGEX_GITHUB_REPO_URL     = /^https?:\/\/github\.com\/(.+?)\/(.+?)\/(?!releases\/)(?:(?:blob|raw)\/)?(.+?)\/(.+)/i;
			const REGEX_GITLAB_REPO_URL     = /^https?:\/\/gitlab\.com\/(.+?)\/(.+?)\/(?!releases\/)(?:(?:blob|raw)\/)?(.+?)\/(.+)/i;

			let title = "";
			let subtitle = "";
			let name = "";

			return new Promise((resolve, reject) => {
				if (REGEX_RAW_GITHUB_REPO_URL.test(url)) {
					let matches = url.match(REGEX_RAW_GITHUB_REPO_URL);
					resolve({
						title: matches[1]+'/'+matches[2]+'#'+matches[3],
						name: matches[4].split('/').reverse()[0],
						subtitle: '/'+matches[4],
						url: url.replace(REGEX_RAW_GITHUB_REPO_URL, 'https://rawgit.com/$1/$2/$3/$4'),
						service: 'github'
					});
				} else if (REGEX_RAW_GIST_URL.test(url)) {
					formatRawGistUrl(url);
				} else if (REGEX_GITHUB_REPO_URL.test(url)) {
					let matches = url.match(REGEX_GITHUB_REPO_URL);
					resolve({
						title: matches[1]+'/'+matches[2]+'#'+matches[3],
						name: matches[4].split('/').reverse()[0],
						subtitle: '/'+matches[4],
						url: url.replace(REGEX_GITHUB_REPO_URL, 'https://rawgit.com/$1/$2/$3/$4'),
						service: 'github'
					});
				} else if (REGEX_GIST_URL.test(url)) {
					requestGistUrl(url);
				} else if (REGEX_GITLAB_REPO_URL.test(url)) {
					let matches = url.match(REGEX_GITLAB_REPO_URL);
					resolve({
						title: matches[1]+'/'+matches[2]+'#'+matches[3],
						name: matches[4].split('/').reverse()[0],
						subtitle: '/'+matches[4],
						url: url.replace(REGEX_GITLAB_REPO_URL, 'https://gitlab.com/$1/$2/raw/$3/$4'),
						service: 'gitlab'
					});
				} else {
					resolve({
						title: url.split('/')[2],
						name: url.split('/').reverse()[0],
						subtitle: '/'+url.split('/').slice(3).join('/'),
						url
					});
				}

				function formatRawGistUrl(url) {
					resolve({
						title: url.split('/')[3]+'/'+url.split('/')[4],
						name: url.split('/')[7],
						subtitle: '/'+url.split('/')[7],
						url: url.replace(REGEX_RAW_GIST_URL, 'https://rawgit.com/$1'),
						service: 'github'
					});
			  	}

				function requestGistUrl(url) {
					let matches = url.match(REGEX_GIST_URL);

					let apiUrl = GITHUB_API_URL + '/gists/' + matches[1]
					+ (matches[2] ? '/' + matches[2] : '');

					return fetch(apiUrl).then(res => {
						if (!res.ok) {
							resolve({
								title: url.split('/')[2],
								name: url.split('/').reverse()[0],
								subtitle: '/'+url.split('/').slice(3).join('/'),
								url
							});
							throw new Error('Failed to fetch gist URL from GitHub API');
						}

						return res.json();
					}).then(data => {
						let files     = data && data.files;
						let filenames = files && Object.keys(data.files);

						if (!filenames || !filenames.length) {
							return void setInvalid();
						}

						let rawUrl = files[filenames[0]] && files[filenames[0]].raw_url;

						if (rawUrl) {
							formatRawGistUrl(rawUrl);
						} else {
							resolve({
								title: url.split('/')[2],
								name: url.split('/').reverse()[0],
								subtitle: '/'+url.split('/').slice(3).join('/'),
								url
							});
						}
					});
				}
			});
		},
		parseHTML(html){
			return document.createRange().createContextualFragment(html);
		},
		sanitize(message) {
			return message.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
		},
		toast(message) {
			let e = diUtils.parseHTML(`<div class="toast"><div class="text">${message}</div><button id="close"></div>`).childNodes[0];
			e.querySelector("#close").onclick = () => document.querySelector('.toast-wrapper').removeChild(e);
			document.querySelector('.toast-wrapper').appendChild(e);
		},
		handleFiles(files) {
			let resmsg = chrome.i18n.getMessage('addedFiles');
			files.map(f => {
				if(f[0].type === 'text/css'){
					console.log('detect css', f);
					let e = diUtils.parseHTML(`<div class="file load"><img draggable=false src="https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_insert_drive_file_black_48px.svg"><span></span><small></small><button id="close"><button id="edit"></div>`).childNodes[0];
					document.querySelector('.themes-fe .file-wrapper').appendChild(e);
					let data = {
						title: f[0].name,
						subtitle: '',
						content: f[1],
						name: f[0].name,
						url: diUtils.genID()
					};
					e.setAttribute('data-url', data.url);
					e.querySelector("span").innerHTML = diUtils.sanitize(data.title);
					e.querySelector("small").innerHTML = diUtils.sanitize(data.subtitle);
					e.querySelector("#close").onclick = () => {
						window.dataCache.themes = window.dataCache.themes.filter(t => t.url !== data.url);
						document.querySelector('.themes-fe .file-wrapper').removeChild(e);
						chrome.storage.local.set({themes: window.dataCache.themes});
					}
					e.querySelector("#edit").onclick = () => {
						if(diUtils.CM_ID || diUtils.CM_M) return;
						let t = window.dataCache.themes.find(theme => theme.url === data.url);
						diUtils.CM_ID = t.url;
						diUtils.CM_M = 't';
						diUtils.CodeMirror.setOption("mode", "css");
						diUtils.CodeMirror.setValue(t.content);
						document.querySelector('.code-editor').classList.remove('hide');
						document.querySelector('.code-editor-top input').value = t.name;
					}
					window.dataCache.themes.push(data);
					resmsg += `<br> - ${diUtils.sanitize(f[0].name)}`;
					chrome.storage.local.set({themes: window.dataCache.themes}, () => {
						e.classList.remove('load');
					});
				}else if(f[0].type === 'application/javascript'){
					console.log('detect js', f);
					let e = diUtils.parseHTML(`<div class="file load"><img draggable=false src="https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_insert_drive_file_black_48px.svg"><span></span><small></small><button id="close"><button id="edit"></div>`).childNodes[0];
					document.querySelector('.plugins-fe .file-wrapper').appendChild(e);
					let data = {
						title: f[0].name,
						subtitle: '',
						content: f[1],
						name: f[0].name,
						url: diUtils.genID()
					};
					e.setAttribute('data-url', data.url);
					e.querySelector("span").innerHTML = diUtils.sanitize(data.title);
					e.querySelector("small").innerHTML = diUtils.sanitize(data.subtitle);
					e.querySelector("#close").onclick = () => {
						window.dataCache.plugins = window.dataCache.plugins.filter(t => t.url !== data.url);
						document.querySelector('.plugins-fe .file-wrapper').removeChild(e);
						chrome.storage.local.set({plugins: window.dataCache.plugins});
					}
					e.querySelector("#edit").onclick = () => {
						if(diUtils.CM_ID || diUtils.CM_M) return;
						let t = window.dataCache.plugins.find(theme => theme.url === data.url);
						diUtils.CM_ID = t.url;
						diUtils.CM_M = 'p';
						diUtils.CodeMirror.setOption("mode", "javascript");
						diUtils.CodeMirror.setValue(t.content);
						document.querySelector('.code-editor').classList.remove('hide');
						document.querySelector('.code-editor-top input').value = t.name;
					}
					window.dataCache.plugins.push(data);
					resmsg += `<br> - ${diUtils.sanitize(f[0].name)}`;
					chrome.storage.local.set({plugins: window.dataCache.plugins}, () => {
						e.classList.remove('load');
					});
				}
			});
			if(resmsg === chrome.i18n.getMessage('addedFiles')) resmsg = chrome.i18n.getMessage('noNewFiles');
			diUtils.toast(resmsg);
		},
		genID() {
			let randomBlock = () => {
				let rS = String("1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM");
				return rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)]+rS[diUtils.rInt(0, rS.length-1)];
			}
			return randomBlock() + "-" + randomBlock() + "-" + randomBlock();
		},
		rInt(min, max){
			return Math.floor(Math.random() * (max - min + 1)) + min;
		}
	}
	chrome.runtime.sendMessage({
		action: 'identify',
		directedTo: 'background',
		from: 'menu'
	}, identity => {
		window.addEventListener('load', console.log);
		console.log('identified', identity);
		chrome.tabs.query({}, function(tabs) {
			tabs = tabs.filter(t => t.url.startsWith(chrome.extension.getURL('menu.html')));
			let focTab = tabs[0];
			tabs = tabs.slice(1);
			if(tabs.length !== 0){
				chrome.tabs.update(focTab.id, {active:true});
				tabs.map(t => chrome.tabs.remove(t.id));
			};
			if(focTab.id === identity.tab.id){
				console.log('Finished duplicate tab purge, parsing option elements');
				chrome.storage.local.get(data => {
					window.dataCache = data;
					console.log(data);
					Array.prototype.forEach.call(document.getElementsByTagName('*'), function (el) {
						if (el.hasAttribute('data-optname')) {
							let path = el.getAttribute('data-optname');
							let type = el.getAttribute('data-opttype') || 'string';
							console.log('parsing', {el,path,type});
							switch(el.getAttribute('data-opttype')){
								case 'number':
								case 'string':
									if(type === 'number') el.onkeypress = event => {return event.charCode >= 48 && event.charCode <= 57};
									el.oninput = e => {
										let val = el.value;
										if(type === 'number') val = Number(val);
										let newOptions = diUtils.setInPath(path, window.dataCache.options, val);
										chrome.storage.local.set({ options: newOptions }, () => {
											console.log(`Changed ${path}`, diUtils.navigate(path, window.dataCache.options), val);
											window.dataCache.options = newOptions;
										});
									}
									let elVal = new String(diUtils.navigate(path, window.dataCache.options));
									console.log('parsed', {elVal});
									el.value = elVal;
									break;
								case 'bool':
									el.onclick = e => {
										let val = e.target.checked;
										let newOptions = diUtils.setInPath(path, window.dataCache.options, val);
										chrome.storage.local.set({ options: newOptions }, () => {
											console.log(`Changed ${path}`, diUtils.navigate(path, window.dataCache.options), val);
											window.dataCache.options = newOptions;
										});
									}
									console.log('parsed', diUtils.navigate(path, window.dataCache.options));
									el.checked = diUtils.navigate(path, window.dataCache.options);
									break;
							}
							el.removeAttribute('data-optname');
							el.removeAttribute('data-opttype');
						}
						if(el.hasAttribute('data-scroll-to')){
							let st = el.getAttribute('data-scroll-to').split('-');
							let dom = document.querySelectorAll(st[0])[parseInt(st[1])];
							el.onclick = () => dom.scrollIntoView();
							el.removeAttribute('data-scroll-to');
						}
					});

					let lT = () => {
						data.themes.map(t => {
							let e = diUtils.parseHTML(`<div class="file" data-url="${t.url}"><img draggable=false src="${t.service ? `img/${t.service}.png` : `https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_${t.content ? "insert_drive_file" : "link"}_black_48px.svg`}"><span>${t.title}</span><small>${t.subtitle}</small><button id="close"><button id="edit"></div>`).childNodes[0];
							e.querySelector("#close").onclick = () => {
								window.dataCache.themes = window.dataCache.themes.filter(th => th.url !== t.url);
								document.querySelector('.themes-fe .file-wrapper').removeChild(e);
								chrome.storage.local.set({themes: window.dataCache.themes});
							}
							if(!t.content) e.removeChild(e.querySelector("#edit")); else e.querySelector("#edit").onclick = () => {
								if(diUtils.CM_ID || diUtils.CM_M) return;
								let d = window.dataCache.themes.find(theme => theme.url === t.url);
								console.log(d);
								diUtils.CM_ID = d.url;
								diUtils.CM_M = 't';
								diUtils.CodeMirror.setOption("mode", "css");
								diUtils.CodeMirror.setValue(d.content);
								document.querySelector('.code-editor').classList.remove('hide');
								document.querySelector('.code-editor-top input').value = d.name;
							}
							document.querySelector('.themes-fe .file-wrapper').appendChild(e);
						});
						data.plugins.map(t => {
							let e = diUtils.parseHTML(`<div class="file" data-url="${t.url}"><img draggable=false src="${t.service ? `img/${t.service}.png` : `https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_${t.content ? "insert_drive_file" : "link"}_black_48px.svg`}"><span>${t.title}</span><small>${t.subtitle}</small><button id="close"><button id="edit"></div>`).childNodes[0];
							e.querySelector("#close").onclick = () => {
								window.dataCache.plugins = window.dataCache.plugins.filter(th => th.url !== t.url);
								document.querySelector('.plugins-fe .file-wrapper').removeChild(e);
								chrome.storage.local.set({plugins: window.dataCache.plugins});
							}
							if(!t.content) e.removeChild(e.querySelector("#edit")); else e.querySelector("#edit").onclick = () => {
								if(diUtils.CM_ID || diUtils.CM_M) return;
								let d = window.dataCache.plugins.find(theme => theme.url === t.url);
								console.log(d);
								diUtils.CM_ID = d.url;
								diUtils.CM_M = 'p';
								diUtils.CodeMirror.setOption("mode", "javascript");
								diUtils.CodeMirror.setValue(d.content);
								document.querySelector('.code-editor').classList.remove('hide');
								document.querySelector('.code-editor-top input').value = d.name;
							}
							document.querySelector('.plugins-fe .file-wrapper').appendChild(e);
						});
					}
					if(diUtils.loaded) lT(); else diUtils.loadThis = lT;
				});
			}
		});
	});

	window.onresize = () => {
		document.querySelector('.code-editor-top').style = `width: ${window.innerWidth}px`;
		document.querySelector('.code-editor-bottom').style = `width: ${window.innerWidth}px`;
	}

	window.onload = () => {
		diUtils.loaded = true;
		if(diUtils.loadThis) diUtils.loadThis();
		document.querySelector('.code-editor-top').style = `width: ${window.innerWidth}px`;
		document.querySelector('.code-editor-bottom').style = `width: ${window.innerWidth}px`;
		diUtils.CodeMirror = CodeMirror(document.querySelector('.code-editor-bottom'), {
			value: "",
			mode:  "javascript",
			lineNumbers: true,
			lineWrapping: true
		});
		document.querySelector('.code-editor-top #done').onclick = () => {
			if(!diUtils.CM_ID || !diUtils.CM_M) return;
			let id = diUtils.CM_ID;
			let end = document.querySelector('.code-editor-top input').value.endsWith(diUtils.CM_M === 't' ? '.css' : '.js') ? '' : (diUtils.CM_M === 't' ? '.css' : '.js');
			let mode = diUtils.CM_M === 't' ? 'themes' : 'plugins';
			diUtils.CM_ID = null;
			diUtils.CM_M = null;
			window.dataCache[mode] = window.dataCache[mode].map(t => {
				console.log(t, id);
				if(t.url !== id) return t; else {
					t.content = diUtils.CodeMirror.getValue();
					if(document.querySelector('.code-editor-top input').value !== ""){
						t.name = document.querySelector('.code-editor-top input').value+end;
						t.title = document.querySelector('.code-editor-top input').value+end;
					}
					return t;
				}
			});
			let e = document.querySelector(`[data-url="${id}"]`);
			if(document.querySelector('.code-editor-top input').value !== "") e.querySelector('span').innerHTML = diUtils.sanitize(document.querySelector('.code-editor-top input').value+end);
			document.querySelector('.code-editor').classList.add('hide');
			chrome.storage.local.set({themes: window.dataCache.themes, plugins: window.dataCache.plugins});
		}
		document.querySelector('.code-editor-top #discard').onclick = e => {
			if(!diUtils.CM_ID || !diUtils.CM_M) return;
			let id = diUtils.CM_ID;
			diUtils.CM_ID = null;
			diUtils.CM_M = null;
			document.querySelector('.code-editor').classList.add('hide');
		}
		document.querySelector('.themes-fe input').onkeypress = e => {
			var code = (e.keyCode ? e.keyCode : e.which)
			if (code === 13) {
				let url = document.querySelector('.themes-fe input').value;
				document.querySelector('.themes-fe input').value = "";
				if(window.dataCache.themes.find(t => t.url === url)){
					console.log('err;exist')
					let e = diUtils.parseHTML(`<div class="file error"><span>${chrome.i18n.getMessage('errThemeExists')}</span><button id="close"></div>`).childNodes[0];
					e.querySelector("#close").onclick = () => document.querySelector('.themes-fe .file-wrapper').removeChild(e);
					document.querySelector('.themes-fe .file-wrapper').appendChild(e);
					return;
				};
				let e = diUtils.parseHTML(`<div class="file load"><img draggable=false src="https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_link_black_48px.svg"><span></span><small></small><button id="close"></div>`).childNodes[0];
				document.querySelector('.themes-fe .file-wrapper').appendChild(e);
				diUtils.convertURL(url, e).then(res => {
					if(res.skip) return;
					console.log(res);
					if(window.dataCache.themes.find(t => t.url === res.url)){
						console.log('err;exist')
						e.querySelector('span').innerHTML = chrome.i18n.getMessage('errThemeExists');
						e.removeChild(e.querySelector('img'));
						e.removeChild(e.querySelector('small'));
						e.classList.remove('load');
						e.classList.add('error');
						e.querySelector("#close").onclick = () => document.querySelector('.themes-fe .file-wrapper').removeChild(e);
						return;
					}
					e.querySelector("#close").onclick = () => {
						window.dataCache.themes = window.dataCache.themes.filter(t => t.url !== res.url);
						document.querySelector('.themes-fe .file-wrapper').removeChild(e);
						chrome.storage.local.set({themes: window.dataCache.themes});
					}
					e.querySelector("span").innerHTML = diUtils.sanitize(res.title);
					e.querySelector("small").innerHTML = diUtils.sanitize(res.subtitle);
					e.querySelector("img").src = res.service ? `img/${res.service}.png` : `https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_link_black_48px.svg`;
					e.setAttribute('data-url', res.url);
					window.dataCache.themes.push(res);
					chrome.storage.local.set({themes: window.dataCache.themes}, () => {
						e.classList.remove('load');
					});
				});
			}
		}

		document.querySelector('.plugins-fe input').onkeypress = e => {
			var code = (e.keyCode ? e.keyCode : e.which)
			if (code === 13) {
				let url = document.querySelector('.plugins-fe input').value;
				document.querySelector('.plugins-fe input').value = "";
				if(window.dataCache.plugins.find(t => t.url === url)){
					console.log('err;exist')
					let e = diUtils.parseHTML(`<div class="file error"><span>${chrome.i18n.getMessage('errPluginExists')}</span><button id="close"></div>`).childNodes[0];
					e.querySelector("#close").onclick = () => document.querySelector('.plugins-fe .file-wrapper').removeChild(e);
					document.querySelector('.plugins-fe .file-wrapper').appendChild(e);
					return;
				};
				let e = diUtils.parseHTML(`<div class="file load"><img draggable=false src="https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_link_black_48px.svg"><span></span><small></small><button id="close"></div>`).childNodes[0];
				document.querySelector('.plugins-fe .file-wrapper').appendChild(e);
				diUtils.convertURL(url, e).then(res => {
					if(res.skip) return;
					console.log(res);
					if(window.dataCache.plugins.find(t => t.url === res.url)){
						console.log('err;exist')
						e.querySelector('span').innerHTML = chrome.i18n.getMessage('errPluginExists');
						e.removeChild(e.querySelector('img'));
						e.removeChild(e.querySelector('small'));
						e.classList.remove('load');
						e.classList.add('error');
						e.querySelector("#close").onclick = () => document.querySelector('.plugins-fe .file-wrapper').removeChild(e);
						return;
					}
					e.querySelector("#close").onclick = () => {
						window.dataCache.plugins = window.dataCache.plugins.filter(t => t.url !== res.url);
						document.querySelector('.plugins-fe .file-wrapper').removeChild(e);
						chrome.storage.local.set({plugins: window.dataCache.plugins});
					}
					e.querySelector("span").innerHTML = diUtils.sanitize(res.title);
					e.querySelector("small").innerHTML = diUtils.sanitize(res.subtitle);
					e.querySelector("img").src = res.service ? `img/${res.service}.png` : `https://storage.googleapis.com/material-icons/external-assets/v4/icons/svg/ic_link_black_48px.svg`;
					e.setAttribute('data-url', res.url);
					window.dataCache.plugins.push(res);
					chrome.storage.local.set({plugins: window.dataCache.plugins}, () => {
						e.classList.remove('load');
					});
				});
			}
		}

		document.body.ondragover = (ev) => {
			console.log("dragOver");
			ev.preventDefault();
			if(document.querySelector('.filedrop').classList.contains('hide')) document.querySelector('.filedrop').classList.remove('hide');
		}

		document.body.ondragend = (ev) => {
			console.log("dragEnd");
			// Remove all of the drag data
			var dt = ev.dataTransfer;
			if (dt.items) {
				for (var i = 0; i < dt.items.length; i++) dt.items.remove(i);
			} else ev.dataTransfer.clearData();
		}

		document.body.ondrop = (ev) => {
			console.log("Drop");
			document.querySelector('.filedrop').classList.add('hide');
			ev.preventDefault();
			var dt = ev.dataTransfer;
			var len = dt.items.length;
			for (var i=0; i < dt.items.length; i++) {
				let f = dt.items[i].getAsFile();
				let fr = new FileReader();
				fr.readAsText(f, 'utf8');
				fr.onloadend = e => {
					files.push([f, fr.result]);
					console.log(len, files.length)
					if (len === files.length) onEnd();
				}
			}
			let files = [];
			let onEnd = () => diUtils.handleFiles(files);
		}

		document.body.ondragleave = e => {
			if(!e.relatedTarget) document.querySelector('.filedrop').classList.add('hide');
		}

		document.querySelectorAll("#send>input").forEach(input => {
			input.onchange = () => {
				console.log("Prompt");
				var len = input.files.length;
				for (var i=0; i < input.files.length; i++) {
					let f = input.files[i];
					let fr = new FileReader();
					fr.readAsText(f, 'utf8');
					fr.onloadend = e => {
						files.push([f, fr.result]);
						console.log(len, files.length)
						if (len === files.length) onEnd();
					}
				}
				let files = [];
				let onEnd = () => diUtils.handleFiles(files);
			}
		});
	}
}());
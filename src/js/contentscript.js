/*global chrome, NodeUtils, Discord */
let dataCache = {};
chrome.storage.local.get(data => {
    dataCache = data;
    Object.assign(window, {
        get DI_DATA(){ return dataCache }
    });

    chrome.storage.onChanged.addListener(() => {
        chrome.storage.local.get(data => {
            dataCache = data;
        });
    });

    const DI = window.DI = {
    	client: null,
    	localStorage: null,
    	PluginManager: null,
        CommandHandler: null,
    	StateWatcher: null,
        Structures: {},
        Constants:  {
            DIBot: '336957616527900672'
        },
    	CS: {
    		request(action, data, directedTo = "background"){
    			return new Promise((resolve) => {
    				chrome.runtime.sendMessage({ action, directedTo, data, from: 'contentscript' }, resolve);
    			});
    		},

    		log(...a){
    			console.log(`%c[DiscordInjections]`, `color: #7289DA; font-weight: bold; `, ...a);
    		},

    		debug(...a){
    			console.debug(`%c[DiscordInjections]`, `color: #7289DA; font-weight: bold; `, ...a);
    		},

            error(...a){
                console.error(`%c[DiscordInjections]`, `color: #7289DA; font-weight: bold; `, ...a);
            }
    	},

        reloadImports(){
            let URLimports = window.DI_DATA.themes.filter(t => !t.content).map(t => `@import url("${t.url}");
`).join("");
            let fileImports = window.DI_DATA.themes.filter(t => t.content).map(t => `/* File: ${t.name} */

${t.content}

`).join("");
            document.querySelector('#diImports').innerHTML = `/* DI URL Imports */

${URLimports}
        
${fileImports}`
        },

    	getReactInstance(node) {
    		return node[Object.keys(node).find((key) => key.startsWith('__reactInternalInstance'))];
    	},

        parseHTML(html) {
            return document.createRange().createContextualFragment(html);
        },

    	get version() { return chrome.runtime.getManifest().version; },
    	get browser() { return 'chrome'; }
    };

    //     __     __   __       __     ______     ______     ______   __     __   __     ______    
    //    /\ \   /\ "-.\ \     /\ \   /\  ___\   /\  ___\   /\__  _\ /\ \   /\ "-.\ \   /\  ___\      //
    //    \ \ \  \ \ \-.  \   _\_\ \  \ \  __\   \ \ \____  \/_/\ \/ \ \ \  \ \ \-.  \  \ \ \__ \     //
    //     \ \_\  \ \_\\"\_\ /\_____\  \ \_____\  \ \_____\    \ \_\  \ \_\  \ \_\\"\_\  \ \_____\    //
    //      \/_/   \/_/ \/_/ \/_____/   \/_____/   \/_____/     \/_/   \/_/   \/_/ \/_/   \/_____/    //
    //                                                                                                //

    // Intercept Local Storage and initiate client.

    let localStorage = window.DI.localStorage = window.localStorage;

    localStorage.constructor.prototype._setItem = localStorage.constructor.prototype.setItem;
    localStorage.constructor.prototype.setItem = (...args) => {
        try {
            if (localStorage.getItem(args[0]) !== args[1]) {
                let lastModified = localStorage.getItem('DI-LastModified');
                if (!lastModified) lastModified = {};
                else lastModified = JSON.parse(lastModified);
                lastModified[args[0]] = Date.now();
                localStorage._setItem('DI-LastModified', JSON.stringify(lastModified));
            }
        } catch (err) {
            console.error(err);
        }
        localStorage._setItem(...args);
    };

    class BridgedClient extends Discord.Client {
        constructor(options) {
            super(options);
            let lastpath = window.location.pathname;
            this.setInterval(() => {
                if (lastpath === window.location.pathname) return;
                this.emit('selectedUpdate', {
                    guild: this.guilds.get(lastpath.split('/')[2]),
                    channel: lastpath.split('/')[3] ? this.channels.get(lastpath.split('/')[3]) : undefined
                }, {
                    guild: this.guilds.get(window.location.pathname.split('/')[2]),
                    channel: window.location.pathname.split('/')[3] ? this.channels.get(window.location.pathname.split('/')[3]) : undefined
                });
                lastpath = window.location.pathname;
            }, window.DI_DATA.options.selectedUpdate);
        }
    }

    DI.client = new BridgedClient();
    DI.client.login(window.DI.localStorage.getItem('token').replace(/"/g, ''));
    DI.client.on('debug', DI.CS.debug);
    DI.client.on('ready', ()=>DI.CS.debug('Discord.JS send ready event'));

    // Inject top script into document for top-level use.

    chrome.runtime.onMessage.addListener(data => {
        switch(data.action){
            case 'websocketConnect':
                DI.CS.log('Websocket connection porting finished.');
                break;
        }
    });

    let script = document.createElement('script');
    script.id = "diNodeUtils";
    script.src = chrome.extension.getURL('js/nodeutils.min.js');
    document.querySelector('html').appendChild(script);
    script.onload = () => {
        DI.CS.log('Inserting top script.');
        let script = document.createElement('script');
        script.id = "diTopScript";
        script.setAttribute('data-extension-id', chrome.runtime.id);
        script.src = chrome.extension.getURL('js/topscript.js');
        document.querySelector('html').appendChild(script);
    }

    window.onload = () => {
        document.querySelector('head').appendChild(DI.parseHTML(`<link rel="stylesheet" href="${chrome.extension.getURL('inject.css')}">`).childNodes[0]);

        // Add Themes
        let style = document.createElement('style');
        style.id = "diImports";
        document.querySelector('head').appendChild(style);
        DI.reloadImports();

        DI.StateWatcher = new DI.Structures.StateWatcher();
        DI.Helpers = new DI.Structures.Helpers();
        DI.CommandHandler = new DI.Structures.CommandHandler();
        DI.Changelog = new DI.Structures.Changelog();

        window.DI_DATA.plugins.filter(p => !p.content).map(p => fetch(p.url).then(r => r.text()).then(eval)); // eslint-disable-line unsafe-eval
        window.DI_DATA.plugins.filter(p => p.content).map(p => eval(p.content)); // eslint-disable-line unsafe-eval

        DI.CS.log('Loaded.');

        window.onunload = () => DI.PluginManager.unload(Object.keys(DI.PluginManager.plugins));
    }

    //     ______     ______   ______     __  __     ______     ______   __  __     ______     ______     ______        //
    //    /\  ___\   /\__  _\ /\  == \   /\ \/\ \   /\  ___\   /\__  _\ /\ \/\ \   /\  == \   /\  ___\   /\  ___\       //
    //    \ \___  \  \/_/\ \/ \ \  __<   \ \ \_\ \  \ \ \____  \/_/\ \/ \ \ \_\ \  \ \  __<   \ \  __\   \ \___  \      //
    //     \/\_____\    \ \_\  \ \_\ \_\  \ \_____\  \ \_____\    \ \_\  \ \_____\  \ \_\ \_\  \ \_____\  \/\_____\     //
    //      \/_____/     \/_/   \/_/ /_/   \/_____/   \/_____/     \/_/   \/_____/   \/_/ /_/   \/_____/   \/_____/     //
    //                                                                                                                  //

    class Command {
        constructor(plugin, options = {}) {
            this.plugin = plugin;
            if (options.name) this.name = options.name;
            else throw new Error(chrome.i18n.getMessage('commandDefInfo'));
            this.info = options.info || chrome.i18n.getMessage('errCommandNoName');
            this.usage = options.usage || '';
            this.usage = this.usage.replace(/</g, '&lt;').replace(/>/g, '&gt;');

            if (options.func) this.execOverride = options.func;
        }

        get header() { if (this.plugin) return this.plugin.name; else return ''; }
        _execute(args) { if (this.execOverride) return this.execOverride(args); else return this.execute(args); }
        execute() { /* no-op */ }
    }

    DI.Structures.Command = Command;

    /* ----------------------------------------------------------------------------------------------------------------- */

    class Plugin extends window.NodeUtils.EventEmitter {
        /**
         * Plugin constructor
         * @param {Object} pack - The package.json object
         * @param {String} [pack.color] - An optional log colour
         */
        constructor(pack, css) {
            super();

            if (this.constructor === Plugin) throw new Error('Cannot instantiate an abstract class!');
            this._name = name;
            this._commands = [];
            this._loadPackage(pack);
            this._loadCss(css);
            this._packIntoManager();
            this.load();
            this.log("Loaded!");
        }

        get defaultIconURL() {
            if (!this.hash) this.hash = this.name.split('').reduce(function (a, b) {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0) % 4;
            switch (this.hash) {
                case 0: return `https://discordinjections.xyz/img/logo-alt-green.svg`;
                case 1: return `https://discordinjections.xyz/img/logo-alt-grey.svg`;
                case 2: return `https://discordinjections.xyz/img/logo-alt-red.svg`;
                case 3: return `https://discordinjections.xyz/img/logo-alt-yellow.svg`;
            }
        }

        get iconURL() { return this.pack.iconURL || this.defaultIconURL; }

        _loadPackage(pack) {
            this.pack = pack;
            if (!this.pack.hasOwnProperty('author') || !this.pack.hasOwnProperty('version') || !this.pack.hasOwnProperty('description'))
                throw new Error(chrome.i18n.getMessage('errPluginDeps'));
        }

        _loadCss(css) {
            try {
                if(!css) return;
                let cssElement = this._styleTag;
                if (!cssElement) {
                    cssElement = document.getElementById(`diCSS-${this.name}`) || document.createElement('style');
                    cssElement.id = `diCSS-${this.name}`;
                    this._styleTag = cssElement;
                    document.head.appendChild(this._styleTag);
                }
                cssElement.innerHTML = css;
            } catch (err) {
                this.log(chrome.i18n.getMessage('errSkipCSS'));
            }
        }

        _packIntoManager(){
            DI.PluginManager.classes[this.name] = this.class;
            DI.PluginManager.plugins[this.name] = this;
            DI.PluginManager.emit('plugin-loaded', this);
        }

        _unload() {
            for (const command of this._commands) window.DI.CommandHandler.unhookCommand(command.name);
            let cssElement = document.getElementById(`diCSS-${this.name}`);
            if (cssElement) cssElement.parentElement.removeChild(cssElement);
            this.removeAllListeners();
            this.unload();
        }

        load() {}
        unload() {}
        get name() { return this.pack ? this.pack.name : this._name ? this._name || this.constructor.name : this.constructor.name; }
        get author() { return this.pack.author; }
        get version() { return this.pack.version; }
        get description() { return this.pack.description; }
        get color() { return this.pack.color || 0x444444; }

        get settings() {
            try {
                let res = JSON.parse(window.DI.localStorage.getItem('DI-' + this.name));
                if (res === null) {
                    this.settings = {};
                    return {};
                } else return res;
            } catch (err) {
                this.settings = {};
                return {};
            }
        }

        get hasSettings() { return window.DI.localStorage.getItem('DI-' + this.name) !== null; }

        set settings(val) {
            window.DI.localStorage.setItem('DI-' + this.name, JSON.stringify(val));
            if (typeof this.settingsChanged === 'function') this.settingsChanged();
        }

        log(...args) { console.log(`%c[${this.name}]`, `color: #${this.color}; font - weight: bold; `, ...args); }

        error(...args) { console.error(`%c[${this.name}]`, `color: #${this.color}; font - weight: bold; `, ...args); }

        registerCommand(options) {
            let command = new Command(this, options);
            DI.CommandHandler.hookCommand(command);
            this._commands.push(command);
        }

        sendLocalMessage(message, sanitize) { return window.DI.Helpers.sendLog(this.name, message, this.iconURL, sanitize); }

        broadcast(event, ...args) { return window.DI.PluginManager.pluginEmit(this._name.toLowerCase() + ':' + event, ...args); }

        getPlugin(name) { return window.DI.PluginManager.plugins[name]; }

        insertScriptURL(url) {
            return DI.Helpers.insertScriptURL(url);
        }

        insertScript(src) {
            return DI.Helpers.insertScript(src);
        }
    }

    DI.Structures.Plugin = Plugin;

    //     __    __     ______     __   __     ______     ______     ______     ______     ______        //
    //    /\ "-./  \   /\  __ \   /\ "-.\ \   /\  __ \   /\  ___\   /\  ___\   /\  == \   /\  ___\       //
    //    \ \ \-./\ \  \ \  __ \  \ \ \-.  \  \ \  __ \  \ \ \__ \  \ \  __\   \ \  __<   \ \___  \      //
    //     \ \_\ \ \_\  \ \_\ \_\  \ \_\\"\_\  \ \_\ \_\  \ \_____\  \ \_____\  \ \_\ \_\  \/\_____\     //
    //      \/_/  \/_/   \/_/\/_/   \/_/ \/_/   \/_/\/_/   \/_____/   \/_____/   \/_/ /_/   \/_____/     //
    //                                                                                                   //
                                                                                           

    class PluginManager extends window.NodeUtils.EventEmitter {
        constructor() {
            super();
            this.classes = {};
            this.plugins = {};
        }

        get pluginNames() {
            return Object.keys(this.classes);
        }

        pluginEmit(ev, ...args) {
            Object.keys(this.plugins).forEach(name => {
                this.plugins[name].emit(ev, ...args);
            });
        }

        load(plugin) {
            try {
                new plugin();
            } catch (err) {
                console.error(chrome.i18n.getMessage('errFailLoadPlugin'), plugin, err);
            }
        }

        unload(name) {
            if (Array.isArray(name)) {
                let loaded = [];
                for (const nam of name) if (this.unload(nam) === true) loaded.push(nam);
                return loaded;
            }
            try {
                name = name.toLowerCase();
                // skip already "unloaded" (non existant) plugins
                if (!this.plugins[name]) return true;
                this.plugins[name]._unload();
                delete this.plugins[name];
                delete this.classes[name];
                console.log(chrome.i18n.getMessage('unloadedPlugin', name));
                return true;
            } catch (err) {
                console.error(chrome.i18n.getMessage('errFailUnloadPlugin'), name, err);
            }
        }

        reload(name) {
            if (Array.isArray(name)) {
                let loaded = [];
                for (const nam of name) if (this.reload(nam)) loaded.push(nam);
                return loaded;
            }
            try {
                name = name.toLowerCase();
                this.unload(name);
                this.load(name);
                console.log(chrome.i18n.getMessage('reloadedPlugin', name));
                return true;
            } catch (err) {
                console.error(chrome.i18n.getMessage('errFailReloadPlugin'), window._path.basename(name), err);
            }
        }
    }

    DI.PluginManager = new PluginManager();

    /* ----------------------------------------------------------------------------------------------------------------- */

    class CommandHandler {
        constructor() {
            let diNode = DI.localStorage.getItem('DI-DiscordInjections');
            if (diNode === null) {
                let commandPrefix = window.DI.localStorage.getItem('customPrefix') || '//';
                window.DI.localStorage.setItem('DI-DiscordInjections', JSON.stringify({ commandPrefix }));
            } else {
                diNode = JSON.parse(diNode);
                if (!diNode.commandPrefix) {
                    diNode.commandPrefix = '//';
                    window.DI.localStorage.setItem('DI-DiscordInjections', JSON.stringify(diNode));
                }
            }

            this.commands = {};
            this.commandElements = {};

            this.hookCommand(new Command(null, { name: 'load', info: 'Loads a plugin.', usage: '<name>...', func: this.loadPlugin }));
            this.hookCommand(new Command(null, { name: 'unload', info: 'Unloads a plugin.', usage: '<name>...', func: this.unloadPlugin }));
            this.hookCommand(new Command(null, { name: 'reload', info: 'Reloads a plugin.', usage: '<name>...', func: this.reloadPlugin }));
            this.hookCommand(new Command(null, { name: 'setprefix', info: 'Sets the custom command prefix.', usage: '<prefix>', func: this.commandSetPrefix.bind(this) }));
            this.hookCommand(new Command(null, { name: 'echo', info: 'Is there an echo in here?', usage: '<text>', func: this.commandEcho }));
            this.hookCommand(new Command(null, { name: 'changelog', info: 'Shows the changelog.', func: this.commandChangelog }));

            document.addEventListener('input', this.onInput.bind(this));
            document.addEventListener('keydown', this.onKeyDown.bind(this));

            this.acRows = [];
            this.currentSet = [];
            this.offset = 0;
        }
        loadPlugin(args) {
            let plugins = DI.PluginManager.load(args);
            if (plugins.length === 0)
                DI.Helpers.sendDI('Failed to load any plugins! Please check console for errors.');
            else
                DI.Helpers.sendDI(`Loaded the plugin${plugins.length > 1 ? 's' : ''} ${plugins.join(', ')}.`);
        }
        unloadPlugin(args) {
            let plugins = DI.PluginManager.unload(args);
            if (plugins.length === 0)
                DI.Helpers.sendDI('Failed to unload any plugins! Please check console for errors.');
            else
                DI.Helpers.sendDI(`Unloaded the plugin${plugins.length > 1 ? 's' : ''} ${plugins.join(', ')}.`);
        }
        reloadPlugin(args) {
            let plugins = DI.PluginManager.reload(args);
            if (plugins.length === 0)
                DI.Helpers.sendDI('Failed to reload any plugins! Please check console for errors.');
            else
                DI.Helpers.sendDI(`Reloaded the plugin${plugins.length > 1 ? 's' : ''} ${plugins.join(', ')}.`);
        }
        commandEcho(args) { DI.Helpers.sendLog(DI.client.user.username, args.join(' '), DI.client.user.avatarURL); }
        commandChangelog() { DI.Changelog.post(true); }
        commandSetPrefix(args) {
            let slashWarning = false;
            let prefix = '//';
            if (args.length > 0) {
                prefix = args.join(' ');
                if (prefix === '/') slashWarning = true;
                this.setPrefix(prefix);
            } else {
                this.setPrefix(prefix);
            }
            DI.Helpers.sendDI(`Set the custom prefix to \`${prefix}\`.\n${slashWarning ? `Warning: Setting the prefix to \`/\` may have undesired consequences due to conflict with the actual client. If you run into issues, you may reset your prefix by opening the console (ctrl+shift+i) and typing:\n\`\`\`\nDI.CommandHandler.setPrefix('//')\n\`\`\`` : ''}`);
        }

        setPrefix(prefix) {
            let diNode = JSON.parse(window.DI.localStorage.getItem('DI-DiscordInjections'));
            diNode.commandPrefix = prefix;
            DI.localStorage.setItem('DI-DiscordInjections', JSON.stringify(diNode));
            console.log('The prefix has been changed to', prefix);
        }

        get prefix() { return JSON.parse(DI.localStorage.getItem('DI-DiscordInjections')).commandPrefix.toLowerCase(); }

        hookCommand(command) {
            if (command instanceof DI.Structures.Command) {
                if (this.commands[command.name]) throw new Error(`A command with the name ${command.name} already exists!`);
                this.commands[command.name] = command;
                this.commandElements[command.name] = this.makeACRow(command);
                console.log(`Loaded command '${command.name}' ${command.plugin ? 'from plugin ' + command.plugin.name : ''}.`);
            } else throw new Error('Tried to load a non-command', command);
        }

        unhookCommand(name) {
            if (this.commands[name]) {
                let command = this.commands[name];
                delete this.commands[name];
                delete this.commandElements[name];
                console.log(`Unloaded command '${command.name}' ${command.plugin ? 'from plugin ' + command.plugin.name : ''}.`);
            }
        }

        get textarea() { return document.querySelector('.chat .content textarea'); }
        get autoComplete() { return document.querySelector('.di-autocomplete'); }

        get selectedIndex() {
            if (this.lastHovered === undefined || this.acRows.length === 0) return null;
            let index = 0;
            for (const { selector } of this.acRows) {
                if (this.lastHovered === selector) return index;
                index++;
            }
        }

        onInput() {
            let textarea = this.textarea;
            if (!textarea || textarea !== document.activeElement || !textarea.value.startsWith(this.prefix)) {
                if (this.autoComplete) this.removeAC();
                return;
            }
            let ac = this.autoComplete;
            let content = textarea.value.toLowerCase();

            if (content.includes(' ')) {
                this.removeAC();
                return;
            }
            if (!ac && !content.includes(' ')) {
                this.initAC();
                ac = this.autoComplete;
            }

            if (content.trim() === this.prefix) {
                this.offset = 0;
                this.currentSet = Object.keys(this.commands);
                this.populateCommands();
            } else {
                content = content.substring(this.prefix.length).trim();
                let [command, ...others] = content.split(' ');
                this.currentSet = Object.keys(this.commands).filter(k => k.includes(command));
                if (this.currentSet.length === 0) {
                    this.removeAC();
                    return;
                }
                let exact = this.currentSet.find(k => k === command);
                if (exact && others.length > 0) {
                    this.currentSet = [exact];
                } else {
                    this.currentSet.sort((a, b) => {
                        let score = 0;
                        if (command === a) score += 100;
                        if (command === b) score -= 100;
                        if (a.startsWith(command)) score += 10;
                        if (b.startsWith(command)) score -= 10;
                        score += a < b ? 1 : -1;
                        return -score;
                    });
                }
                this.offset = 0;
                this.populateCommands();
            }
        }

        populateCommands(move = false, up = true) {
            let keys = this.currentSet;


            if (this.acRows.length === 0) {
                let selection = keys.slice(0, 10);
                this.clearAC();
                for (const command of selection) {
                    this.attachACRow(command);
                }
                if (this.acRows.length > 0)
                    this.onHover(this.acRows[0].selector);
                return;
            }
            let selectedIndex = this.selectedIndex;

            let offset = this.offset;
            if (this.currentSet.length >= 10) {
                if (offset < 0) {
                    offset = this.currentSet.length - 10;
                    selectedIndex = 9;
                }
                if (offset >= this.currentSet.length - 9) {
                    offset = 0;
                    selectedIndex = 0;
                }
            } else offset = 0;
            this.offset = offset;

            if (move) {
                if (up) {
                    selectedIndex--;
                    if (selectedIndex < 0) {
                        if (this.currentSet.length < 10) {
                            selectedIndex = this.currentSet.length - 1;
                        } else {
                            this.offset--;
                            return this.populateCommands();
                        }
                    }
                    return this.onHover(this.acRows[selectedIndex].selector);
                } else {
                    selectedIndex++;
                    if (selectedIndex >= Math.min(10, this.currentSet.length)) {
                        if (this.currentSet.length < 10) {
                            selectedIndex = 0;
                        } else {
                            this.offset++;
                            return this.populateCommands();
                        }
                    }
                    return this.onHover(this.acRows[selectedIndex].selector);
                }
            }

            let selection = keys.slice(this.offset, this.offset + 10);
            this.clearAC();
            for (const command of selection) {
                if (command)
                    this.attachACRow(command);
            }

            if (this.acRows[selectedIndex])
                this.onHover(this.acRows[selectedIndex].selector);
            else if (this.acRows.length > 0) this.onHover(this.acRows[0].selector);
        }

        onKeyDown(event) {
            if (!this.textarea || (event.target === this.textarea && event.key === 'Enter' && this.textarea.value === '')) return;
            if (this.textarea.value.toLowerCase().startsWith(this.prefix))
                switch (event.key) {
                    case 'ArrowUp':
                        if (this.acRows.length > 0) {
                            this.populateCommands(true, true);
                            event.preventDefault();
                        }
                        break;
                    case 'ArrowDown':
                        if (this.acRows.length > 0) {
                            this.populateCommands(true, false);
                            event.preventDefault();
                        }
                        break;
                    case 'Tab':
                        if (this.lastHovered) {
                            this.lastHovered.click();
                            event.preventDefault();
                        }
                        break;
                    case 'Enter': {
                        if (event.shiftKey) return;
                        let command = this.textarea.value;
                        command = command.substring(this.prefix.length).trim();
                        let [name, ...args] = command.split(' ');
                        name = name.toLowerCase();
                        args = window.DI.Helpers.filterMessage(args.join(' ')).split(' ');
                        if (this.commands[name]) {
                            this.textarea.textContent = this.textarea.value = '';

                            try {
                                let inProgress = JSON.parse(window.DI.localStorage.getItem('InProgressText'));
                                inProgress[window.DI.client.selectedChannel.id] = undefined;
                                window.DI.localStorage.setItem('InProgressText', JSON.stringify(inProgress));
                            } catch (err) {
                                console.error(err);
                            }

                            this.onInput();
                            event.preventDefault();
                            let output = this.commands[name]._execute(args);
                            Promise.resolve(output).then(out => out ? window.DI.client.selectedChannel.send(out) : null).then(() => setTimeout(() => {
                                this.textarea.focus();
                                this.textarea.selectionStart = this.textarea.selectionEnd = 0;
                            }, 200));
                            break;
                        } else if (this.lastHovered) {
                            this.lastHovered.click();
                            event.preventDefault();
                        }
                    }
                }
        }

        get selectedClass() { return 'selectorSelected-2M0IGv'; }

        onHover(element) {
            for (const elem of this.acRows) {
                elem.selector.classList.remove(this.selectedClass);
            }
            element.classList.add(this.selectedClass);
            this.lastHovered = element;
        }

        makeSelection(text) {
            let ta = this.textarea;
            if (ta) {
                let components = ta.value.split(' ');
                if (components.length > 1) {
                    components[0] = this.prefix + text;
                    ta.value = components.join(' ');
                } else
                    ta.value = this.prefix + text + ' ';
                this.onInput();
            }
        }

        makeACRow(command) {
            const h2rgb = hex => {
                var result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] : [0, 0, 0];
            };
            const isDark = c => (c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114) > 150 ? false : true;
            let color = null;
            if (command.plugin && typeof command.plugin.color === 'number') color = command.plugin.color.toString(16);
            else if (command.plugin) color = command.plugin.color;
            let ctxfrg = DI.parseHTML(`<div class="autocompleteRowVertical-3_UxVA autocompleteRow-31UJBI command">
            <div class="selector-nbyEfM selectable-3iSmAf">
<div class="flex-lFgbSz flex-3B1Tl4 horizontal-2BEEBe horizontal-2VE-Fw flex-3B1Tl4 directionRow-yNbSvJ justifyStart-2yIZo0 alignCenter-3VxkQP noWrap-v6g9vO content-249Pr9"
style="flex: 1 1 auto;">
<img class="icon-3XfMwL" src="https://discordinjections.xyz/img/logo-alt-nobg.svg">
<div class="marginLeft4-3RAvyQ">${command.name}</div>
<div class="marginLeft4-3RAvyQ primary400-1OkqpL">${command.usage}</div>

<div class="ellipsis-1MzbWB primary400-1OkqpL di-autocomplete-commandinfo" style="flex: 1 1 auto";>${command.plugin ?
        `<span class='command-plugin-tag${isDark(h2rgb(color)) ? ' dark' : ''}' style="color: #${color};border-color: #${command.plugin.color};">
        ${command.plugin.name}</span> - `
        : ''
}${command.info}</div>
</div></div></div>`);

            ctxfrg.childNodes[0].childNodes[0].onmouseover = () => DI.CommandHandler.onHover(ctxfrg.querySelector('.selectable-3iSmAf'));
            ctxfrg.childNodes[0].childNodes[0].onclick = () => DI.CommandHandler.makeSelection(command.name);

            return ctxfrg.childNodes[0];
        }

        attachACRow(name) {
            if (!this.autoComplete) this.initAC();
            this.acRows.push({
                name,
                info: this.commands[name].info,
                usage: this.commands[name].usage,
                selector: this.commandElements[name].childNodes[1],
                element: this.commandElements[name]
            });

            this.autoComplete.appendChild(this.commandElements[name]);
        }

        initAC() {
            let elem = document.querySelector('form textarea');
            if (elem) {
                let element = DI.parseHTML(`<div class="autocomplete-1TnWNR autocomplete-1LLKUa di-autocomplete">
                <div class="autocompleteRowVertical-3_UxVA autocompleteRow-31UJBI header">
                <div class="selector-nbyEfM" style="display: flex;"><div class="di-autocomplete-header-label contentTitle-sL6DrN primary400-1OkqpL weightBold-2qbcng">
                DiscordInjections Commands</div><div style="flex: 1 1;" class="di-autocomplete-header-label contentTitle-sL6DrN di-autocomplete-commandinfo primary400-1OkqpL weightBold-2qbcng">
                PREFIX: ${this.prefix}</div></div></div></div>`).childNodes[0];
                elem.parentElement.insertBefore(element, elem.nextSibling);
            }
        }

        clearAC() {
            this.removeAC();
            this.initAC();
        }

        removeAC() {
            let ac = this.autoComplete;
            if (ac) {
                ac.remove();
                this.acRows = [];
                this.lastHovered = null;
            }
        }
    }

    DI.Structures.CommandHandler = CommandHandler;

    /* ----------------------------------------------------------------------------------------------------------------- */

    class StateWatcher extends window.NodeUtils.EventEmitter {
        constructor() {
            super();
            this.observer = new MutationObserver(this._onMutation.bind(this));
            this.observe();
        }

        get settingsTabs() {
            return {
                'User Settings': 'userSettings',
                'My Account': 'userAccount',
                'Privacy & Safety': 'privacySettings',
                'Authorized Apps': 'authorizedApps',
                'Connections': 'connections',
                'Discord Nitro': 'nitro',
                'App Settings': 'appSettings',
                'Voice': 'voiceSettings',
                'Overlay': 'overlaySettings',
                'Notifications': 'notificationSettings',
                'Keybindings': 'keybindingSettings',
                'Games': 'gameSettings',
                'Text & Images': 'messageSettings',
                'Appearance': 'appearanceSettings',
                'Streamer Mode': 'streamerSettings',
                'Language': 'languageSettings',
                'Change Log': 'changelog',
                'Log Out': 'logout'
            };
        }

        observe() {
            this.observer.disconnect();
            let mutation = { childList: true, subtree: true };
            this.observer.observe(document.querySelector('.app .layers'), mutation);
            this.observer.observe(document.querySelector('html'), { attributes: true });
        }

        _onMutation(muts) {
            //console.log(muts);

            this.emit('mutation', muts);

            if (muts.length === 1 && muts[0].type === 'attributes' && muts[0].attributeName === 'lang') {
                this.emit('languageChange', muts[0].target.attributes.lang.value);
            }

            for (const mut of muts) {

                let changed = [];
                let added = true;
                if (mut.addedNodes.length > 0) {
                    changed = mut.addedNodes;
                } else if (mut.removedNodes.length > 0) {
                    changed = mut.removedNodes;
                    added = false;
                } else {
                    // NOTHING CHANGED?!?!?!11?!!?!?!?
                    return;
                }

                //      console.log(changed);

                // Settings
                if (changed[0] && changed[0].classList && changed[0].classList.contains('layer')) {
                    let node = changed[0];
                    const programSettings = !!changed[0].querySelector('[class*="socialLinks"]');
                    if (programSettings && node.childNodes.length > 0) {
                        let child = node.childNodes[0];
                        if (child.className === 'ui-standard-sidebar-view') {
                            if (added) {
                                this.emit('settingsOpened', mut);

                            } else {
                                this.emit('settingsClosed', mut);
                            }
                        }
                    }
                }
                else if (added && changed[0].parentNode && changed[0].parentNode.className === 'content-column default') {
                    let element = document.querySelector('.layer .sidebar .selected-eNoxEK');
                    let type = this.settingsTabs[element.innerText];
                    if (type === undefined) type = 'unknown';
                    this.emit('settingsTab', type, mut);
                }

                // Chat
                else if (changed[0] && changed[0].classList && changed[0].classList.contains('chat')) {
                    if (added) {
                        this.emit('chatOpened', mut);
                    } else {
                        this.emit('chatClosed', mut);
                    }
                } else if (changed[0] && changed[0].classList && changed[0].classList.contains('channelTextArea-1HTP3C') && added) {
                    this.emit('channelChanged', mut);
                }

                // FriendsList
                else if (changed[0].id === 'friends') {
                    if (added) {
                        this.emit('friendsListOpened', mut);
                    } else {
                        this.emit('friendsListClosed', mut);
                    }
                }
            }
        }
    }

    DI.Structures.StateWatcher = StateWatcher;

    /* ----------------------------------------------------------------------------------------------------------------- */

    let resolver = new Discord.ClientDataResolver(DI.client);

    class Helpers {
        constructor() {
            this.fakeIds = [];
            this.injectedURLs = [];
            this.localChannelId = window.location.pathname.split('/')[3];
        }

        createElement(text) {
            return document.createRange().createContextualFragment(text);
        }

        sanitize(message) {
            return message.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
        }

        generateSnowflake() {
            // Yeah I know, it's inaccurate, but it doesn't need to be accurate
            return ((Date.now() - 1420070400000) * 4194304).toString();
        }

        constructMessage(obj = {}) {
            obj.username = obj.username || 'Clyde';
            obj.attachments = obj.attachments || [];
            obj.embeds = obj.embeds || [];
            if (!obj.content && obj.attachments.length == 0 && obj.embeds.length == 0)
                throw new Error('No content, attachment, or embed');

            let id = this.generateSnowflake();
            let output = {
                nonce: this.generateSnowflake(),
                id,
                attachments: obj.attachments,
                tts: false,
                embeds: obj.embeds,
                timestamp: Date.now(),
                mention_everyone: false,
                pinned: false,
                edited_timestamp: null,
                author: {
                    username: obj.username,
                    discriminator: '0000',
                    id: '1', // we want a clyde effect
                    avatar: 'clyde',
                    bot: true
                },
                mention_roles: [],
                content: obj.content,
                channel_id: window.DI.client.selectedChannel.id,
                mentions: [],
                type: 0
            };
            return output;
        }

        sendClyde(message) {
            let base = {
                username: name,
                content: message
            };
            if (typeof message === 'object') {
                base.content = undefined;
                for (let key in message) {
                    base[key] = message[key];
                }
            }
            chrome.runtime.sendMessage({ action: 'sendAsClyde', directedTo: 'topscript', channel: window.DI.client.selectedChannel.id, message: message });
        }

        // Please refrain from using this, this should be reserved for base DiscordInjections notifications only
        sendDI(message) {
            return this.sendLog('DiscordInjections', message, 'https://discordinjections.xyz/img/logo.png');
        }

        sendLog(name, message, avatarURL = '/assets/f78426a064bc9dd24847519259bc42af.png') {
            if (!this.localChannelId) this.localChannelId = window.location.pathname.split('/')[3];
            let base = {
                username: name,
                content: message
            };
            if (typeof message === 'object') {
                base.content = undefined;
                for (let key in message) {
                    base[key] = message[key];
                }
            }

            chrome.runtime.sendMessage({ action: 'fakeMessageRaw', directedTo: 'topscript', channel: window.DI.client.selectedChannel.id, message: this.constructMessage(base) }, () => {
                const className="is-local-bot-message"
                let elem = document.querySelector(`.${className}:last-child .avatar-large`);
                elem.setAttribute('style', `background-image: url('${avatarURL}');`);
            });
        }

        createModal(content) {
            const root = document.querySelector('#app-mount > div');

            if (this._modal) this.destroyModal();

            this._modal = this.createElement(`
                <div class="theme-dark DI-modal">
                    <div class="callout-backdrop" style="opacity: 0.85; background-color: black; transform: translateZ(0px);"></div>
                    <div class="modal-2LIEKY" style="opacity: 1; transform: scale(1) translateZ(0px);">
                        <div class="inner-1_1f7b">
                            <div class="modal-3HOjGZ sizeMedium-1-2BNS">
                                ${content}
                            </div>
                        </div>
                    </div>
                </div>
            `);
            this._modalBind = this.destroyModal.bind(this);
            this._modal.querySelector('.callout-backdrop').addEventListener('click', this._modalBind);
            if (!this._hasSetKeyListener) {
                document.body.addEventListener('keyup', this._modalKeypress.bind(this));
                this._hasSetKeyListener = true;
            }
            root.appendChild(this._modal);
            this._modal = root.lastElementChild;
        }

        _modalKeypress(e) {
            if (e.code === 'Escape') this.destroyModal();
        }

        destroyModal() {
            if (this._modal) {
                this._modal.childNodes[0].removeEventListener('click', this._modalBind);
                document.body.removeEventListener('keyup', this._modalKeypress.bind(this));
                this._modal.parentNode.removeChild(this._modal);
                this._modal = null;
                this._modalBind = null;
            }
        }

        escape(s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        }

        resolveUser(query) {
            return DI.client.users.find('tag', query.slice(1));
        }

        resolveMention(query) {
            let res = query.match(/<@!?[0-9]+>/g);
            if (!res) return null;
            return resolver.resolveUser(res[0].replace(/<|!|>|@/g, ''));
        }

        filterMessage(message) {
            DI.client.users.forEach(u => message = message.replace(new RegExp(this.escape(`@${u.tag}`), 'g'), u.toString()));
            if (DI.client.selectedGuild) {
                DI.client.selectedGuild.roles.forEach(r => {
                    if (r.mentionable) {
                        message = message.replace(new RegExp(this.escape(`@${r.name}`), 'g'), r.toString());
                    }
                });
                DI.client.selectedGuild.channels.forEach(c => message = message.replace(new RegExp(this.escape(`#${c.name}`), 'g'), c.toString()));
            }
            return message;
        }

        insertScriptURL(url) {
            return new Promise((resolve) => {
                if(this.injectedURLs.includes(url)) return resolve();
                fetch(url).then(r => r.text()).then(t => {
                    eval(t);
                    this.injectedURLs.push(url);
                    resolve();
                });
            });
        }
    }

    DI.Structures.Helpers = Helpers;

    /* ----------------------------------------------------------------------------------------------------------------- */

    class Changelog {
        constructor() {
            fetch(chrome.extension.getURL("changelog.json")).then(r => r.json()).then(c => {this.changelog = c; this.post()});
        }

        post(forced = false){
            if (forced) { this._post(); return; }
            let diNode = DI.localStorage.getItem('DI-DiscordInjections');
            if (diNode === null) {
                DI.localStorage.setItem('DI-DiscordInjections', JSON.stringify({ lastChangelog: pack.version }));
                this._post();
            } else {
                diNode = JSON.parse(diNode);
                if (!diNode.lastChangelog || diNode.lastChangelog !== DI.version) {
                    diNode.lastChangelog = DI.version;
                    this._post();
                    DI.localStorage.setItem('DI-DiscordInjections', JSON.stringify(diNode));
                }
            }
        }

        _post(){
            let output = [];
            let keys = Object.keys(this.changelog).slice(0, 5);
            for (const version of keys) {
                output.push(`<h1 class="added-3Q7OGu title-1PW5Fd marginTop-4_cfcL marginTop20-3UscxH" ${version !== DI.version ? '' : 'style="margin-top: 0px !important"'}>Version ${version}</h1>`);
                for (const key in this.changelog[version]) {
                    let temp = '';
                    temp = `<h5 class="titleDefault-1CWM9y title-3i-5G_ marginReset-3hwONl marginTop20-3UscxH weightMedium-13x9Y8 size16-3IvaX_ height24-2pMcnc flexChild-1KGW5q">${key}</h5>`;
                    temp += '<ul>' + this.changelog[version][key].map(k => `<li>${k}</li>`).join('\n') + '</ul>';
                    output.push(temp);
                }
            }

            DI.Helpers.createModal(`<div class="flex-lFgbSz flex-3B1Tl4 horizontal-2BEEBe horizontal-2VE-Fw flex-3B1Tl4 directionRow-yNbSvJ justifyStart-2yIZo0 alignCenter-3VxkQP noWrap-v6g9vO header-3sp3cE">
    <div class="flexChild-1KGW5q" style="flex: 1 1 auto;">
        <h4 class="h4-2IXpeI title-1pmpPr size16-3IvaX_ height20-165WbF weightSemiBold-T8sxWH defaultColor-v22dK1 defaultMarginh4-jAopYe marginReset-3hwONl">
            DiscordInjections Changelog
        </h4>
        <div class="guildName-1u0hy7 small-3-03j1 size12-1IGJl9 height16-1qXrGy primary-2giqSn">Current Version: ${DI.version}</div>
    </div>
    <svg class="close-3ejNTg flexChild-1KGW5q DI-modal-close-button" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 12 12"><g fill="none" fill-rule="evenodd"><path d="M0 0h12v12H0"></path><path class="fill" fill="currentColor" d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6"></path></g></svg>
</div>
<div class="scrollerWrap-2uBjct content-1Cut5s scrollerThemed-19vinI themeGhostHairline-2H8SiW">
    <div class="scroller-fzNley inner-tqJwAU content-3KEfmo">
    ${output.join('\n')}
</div></div> 
`);
        }
    }

    DI.Structures.Changelog = Changelog;
});
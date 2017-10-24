<img align="left" src="https://i-need.discord.cards/ec6715.png" alt="logo">
<h1><a href="https://github.com/DiscordInjections/DiscordInjections">Discord Injections</a> Chrome Extension</h1>
<a href="https://chrome.google.com/webstore/detail/discord-injections/hfphbcbabihkfndceekinkeoflpkfjpj">Chrome Web Store</a><br>
Maintained by <a href="https://github.com/Snazzah"><b>@Snazzah</b></a>
<br>
<hr>

This extension brings modification to your Discord WebApp.

## Differeences from the actual DiscordInjections
 - No `require()` (which also means no path, fs or anything with files.)
 - Node modules can only be [webpacked](https://webpack.js.org). Which in itself, has limitations.
 - React can't be accessed (You can stil snoop through react instances).
 - DISettings (and `Plugin.setSettingsNode()`, `Plugin.getSettingsNode()`, `Plugin.registerSettingsTab()`) is not available.
 - Plugin structure is different.
 - No `config.json`.
 - No SettingsSync.
 - No web servers.
 - Load scripts with `Helpers.insertScriptURL(url)`.
 - Usage of some of [Chrome's API](https://developer.chrome.com/extensions/declare_permissions).

## Resources Used
 - [discord.js webpack](https://github.com/hydrabolt/discord.js/tree/webpack)
 - [webpack](https://webpack.js.org)
 - [browserify-zlib](https://github.com/devongovett/browserify-zlib)

## Building a NodeUtils webpack
 - Go to the `nodeutils-webpack` directory.
 - Run `npm i && npm run webpack`.
 - Copy and Paste `nodeutils.min.js` into `src/js`.

## Contributing
 - Make sure you have ran `npm run jshint` before making PRs.

## Adding a new D.JS version
1. Download the [**webpack build**](https://github.com/hydrabolt/discord.js/tree/webpack) of discord.js.
2. Place it in the `js` folder of the extension folder.
3. In `manifest.json`, replace `discord.xx.x.x.js` with the filename in `manifest.json`.
4. Reload extension.
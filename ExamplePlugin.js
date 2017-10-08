class ExamplePlugin extends DI.Structures.Plugin {
    constructor() {
        super({                                    // This time, your package is located in here.
            name: "ExamplePlugin",                     // The name of the plugin
            version: "1.0.0",                          // The version of the plugin
            description: 'The best description ever.', // This will be your description.
            author: "Snazzah, digitalAlchemist",       // Whoever made this plugin
            color: 'e74c3c'                            // This is the color of your logs (optional)
        }, `body{};`);                             // All your CSS belongs here. (optional argument)
    }

    // Anything else can be used normally. (If it doesn't use node and stuff...)
}

DI.PluginManager.load(ExamplePlugin); // This must be included at the end so it can load.
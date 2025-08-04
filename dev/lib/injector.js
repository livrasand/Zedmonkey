/**
 * Zedmonkey Script Injector with full GM API support
 * Provides complete Greasemonkey/Violentmonkey compatibility
 */

class ZedmonkeyInjector {
    constructor() {
        this.injectedScripts = new Map();
        this.scriptCounter = 0;
    }

    /**
     * Main injection function with full GM API support
     */
    async injectScript(tabId, script) {
        try {
            // Generate unique script ID
            const scriptId = `zedmonkey_${++this.scriptCounter}_${Date.now()}`;
            
            // First, inject the complete GM API
            await this.injectGMAPI(tabId, script, scriptId);
            
            // Then inject required libraries
            if (script.requires && script.requires.length > 0) {
                await this.injectRequiredLibraries(tabId, script.requires);
            }
            
            // Finally inject the user script
            await this.injectUserScript(tabId, script, scriptId);
            
            // Track injected script
            this.injectedScripts.set(scriptId, {
                tabId,
                name: script.metadata?.name || 'Unnamed Script',
                injectedAt: new Date().toISOString()
            });
            
            console.log(`[Zedmonkey] Successfully injected script: ${script.metadata?.name || scriptId}`);
            return scriptId;
            
        } catch (error) {
            console.error('[Zedmonkey] Error injecting script:', error);
            throw error;
        }
    }
    /**
     * Inject complete GM API with all functions
     */
    async injectGMAPI(tabId, script, scriptId) {
        await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            func: (scriptData, scriptId, resources) => {
                // Create GM_info object
                const GM_info = {
                    script: {
                        author: scriptData.metadata?.author || '',
                        copyright: scriptData.metadata?.copyright || '',
                        description: scriptData.metadata?.description || '',
                        excludes: scriptData.metadata?.exclude || [],
                        homepage: scriptData.metadata?.homepage || scriptData.metadata?.homepageURL || '',
                        icon: scriptData.metadata?.icon || '',
                        icon64: scriptData.metadata?.icon64 || '',
                        includes: scriptData.metadata?.include || [],
                        lastModified: Date.now(),
                        matches: scriptData.metadata?.match || [],
                        name: scriptData.metadata?.name || 'Unnamed Script',
                        namespace: scriptData.metadata?.namespace || '',
                        position: 1,
                        resources: Object.keys(resources || {}),
                        runAt: scriptData.metadata?.['run-at'] || 'document-end',
                        supportURL: scriptData.metadata?.supportURL || '',
                        system: false,
                        unwrap: false,
                        version: scriptData.metadata?.version || '1.0'
                    },
                    scriptMetaStr: scriptData.metaStr || '',
                    scriptSource: scriptData.content || '',
                    scriptUpdateURL: scriptData.metadata?.updateURL || '',
                    scriptWillUpdate: false,
                    scriptHandler: 'Zedmonkey',
                    version: '1.0.0',
                    injectInto: 'page',
                    platform: {
                        arch: 'x86-64',
                        browserName: 'Chrome',
                        browserVersion: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown',
                        os: navigator.platform
                    }
                };

                // Storage for GM functions
                const scriptStorage = new Map();
                const scriptListeners = new Map();

                // GM API Implementation
                const GM_API = {
                    // Storage functions
                    GM_getValue: (name, defaultValue) => {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_getValue',
                                scriptId: scriptId,
                                name: name,
                                defaultValue: defaultValue
                            }, (response) => {
                                resolve(response?.value ?? defaultValue);
                            });
                        });
                    },

                    GM_setValue: (name, value) => {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_setValue',
                                scriptId: scriptId,
                                name: name,
                                value: value
                            }, (response) => {
                                resolve(response?.success || false);
                            });
                        });
                    },

                    GM_deleteValue: (name) => {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_deleteValue',
                                scriptId: scriptId,
                                name: name
                            }, (response) => {
                                resolve(response?.success || false);
                            });
                        });
                    },

                    GM_listValues: () => {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_listValues',
                                scriptId: scriptId
                            }, (response) => {
                                resolve(response?.values || []);
                            });
                        });
                    },

                    // Resource functions
                    GM_getResourceText: (name) => {
                        const resource = resources?.[name];
                        return resource?.content || null;
                    },

                    GM_getResourceURL: (name) => {
                        const resource = resources?.[name];
                        if (!resource?.content) return null;
                        return `data:${resource.mime || 'text/plain'};base64,${btoa(resource.content)}`;
                    },

                    // DOM functions
                    GM_addElement: (tagName, attributes) => {
                        const element = document.createElement(tagName);
                        if (attributes) {
                            Object.entries(attributes).forEach(([key, value]) => {
                                if (key === 'textContent') {
                                    element.textContent = value;
                                } else {
                                    element.setAttribute(key, value);
                                }
                            });
                        }
                        return element;
                    },

                    GM_addStyle: (css) => {
                        const style = document.createElement('style');
                        style.textContent = css;
                        (document.head || document.documentElement).appendChild(style);
                        return style;
                    },

                    // Tab functions
                    GM_openInTab: (url, options = {}) => {
                        return new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_openInTab',
                                url: url,
                                active: options.active !== false,
                                insert: options.insert || false,
                                setParent: options.setParent || false
                            }, (response) => {
                                resolve(response?.tabId || null);
                            });
                        });
                    },

                    // Menu functions
                    GM_registerMenuCommand: (name, callback, options = {}) => {
                        const menuId = `menu_${Date.now()}_${Math.random()}`;
                        chrome.runtime.sendMessage({
                            action: 'GM_registerMenuCommand',
                            scriptId: scriptId,
                            menuId: menuId,
                            name: name,
                            options: options
                        });
                        scriptListeners.set(menuId, callback);
                        return menuId;
                    },

                    GM_unregisterMenuCommand: (menuId) => {
                        chrome.runtime.sendMessage({
                            action: 'GM_unregisterMenuCommand',
                            scriptId: scriptId,
                            menuId: menuId
                        });
                        scriptListeners.delete(menuId);
                    },

                    // Notification function
                    GM_notification: (text, title, image, onclick) => {
                        if (typeof text === 'object') {
                            const options = text;
                            text = options.text;
                            title = options.title;
                            image = options.image;
                            onclick = options.onclick;
                        }
                        
                        chrome.runtime.sendMessage({
                            action: 'GM_notification',
                            text: text,
                            title: title || 'Zedmonkey',
                            image: image
                        });
                        
                        if (onclick) {
                            // Store callback for notification click
                            const notifId = `notif_${Date.now()}`;
                            scriptListeners.set(notifId, onclick);
                        }
                    },

                    // Clipboard function
                    GM_setClipboard: (data, info = 'text') => {
                        return navigator.clipboard.writeText(data).catch(() => {
                            // Fallback for older browsers
                            const textarea = document.createElement('textarea');
                            textarea.value = data;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                        });
                    },

                    // HTTP request function
                    GM_xmlhttpRequest: (details) => {
                        return new Promise((resolve, reject) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_xmlhttpRequest',
                                details: details
                            }, (response) => {
                                if (response?.error) {
                                    reject(new Error(response.error));
                                } else {
                                    resolve(response);
                                }
                            });
                        });
                    },

                    // Download function
                    GM_download: (url, name, headers = {}) => {
                        if (typeof url === 'object') {
                            const options = url;
                            url = options.url;
                            name = options.name;
                            headers = options.headers || {};
                        }
                        
                        return new Promise((resolve, reject) => {
                            chrome.runtime.sendMessage({
                                action: 'GM_download',
                                url: url,
                                name: name,
                                headers: headers
                            }, (response) => {
                                if (response?.error) {
                                    reject(new Error(response.error));
                                } else {
                                    resolve(response);
                                }
                            });
                        });
                    },

                    // Info object
                    GM_info: GM_info
                };

                // Add GM.* aliases for modern API
                const GM = {
                    getValue: GM_API.GM_getValue,
                    setValue: GM_API.GM_setValue,
                    deleteValue: GM_API.GM_deleteValue,
                    listValues: GM_API.GM_listValues,
                    getResourceText: GM_API.GM_getResourceText,
                    getResourceUrl: GM_API.GM_getResourceURL,
                    addElement: GM_API.GM_addElement,
                    addStyle: GM_API.GM_addStyle,
                    openInTab: GM_API.GM_openInTab,
                    registerMenuCommand: GM_API.GM_registerMenuCommand,
                    unregisterMenuCommand: GM_API.GM_unregisterMenuCommand,
                    notification: GM_API.GM_notification,
                    setClipboard: GM_API.GM_setClipboard,
                    xmlHttpRequest: GM_API.GM_xmlhttpRequest,
                    download: GM_API.GM_download,
                    info: GM_info
                };

                // Expose all APIs to global scope
                Object.assign(window, GM_API);
                window.GM = GM;
                window.unsafeWindow = window;

                console.log('[Zedmonkey] GM API injected successfully');
            },
            args: [script, scriptId, script.resources || {}],
            world: 'MAIN'
        });
    }

    /**
     * Inject required libraries (@require)
     */
    async injectRequiredLibraries(tabId, requires) {
        for (const requireUrl of requires) {
            try {
                await chrome.scripting.executeScript({
                    target: { tabId, allFrames: true },
                    func: (libContent, url) => {
                        if (libContent) {
                            const script = document.createElement('script');
                            script.textContent = libContent;
                            script.setAttribute('data-zedmonkey-require', url);
                            (document.head || document.documentElement).appendChild(script);
                            console.log(`[Zedmonkey] Loaded required library: ${url}`);
                        }
                    },
                    args: [requireUrl.content || '', requireUrl.url || requireUrl],
                    world: 'MAIN'
                });
            } catch (error) {
                console.warn(`[Zedmonkey] Failed to load required library: ${requireUrl.url || requireUrl}`, error);
            }
        }
    }

    /**
     * Inject the actual user script
     */
    async injectUserScript(tabId, script, scriptId) {
        await chrome.scripting.executeScript({
            target: { tabId, allFrames: true },
            func: (scriptContent, scriptName, scriptId) => {
                try {
                    // Create script element
                    const scriptElement = document.createElement('script');
                    scriptElement.textContent = scriptContent;
                    scriptElement.setAttribute('data-zedmonkey-script', scriptName);
                    scriptElement.setAttribute('data-zedmonkey-id', scriptId);
                    
                    // Add to document
                    (document.head || document.documentElement).appendChild(scriptElement);
                    
                    console.log(`[Zedmonkey] User script executed: ${scriptName}`);
                } catch (error) {
                    console.error(`[Zedmonkey] Error executing user script: ${scriptName}`, error);
                }
            },
            args: [script.content, script.metadata?.name || 'Unnamed Script', scriptId],
            world: 'MAIN'
        });
    }

    /**
     * Get list of injected scripts
     */
    getInjectedScripts() {
        return Array.from(this.injectedScripts.entries()).map(([id, info]) => ({
            id,
            ...info
        }));
    }

    /**
     * Remove tracking for a script (when tab is closed, etc.)
     */
    removeScript(scriptId) {
        return this.injectedScripts.delete(scriptId);
    }

    /**
     * Clear all tracked scripts
     */
    clearAll() {
        this.injectedScripts.clear();
        this.scriptCounter = 0;
    }
}

// Create singleton instance
const injector = new ZedmonkeyInjector();

// Legacy function wrappers for backwards compatibility
function injectScript(tabId, script) {
    return injector.injectScript(tabId, script);
}

function injectScriptWithResources(tabId, script) {
    return injector.injectScript(tabId, script);
}

export {
    ZedmonkeyInjector,
    injector,
    injectScript,
    injectScriptWithResources
};

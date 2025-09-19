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
     * Injects a script with its required environment (API, libraries).
     * This function will be responsible for creating the sandbox.
     */
    async injectScript(tabId, script) {
        try {
            const scriptId = `zedmonkey_${++this.scriptCounter}_${Date.now()}`;

            // Future steps will build this out properly.
            // For now, we are just cleaning up the old logic.
            
            // 1. Inject required libraries (logic will be moved to background)
            if (script.requires && script.requires.length > 0) {
                await this.injectRequiredLibraries(tabId, script.requires);
            }
            
            // 2. Inject the user script itself into the sandboxed environment
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

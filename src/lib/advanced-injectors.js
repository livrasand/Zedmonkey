/**
 * Advanced Injection Methods for Zedmonkey
 * Implements sophisticated techniques to bypass CSP and other protections
 */

class AdvancedInjectionMethods {
    constructor() {
        this.bridgeScripts = new Map();
        this.tunnelConnections = new Map();
    }

    /**
     * DOM Mutation Injection - Injects scripts by manipulating DOM during mutations
     * Bypasses many CSP restrictions by injecting during DOM operations
     */
    static DOM_MUTATION = {
        name: 'DOM Mutation Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`[DOM_MUTATION] Attempting injection for tab ${tabId}, frame ${frameId}`);
            
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (scriptContent, scriptMeta, scriptId) => {
                        try {
                            // Create a unique execution context
                            const contextId = 'zedmonkey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                            
                            // Set up mutation observer to inject during DOM changes
                            const observer = new MutationObserver((mutations) => {
                                for (const mutation of mutations) {
                                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                        // DOM is being modified, inject during this operation
                                        try {
                                            const scriptElement = document.createElement('script');
                                            scriptElement.textContent = `
                                                (function() {
                                                    // Create isolated execution context
                                                    const context = {};
                                                    
                                                    // Set up GM_info
                                                    if (typeof window.GM_info === 'undefined') {
                                                        window.GM_info = ${JSON.stringify(scriptMeta)};
                                                    }
                                                    
                                                    // Execute user script in protected context
                                                    try {
                                                        ${scriptContent}
                                                    } catch (e) {
                                                        console.error('[Zedmonkey] Script execution error:', e);
                                                    }
                                                })();
                                            `;
                                            
                                            // Inject during the mutation
                                            const target = mutation.addedNodes[0].parentNode || document.head || document.documentElement;
                                            target.appendChild(scriptElement);
                                            
                                            // Clean up immediately
                                            setTimeout(() => {
                                                if (scriptElement.parentNode) {
                                                    scriptElement.parentNode.removeChild(scriptElement);
                                                }
                                            }, 10);
                                            
                                            observer.disconnect();
                                            return true; // Success
                                        } catch (e) {
                                            console.warn('[DOM_MUTATION] Injection failed during mutation:', e);
                                        }
                                    }
                                }
                            });
                            
                            // Observe DOM changes
                            observer.observe(document, {
                                childList: true,
                                subtree: true
                            });
                            
                            // Trigger a DOM change to activate the observer
                            setTimeout(() => {
                                const trigger = document.createElement('div');
                                trigger.style.display = 'none';
                                document.body.appendChild(trigger);
                                
                                setTimeout(() => {
                                    if (trigger.parentNode) {
                                        trigger.parentNode.removeChild(trigger);
                                    }
                                    observer.disconnect();
                                }, 100);
                            }, 50);
                            
                        } catch (error) {
                            throw new Error(`DOM_MUTATION injection failed: ${error.message}`);
                        }
                    },
                    args: [script.content, script.metadata, script.id || 'unknown'],
                    world: 'MAIN'
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`DOM_MUTATION: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(results);
                    }
                });
            });
        }
    };

    /**
     * Iframe Bridge Injection - Uses iframe sandboxing to bypass CSP
     */
    static IFRAME_BRIDGE = {
        name: 'Iframe Bridge Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`[IFRAME_BRIDGE] Attempting injection for tab ${tabId}, frame ${frameId}`);
            
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (scriptContent, scriptMeta, scriptId) => {
                        try {
                            // Create sandboxed iframe
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.sandbox = 'allow-scripts allow-same-origin';
                            
                            // Create the bridge script
                            const bridgeScript = `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <script>
                                        // Set up communication bridge
                                        window.addEventListener('message', (event) => {
                                            if (event.data.type === 'ZEDMONKEY_EXECUTE') {
                                                try {
                                                    // Set up GM API proxy
                                                    window.GM_info = ${JSON.stringify(scriptMeta)};
                                                    
                                                    // Proxy GM functions to parent window
                                                    const gmProxy = {
                                                        getValue: (key, defaultValue) => {
                                                            return new Promise((resolve) => {
                                                                parent.postMessage({
                                                                    type: 'ZEDMONKEY_GM_CALL',
                                                                    method: 'getValue',
                                                                    args: [key, defaultValue],
                                                                    id: Date.now()
                                                                }, '*');
                                                                
                                                                const handler = (e) => {
                                                                    if (e.data.type === 'ZEDMONKEY_GM_RESPONSE') {
                                                                        window.removeEventListener('message', handler);
                                                                        resolve(e.data.result);
                                                                    }
                                                                };
                                                                window.addEventListener('message', handler);
                                                            });
                                                        },
                                                        setValue: (key, value) => {
                                                            return new Promise((resolve) => {
                                                                parent.postMessage({
                                                                    type: 'ZEDMONKEY_GM_CALL',
                                                                    method: 'setValue',
                                                                    args: [key, value],
                                                                    id: Date.now()
                                                                }, '*');
                                                                resolve();
                                                            });
                                                        }
                                                    };
                                                    
                                                    // Set up GM API
                                                    window.GM = gmProxy;
                                                    Object.keys(gmProxy).forEach(key => {
                                                        window['GM_' + key] = gmProxy[key];
                                                    });
                                                    
                                                    // Execute the user script
                                                    eval(event.data.script);
                                                    
                                                    // Notify parent of successful execution
                                                    parent.postMessage({
                                                        type: 'ZEDMONKEY_EXECUTED',
                                                        success: true,
                                                        scriptId: '${scriptId}'
                                                    }, '*');
                                                    
                                                } catch (error) {
                                                    parent.postMessage({
                                                        type: 'ZEDMONKEY_EXECUTED',
                                                        success: false,
                                                        error: error.message,
                                                        scriptId: '${scriptId}'
                                                    }, '*');
                                                }
                                            }
                                        });
                                        
                                        // Signal ready
                                        parent.postMessage({
                                            type: 'ZEDMONKEY_BRIDGE_READY',
                                            scriptId: '${scriptId}'
                                        }, '*');
                                    </script>
                                </head>
                                <body></body>
                                </html>
                            `;
                            
                            iframe.src = 'data:text/html;base64,' + btoa(bridgeScript);
                            
                            // Set up message handling
                            const messageHandler = (event) => {
                                if (event.source !== iframe.contentWindow) return;
                                
                                switch (event.data.type) {
                                    case 'ZEDMONKEY_BRIDGE_READY':
                                        // Bridge is ready, execute script
                                        iframe.contentWindow.postMessage({
                                            type: 'ZEDMONKEY_EXECUTE',
                                            script: scriptContent,
                                            scriptId: scriptId
                                        }, '*');
                                        break;
                                        
                                    case 'ZEDMONKEY_EXECUTED':
                                        // Script executed, clean up
                                        window.removeEventListener('message', messageHandler);
                                        if (iframe.parentNode) {
                                            iframe.parentNode.removeChild(iframe);
                                        }
                                        break;
                                        
                                    case 'ZEDMONKEY_GM_CALL':
                                        // Handle GM API calls
                                        this.handleGMCall(event.data).then(result => {
                                            iframe.contentWindow.postMessage({
                                                type: 'ZEDMONKEY_GM_RESPONSE',
                                                result: result,
                                                id: event.data.id
                                            }, '*');
                                        });
                                        break;
                                }
                            };
                            
                            window.addEventListener('message', messageHandler);
                            
                            // Inject iframe
                            (document.body || document.documentElement).appendChild(iframe);
                            
                            // Timeout cleanup
                            setTimeout(() => {
                                if (iframe.parentNode) {
                                    iframe.parentNode.removeChild(iframe);
                                }
                                window.removeEventListener('message', messageHandler);
                            }, 10000); // 10 second timeout
                            
                        } catch (error) {
                            throw new Error(`IFRAME_BRIDGE injection failed: ${error.message}`);
                        }
                    },
                    args: [script.content, script.metadata, script.id || 'unknown'],
                    world: 'MAIN'
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`IFRAME_BRIDGE: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(results);
                    }
                });
            });
        }
    };

    /**
     * PostMessage Tunnel - Creates a communication tunnel for script execution
     */
    static POSTMESSAGE_TUNNEL = {
        name: 'PostMessage Tunnel Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`[POSTMESSAGE_TUNNEL] Attempting injection for tab ${tabId}, frame ${frameId}`);
            
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (scriptContent, scriptMeta, scriptId) => {
                        try {
                            // Create a worker using data URL to bypass CSP
                            const workerScript = `
                                self.onmessage = function(e) {
                                    if (e.data.type === 'EXECUTE_SCRIPT') {
                                        try {
                                            // Create execution context
                                            const context = {
                                                GM_info: ${JSON.stringify(scriptMeta)},
                                                console: console
                                            };
                                            
                                            // Execute script in worker context
                                            const func = new Function('GM_info', 'console', e.data.script);
                                            func.call(context, context.GM_info, context.console);
                                            
                                            self.postMessage({
                                                type: 'EXECUTION_SUCCESS',
                                                scriptId: e.data.scriptId
                                            });
                                        } catch (error) {
                                            self.postMessage({
                                                type: 'EXECUTION_ERROR',
                                                error: error.message,
                                                scriptId: e.data.scriptId
                                            });
                                        }
                                    }
                                };
                            `;
                            
                            const blob = new Blob([workerScript], { type: 'application/javascript' });
                            const workerUrl = URL.createObjectURL(blob);
                            
                            try {
                                const worker = new Worker(workerUrl);
                                
                                worker.onmessage = (e) => {
                                    if (e.data.type === 'EXECUTION_SUCCESS') {
                                        console.log(`[POSTMESSAGE_TUNNEL] Script executed successfully: ${e.data.scriptId}`);
                                    } else if (e.data.type === 'EXECUTION_ERROR') {
                                        console.error(`[POSTMESSAGE_TUNNEL] Script execution error: ${e.data.error}`);
                                    }
                                    
                                    // Clean up
                                    worker.terminate();
                                    URL.revokeObjectURL(workerUrl);
                                };
                                
                                worker.onerror = (error) => {
                                    console.error('[POSTMESSAGE_TUNNEL] Worker error:', error);
                                    worker.terminate();
                                    URL.revokeObjectURL(workerUrl);
                                };
                                
                                // Send script for execution
                                worker.postMessage({
                                    type: 'EXECUTE_SCRIPT',
                                    script: scriptContent,
                                    scriptId: scriptId
                                });
                                
                            } catch (workerError) {
                                // Fallback: use postMessage with window
                                URL.revokeObjectURL(workerUrl);
                                
                                const tunnelId = 'zedmonkey_tunnel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                
                                const messageHandler = (event) => {
                                    if (event.data.tunnelId !== tunnelId) return;
                                    
                                    if (event.data.type === 'TUNNEL_EXECUTE') {
                                        try {
                                            // Execute in current context
                                            const func = new Function('GM_info', scriptContent);
                                            func.call(window, scriptMeta);
                                            
                                            window.postMessage({
                                                type: 'TUNNEL_SUCCESS',
                                                tunnelId: tunnelId,
                                                scriptId: scriptId
                                            }, '*');
                                        } catch (error) {
                                            window.postMessage({
                                                type: 'TUNNEL_ERROR',
                                                tunnelId: tunnelId,
                                                error: error.message,
                                                scriptId: scriptId
                                            }, '*');
                                        }
                                    } else if (event.data.type === 'TUNNEL_SUCCESS' || event.data.type === 'TUNNEL_ERROR') {
                                        window.removeEventListener('message', messageHandler);
                                    }
                                };
                                
                                window.addEventListener('message', messageHandler);
                                
                                // Trigger execution
                                setTimeout(() => {
                                    window.postMessage({
                                        type: 'TUNNEL_EXECUTE',
                                        tunnelId: tunnelId,
                                        scriptId: scriptId
                                    }, '*');
                                }, 10);
                                
                                // Cleanup timeout
                                setTimeout(() => {
                                    window.removeEventListener('message', messageHandler);
                                }, 5000);
                            }
                            
                        } catch (error) {
                            throw new Error(`POSTMESSAGE_TUNNEL injection failed: ${error.message}`);
                        }
                    },
                    args: [script.content, script.metadata, script.id || 'unknown'],
                    world: 'MAIN'
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`POSTMESSAGE_TUNNEL: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(results);
                    }
                });
            });
        }
    };

    /**
     * Nonce Injection - Uses detected CSP nonces for injection
     */
    static NONCE_INJECTION = {
        name: 'Nonce-based Injection',
        inject: async (script, tabId, frameId, options = {}) => {
            console.log(`[NONCE_INJECTION] Attempting injection for tab ${tabId}, frame ${frameId}`);
            
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (scriptContent, scriptMeta, scriptId, nonce) => {
                        try {
                            // Find existing nonce from page scripts
                            let detectedNonce = nonce;
                            
                            if (!detectedNonce) {
                                const scriptsWithNonce = Array.from(document.querySelectorAll('script[nonce]'));
                                if (scriptsWithNonce.length > 0) {
                                    detectedNonce = scriptsWithNonce[0].nonce;
                                }
                            }
                            
                            if (!detectedNonce) {
                                throw new Error('No CSP nonce detected');
                            }
                            
                            // Create script with nonce
                            const scriptElement = document.createElement('script');
                            scriptElement.nonce = detectedNonce;
                            scriptElement.textContent = `
                                (function() {
                                    // Set up GM_info
                                    window.GM_info = ${JSON.stringify(scriptMeta)};
                                    
                                    try {
                                        ${scriptContent}
                                        console.log('[NONCE_INJECTION] Script executed successfully with nonce');
                                    } catch (error) {
                                        console.error('[NONCE_INJECTION] Script execution error:', error);
                                    }
                                })();
                            `;
                            
                            // Inject with nonce
                            (document.head || document.documentElement).appendChild(scriptElement);
                            
                            // Clean up
                            setTimeout(() => {
                                if (scriptElement.parentNode) {
                                    scriptElement.parentNode.removeChild(scriptElement);
                                }
                            }, 100);
                            
                        } catch (error) {
                            throw new Error(`NONCE_INJECTION failed: ${error.message}`);
                        }
                    },
                    args: [script.content, script.metadata, script.id || 'unknown', options.nonce],
                    world: 'MAIN'
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`NONCE_INJECTION: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(results);
                    }
                });
            });
        }
    };

    /**
     * Event-driven Injection - Injects during specific DOM events
     */
    static EVENT_DRIVEN_INJECTION = {
        name: 'Event-driven Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`[EVENT_DRIVEN] Attempting injection for tab ${tabId}, frame ${frameId}`);
            
            return new Promise((resolve, reject) => {
                chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func: (scriptContent, scriptMeta, scriptId) => {
                        try {
                            const events = ['DOMContentLoaded', 'load', 'click', 'scroll', 'resize'];
                            let injected = false;
                            
                            const injectScript = () => {
                                if (injected) return;
                                injected = true;
                                
                                try {
                                    // Create execution context during event
                                    const scriptElement = document.createElement('script');
                                    scriptElement.textContent = `
                                        (function() {
                                            window.GM_info = ${JSON.stringify(scriptMeta)};
                                            try {
                                                ${scriptContent}
                                            } catch (error) {
                                                console.error('[EVENT_DRIVEN] Script execution error:', error);
                                            }
                                        })();
                                    `;
                                    
                                    (document.head || document.documentElement).appendChild(scriptElement);
                                    
                                    setTimeout(() => {
                                        if (scriptElement.parentNode) {
                                            scriptElement.parentNode.removeChild(scriptElement);
                                        }
                                    }, 50);
                                    
                                    console.log('[EVENT_DRIVEN] Script injected successfully');
                                } catch (error) {
                                    console.error('[EVENT_DRIVEN] Injection error:', error);
                                }
                            };
                            
                            // Listen for various events
                            events.forEach(eventType => {
                                document.addEventListener(eventType, injectScript, { once: true });
                                window.addEventListener(eventType, injectScript, { once: true });
                            });
                            
                            // Also try immediate injection
                            if (document.readyState !== 'loading') {
                                setTimeout(injectScript, 10);
                            }
                            
                        } catch (error) {
                            throw new Error(`EVENT_DRIVEN injection failed: ${error.message}`);
                        }
                    },
                    args: [script.content, script.metadata, script.id || 'unknown'],
                    world: 'MAIN'
                }, (results) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(`EVENT_DRIVEN: ${chrome.runtime.lastError.message}`));
                    } else {
                        resolve(results);
                    }
                });
            });
        }
    };

    /**
     * Get all available injection methods
     */
    static getAllMethods() {
        return {
            DOM_MUTATION: this.DOM_MUTATION,
            IFRAME_BRIDGE: this.IFRAME_BRIDGE,
            POSTMESSAGE_TUNNEL: this.POSTMESSAGE_TUNNEL,
            NONCE_INJECTION: this.NONCE_INJECTION,
            EVENT_DRIVEN_INJECTION: this.EVENT_DRIVEN_INJECTION
        };
    }
}

export { AdvancedInjectionMethods };

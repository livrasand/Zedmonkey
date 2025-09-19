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
                            let injected = false;
                            
                            // Set up mutation observer to inject during DOM changes
                            const observer = new MutationObserver((mutations) => {
                                if (injected) return;
                                
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
                                                        console.log('[Zedmonkey DOM_MUTATION] Script executed successfully');
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
                                            
                                            injected = true;
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
                                if (!injected) {
                                    const trigger = document.createElement('div');
                                    trigger.style.display = 'none';
                                    trigger.setAttribute('data-zedmonkey-trigger', contextId);
                                    document.body.appendChild(trigger);
                                    
                                    setTimeout(() => {
                                        if (trigger.parentNode) {
                                            trigger.parentNode.removeChild(trigger);
                                        }
                                        observer.disconnect();
                                        
                                        // Fallback if mutation didn't work
                                        if (!injected) {
                                            try {
                                                const fallbackScript = document.createElement('script');
                                                fallbackScript.textContent = scriptContent;
                                                document.head.appendChild(fallbackScript);
                                                setTimeout(() => fallbackScript.remove(), 10);
                                            } catch (e) {
                                                console.warn('[DOM_MUTATION] Fallback injection failed:', e);
                                            }
                                        }
                                    }, 100);
                                }
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
                            iframe.setAttribute('data-zedmonkey-bridge', scriptId);
                            
                            // Create the bridge script
                            const bridgeScript = `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <script>
                                        // Set up communication bridge
                                        let scriptExecuted = false;
                                        
                                        window.addEventListener('message', (event) => {
                                            if (event.data.type === 'ZEDMONKEY_EXECUTE' && !scriptExecuted) {
                                                try {
                                                    scriptExecuted = true;
                                                    
                                                    // Set up GM API proxy
                                                    window.GM_info = ${JSON.stringify(scriptMeta)};
                                                    
                                                    // Basic GM functions for the bridge
                                                    window.GM_getValue = (key, defaultValue) => {
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
                                                    };
                                                    
                                                    window.GM_setValue = (key, value) => {
                                                        return new Promise((resolve) => {
                                                            parent.postMessage({
                                                                type: 'ZEDMONKEY_GM_CALL',
                                                                method: 'setValue',
                                                                args: [key, value],
                                                                id: Date.now()
                                                            }, '*');
                                                            resolve();
                                                        });
                                                    };
                                                    
                                                    // Create safer execution context
                                                    const safeEval = new Function('return ' + event.data.script);
                                                    const userScript = safeEval();
                                                    
                                                    if (typeof userScript === 'function') {
                                                        userScript();
                                                    } else {
                                                        // If it's not a function, execute it directly
                                                        eval(event.data.script);
                                                    }
                                                    
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
                                        setTimeout(() => {
                                            if (iframe.parentNode) {
                                                iframe.parentNode.removeChild(iframe);
                                            }
                                        }, 100);
                                        
                                        if (event.data.success) {
                                            console.log(`[IFRAME_BRIDGE] Script executed successfully: ${scriptId}`);
                                        } else {
                                            console.warn(`[IFRAME_BRIDGE] Script execution failed: ${event.data.error}`);
                                        }
                                        break;
                                        
                                    case 'ZEDMONKEY_GM_CALL':
                                        // Handle GM API calls - simplified for bridge
                                        iframe.contentWindow.postMessage({
                                            type: 'ZEDMONKEY_GM_RESPONSE',
                                            result: null, // Simplified response
                                            id: event.data.id
                                        }, '*');
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
                            }, 15000); // 15 second timeout
                            
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
                            // Try multiple tunnel methods
                            const tunnelId = 'zedmonkey_tunnel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                            let executed = false;
                            
                            // Method 1: Try Web Worker
                            try {
                                const workerScript = `
                                    self.onmessage = function(e) {
                                        if (e.data.type === 'EXECUTE_SCRIPT') {
                                            try {
                                                // Create execution context
                                                const context = {
                                                    GM_info: ${JSON.stringify(scriptMeta)},
                                                    console: console,
                                                    window: self
                                                };
                                                
                                                // Execute script in worker context
                                                const func = new Function('GM_info', 'console', 'window', e.data.script);
                                                func.call(context, context.GM_info, context.console, context.window);
                                                
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
                                const worker = new Worker(workerUrl);
                                
                                worker.onmessage = (e) => {
                                    if (e.data.type === 'EXECUTION_SUCCESS') {
                                        console.log(`[POSTMESSAGE_TUNNEL] Worker script executed successfully: ${e.data.scriptId}`);
                                        executed = true;
                                    } else if (e.data.type === 'EXECUTION_ERROR') {
                                        console.warn(`[POSTMESSAGE_TUNNEL] Worker script execution error: ${e.data.error}`);
                                        // Try fallback method
                                        if (!executed) {
                                            tryPostMessageFallback();
                                        }
                                    }
                                    
                                    // Clean up
                                    worker.terminate();
                                    URL.revokeObjectURL(workerUrl);
                                };
                                
                                worker.onerror = (error) => {
                                    console.warn('[POSTMESSAGE_TUNNEL] Worker error:', error);
                                    worker.terminate();
                                    URL.revokeObjectURL(workerUrl);
                                    
                                    // Try fallback method
                                    if (!executed) {
                                        tryPostMessageFallback();
                                    }
                                };
                                
                                // Send script for execution
                                worker.postMessage({
                                    type: 'EXECUTE_SCRIPT',
                                    script: scriptContent,
                                    scriptId: scriptId
                                });
                                
                            } catch (workerError) {
                                console.warn('[POSTMESSAGE_TUNNEL] Worker creation failed:', workerError);
                                tryPostMessageFallback();
                            }
                            
                            // Fallback method: Direct postMessage tunnel
                            function tryPostMessageFallback() {
                                if (executed) return;
                                
                                const messageHandler = (event) => {
                                    if (event.data.tunnelId !== tunnelId) return;
                                    
                                    if (event.data.type === 'TUNNEL_EXECUTE') {
                                        try {
                                            // Execute in current context with isolation
                                            const isolatedContext = {
                                                GM_info: scriptMeta,
                                                console: console,
                                                document: document,
                                                window: window
                                            };
                                            
                                            // Use Function constructor for safer execution
                                            const func = new Function(
                                                'GM_info', 'console', 'document', 'window',
                                                `
                                                try {
                                                    ${scriptContent}
                                                    return { success: true };
                                                } catch (e) {
                                                    return { success: false, error: e.message };
                                                }
                                                `
                                            );
                                            
                                            const result = func.call(
                                                isolatedContext,
                                                isolatedContext.GM_info,
                                                isolatedContext.console,
                                                isolatedContext.document,
                                                isolatedContext.window
                                            );
                                            
                                            window.postMessage({
                                                type: result.success ? 'TUNNEL_SUCCESS' : 'TUNNEL_ERROR',
                                                tunnelId: tunnelId,
                                                scriptId: scriptId,
                                                error: result.error
                                            }, '*');
                                            
                                            executed = true;
                                            
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
                                        if (event.data.type === 'TUNNEL_SUCCESS') {
                                            console.log(`[POSTMESSAGE_TUNNEL] Fallback execution successful: ${scriptId}`);
                                        } else {
                                            console.warn(`[POSTMESSAGE_TUNNEL] Fallback execution failed: ${event.data.error}`);
                                        }
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
                                }, 8000);
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
                    func: (scriptContent, scriptMeta, scriptId, providedNonce) => {
                        try {
                            // Find existing nonce from page scripts
                            let detectedNonce = providedNonce;
                            
                            if (!detectedNonce) {
                                // Try multiple methods to detect nonce
                                const scriptsWithNonce = Array.from(document.querySelectorAll('script[nonce]'));
                                if (scriptsWithNonce.length > 0) {
                                    detectedNonce = scriptsWithNonce[0].nonce;
                                }
                                
                                // Alternative: check for nonce in inline scripts
                                if (!detectedNonce) {
                                    const inlineScripts = Array.from(document.querySelectorAll('script:not([src])'));
                                    for (const script of inlineScripts) {
                                        if (script.nonce) {
                                            detectedNonce = script.nonce;
                                            break;
                                        }
                                    }
                                }
                                
                                // Try to extract from CSP meta tag
                                if (!detectedNonce) {
                                    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
                                    if (cspMeta) {
                                        const cspContent = cspMeta.getAttribute('content');
                                        const nonceMatch = cspContent.match(/'nonce-([^']+)'/);
                                        if (nonceMatch) {
                                            detectedNonce = nonceMatch[1];
                                        }
                                    }
                                }
                            }
                            
                            if (!detectedNonce) {
                                throw new Error('No CSP nonce detected');
                            }
                            
                            // Create script with nonce
                            const scriptElement = document.createElement('script');
                            scriptElement.nonce = detectedNonce;
                            scriptElement.setAttribute('data-zedmonkey-nonce', scriptId);
                            scriptElement.textContent = `
                                (function() {
                                    // Set up GM_info
                                    if (typeof window.GM_info === 'undefined') {
                                        window.GM_info = ${JSON.stringify(scriptMeta)};
                                    }
                                    
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
                            
                            // Clean up after execution
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
                            const events = ['DOMContentLoaded', 'load', 'click', 'focus', 'scroll', 'resize', 'mouseover'];
                            let injected = false;
                            let listeners = [];
                            
                            const injectScript = (eventType = 'unknown') => {
                                if (injected) return;
                                injected = true;
                                
                                // Remove all event listeners
                                listeners.forEach(({ element, event, handler }) => {
                                    element.removeEventListener(event, handler);
                                });
                                listeners = [];
                                
                                try {
                                    // Create execution context during event
                                    const scriptElement = document.createElement('script');
                                    scriptElement.setAttribute('data-zedmonkey-event', eventType);
                                    scriptElement.textContent = `
                                        (function() {
                                            // Set up GM_info
                                            if (typeof window.GM_info === 'undefined') {
                                                window.GM_info = ${JSON.stringify(scriptMeta)};
                                            }
                                            
                                            try {
                                                ${scriptContent}
                                                console.log('[EVENT_DRIVEN] Script executed on event: ${eventType}');
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
                                    
                                    console.log(`[EVENT_DRIVEN] Script injected successfully via ${eventType} event`);
                                } catch (error) {
                                    console.error('[EVENT_DRIVEN] Injection error:', error);
                                }
                            };
                            
                            // Listen for various events on different targets
                            const targets = [document, window, document.body, document.documentElement].filter(t => t);
                            
                            events.forEach(eventType => {
                                targets.forEach(target => {
                                    try {
                                        const handler = () => injectScript(eventType);
                                        target.addEventListener(eventType, handler, { once: true, passive: true });
                                        listeners.push({ element: target, event: eventType, handler });
                                    } catch (e) {
                                        // Target might not support this event
                                    }
                                });
                            });
                            
                            // Try immediate injection if page is already loaded
                            if (document.readyState === 'complete') {
                                setTimeout(() => injectScript('immediate'), 10);
                            } else if (document.readyState === 'interactive') {
                                setTimeout(() => injectScript('interactive'), 50);
                            }
                            
                            // Fallback timer
                            setTimeout(() => {
                                if (!injected) {
                                    injectScript('fallback-timer');
                                }
                            }, 2000);
                            
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

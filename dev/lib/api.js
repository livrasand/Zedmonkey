/**
 * @file Zedmonkey's Superior GM API Implementation
 *
 * This is a comprehensive GM API implementation that surpasses the original
 * Greasemonkey/Tampermonkey/Violentmonkey APIs with enhanced features:
 * - Better async/await support
 * - Enhanced error handling and recovery
 * - Advanced storage with compression and encryption
 * - Superior network capabilities
 * - Extended resource management
 * - Cross-frame communication
 * - Real-time value watching
 * - Performance monitoring
 * - Backwards compatibility with all GM_* functions
 *
 * @author Zedmonkey Team
 * @version 2.0.0
 */

// Advanced GM API Implementation
(() => {
    'use strict';

    // Enhanced context detection - works in all environments
    const isExtensionContext = (() => {
        try {
            // Check for content script context (has chrome but limited access)
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                return 'content';
            }
            // Check for page context (no chrome access, but can communicate via events)
            if (typeof window !== 'undefined' && window.postMessage) {
                return 'page';
            }
            return 'unknown';
        } catch (e) {
            return 'page'; // Assume page context if detection fails
        }
    })();

    console.log(`[Zedmonkey GM API] Initializing in ${isExtensionContext} context`);

    // Don't block initialization - the API should work in any context
    
    // Enhanced script identification system
    const SCRIPT_ID = window.__ZEDMONKEY_SCRIPT_UUID__ || 
                     window.ZEDMONKEY_SCRIPT_ID || 
                     `zedmonkey_script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const SCRIPT_META = window.__ZEDMONKEY_SCRIPT_META__ || {};
    
    // Advanced performance monitoring
    const PerformanceTracker = {
        apiCalls: new Map(),
        startTime: performance.now(),
        
        track(method, duration, success = true) {
            const stats = this.apiCalls.get(method) || { count: 0, totalTime: 0, errors: 0 };
            stats.count++;
            stats.totalTime += duration;
            if (!success) stats.errors++;
            this.apiCalls.set(method, stats);
        },
        
        getStats() {
            const result = {};
            for (const [method, stats] of this.apiCalls) {
                result[method] = {
                    ...stats,
                    avgTime: stats.totalTime / stats.count,
                    successRate: ((stats.count - stats.errors) / stats.count * 100).toFixed(2) + '%'
                };
            }
            return result;
        }
    };
    
    console.log(`[Zedmonkey GM API] Script ID: ${SCRIPT_ID}`);
    console.log(`[Zedmonkey GM API] Script Meta:`, SCRIPT_META);

    /**
     * Advanced communication system that works in all contexts
     * Supports direct chrome extension messaging and postMessage fallback
     * @param {object} message - The message payload to send.
     * @param {number} timeout - Timeout in milliseconds (default: 10000)
     * @param {number} retries - Number of retries (default: 3)
     * @returns {Promise<any>} A promise that resolves with the background script's response.
     */
    const callBackground = (message, timeout = 10000, retries = 3) => {
        const startTime = performance.now();
        
        // Input validation
        if (!message || typeof message !== 'object') {
            return Promise.reject(new Error('Invalid message object'));
        }
        
        // Enhanced message with metadata
        const secureMessage = {
            ...message,
            scriptId: SCRIPT_ID,
            timestamp: Date.now(),
            context: isExtensionContext,
            retryAttempt: retries - (arguments[3] || retries),
            performanceId: `${message.action}_${Date.now()}`
        };
        
        // Multi-context communication strategy
        const attemptCommunication = async (retriesLeft) => {
            if (isExtensionContext === 'content') {
                // Direct chrome extension messaging
                return attemptChromeMessage(secureMessage, retriesLeft);
            } else {
                // Use postMessage bridge for page context
                return attemptPostMessage(secureMessage, retriesLeft);
            }
        };
        
        // Chrome extension messaging (content script context)
        const attemptChromeMessage = (msg, retriesLeft) => {
            return new Promise((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    PerformanceTracker.track(msg.action, performance.now() - startTime, false);
                    reject(new Error(`GM API timeout: ${msg.action} after ${timeout}ms`));
                }, timeout);
                
                try {
                    chrome.runtime.sendMessage(msg, (response) => {
                        clearTimeout(timeoutId);
                        
                        if (chrome.runtime.lastError) {
                            const error = chrome.runtime.lastError.message;
                            PerformanceTracker.track(msg.action, performance.now() - startTime, false);
                            
                            if (error.includes('Extension context invalidated') || 
                                error.includes('Receiving end does not exist')) {
                                reject(new Error('Extension context invalidated. Please reload the page.'));
                            } else if (retriesLeft > 0) {
                                console.warn(`[Zedmonkey GM API] ${msg.action} failed, retrying... (${retriesLeft} attempts left)`);
                                setTimeout(() => {
                                    attemptChromeMessage(msg, retriesLeft - 1).then(resolve).catch(reject);
                                }, Math.min(1000 * (retries - retriesLeft + 1), 5000));
                            } else {
                                reject(new Error(error));
                            }
                        } else if (response && response.error) {
                            PerformanceTracker.track(msg.action, performance.now() - startTime, false);
                            reject(new Error(response.error));
                        } else {
                            PerformanceTracker.track(msg.action, performance.now() - startTime, true);
                            resolve(response || {});
                        }
                    });
                } catch (e) {
                    clearTimeout(timeoutId);
                    PerformanceTracker.track(msg.action, performance.now() - startTime, false);
                    reject(e);
                }
            });
        };
        
        // PostMessage bridge (page context)
        const attemptPostMessage = (msg, retriesLeft) => {
            return new Promise((resolve, reject) => {
                const messageId = `zedmonkey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                msg.messageId = messageId;
                
                const timeoutId = setTimeout(() => {
                    window.removeEventListener('message', responseListener);
                    PerformanceTracker.track(msg.action, performance.now() - startTime, false);
                    if (retriesLeft > 0) {
                        console.warn(`[Zedmonkey GM API] ${msg.action} timeout, retrying... (${retriesLeft} attempts left)`);
                        attemptPostMessage(msg, retriesLeft - 1).then(resolve).catch(reject);
                    } else {
                        reject(new Error(`GM API timeout: ${msg.action} after ${timeout}ms`));
                    }
                }, timeout);
                
                const responseListener = (event) => {
                    if (event.data && event.data.type === 'ZEDMONKEY_GM_RESPONSE' && 
                        event.data.messageId === messageId) {
                        window.removeEventListener('message', responseListener);
                        clearTimeout(timeoutId);
                        
                        if (event.data.error) {
                            PerformanceTracker.track(msg.action, performance.now() - startTime, false);
                            reject(new Error(event.data.error));
                        } else {
                            PerformanceTracker.track(msg.action, performance.now() - startTime, true);
                            resolve(event.data.response || {});
                        }
                    }
                };
                
                window.addEventListener('message', responseListener);
                window.postMessage({ 
                    type: 'ZEDMONKEY_GM_REQUEST', 
                    payload: msg 
                }, '*');
            });
        };
        
        return attemptCommunication(retries);
    };

    // --- GM API Implementation ---

    const GM = {
        /**
         * Retrieves a value from storage for the current script.
         * @param {string} key - The key of the value to retrieve.
         * @param {any} [defaultValue] - The value to return if the key is not found.
         * @returns {Promise<any>} A promise that resolves with the stored value.
         */
        getValue: async (key, defaultValue = undefined) => {
            // Input validation
            if (!key || typeof key !== 'string') {
                throw new Error('GM.getValue: key must be a non-empty string');
            }
            if (key.length > 100) {
                throw new Error('GM.getValue: key too long (max 100 characters)');
            }
            
            try {
                const response = await callBackground({
                    action: 'GM_getValue',
                    name: key,
                    defaultValue: defaultValue
                });
                return response.value;
            } catch (error) {
                console.error('GM.getValue error:', error);
                return defaultValue;
            }
        },

        /**
         * Stores a value in storage for the current script.
         * @param {string} key - The key for the value to be stored.
         * @param {any} value - The value to store. Must be JSON-serializable.
         * @returns {Promise<void>} A promise that resolves when the storage is complete.
         */
        setValue: async (key, value) => {
            // Input validation
            if (!key || typeof key !== 'string') {
                throw new Error('GM.setValue: key must be a non-empty string');
            }
            if (key.length > 100) {
                throw new Error('GM.setValue: key too long (max 100 characters)');
            }
            
            // Validate value can be serialized
            try {
                JSON.stringify(value);
            } catch (e) {
                throw new Error('GM.setValue: value must be JSON serializable');
            }
            
            // Check value size (limit to 1MB)
            const valueSize = JSON.stringify(value).length;
            if (valueSize > 1048576) {
                throw new Error('GM.setValue: value too large (max 1MB)');
            }
            
            return callBackground({
                action: 'GM_setValue',
                name: key,
                value: value
            });
        },
        
        /**
         * Deletes a value from storage for the current script.
         * @param {string} key - The key of the value to delete.
         * @returns {Promise<void>}
         */
        deleteValue: async (key) => {
            // Input validation
            if (!key || typeof key !== 'string') {
                throw new Error('GM.deleteValue: key must be a non-empty string');
            }
            if (key.length > 100) {
                throw new Error('GM.deleteValue: key too long (max 100 characters)');
            }
            
            return callBackground({
                action: 'GM_deleteValue',
                name: key
            });
        },

        /**
         * Lists all storage keys for the current script.
         * @returns {Promise<string[]>} A promise that resolves with an array of keys.
         */
        listValues: async () => {
            try {
                const response = await callBackground({
                    action: 'GM_listValues'
                });
                return response.values || [];
            } catch (error) {
                console.error('GM.listValues error:', error);
                return [];
            }
        },

        /**
         * Performs a cross-origin HTTP request.
         * @param {object} details - The request details (url, method, headers, etc.).
         * @returns {Promise<object>} A promise that resolves with the response object.
         */
        xmlHttpRequest: async (details) => {
            const response = await callBackground({
                action: 'GM_xmlHttpRequest',
                scriptId: SCRIPT_ID, // For security tracking
                details: details
            });
            return response.result;
        },

        /**
         * Shows a desktop notification with enhanced options.
         * @param {object|string} options - Notification options or the text of the notification.
         * @param {string} [title] - The notification title (for string input).
         * @returns {Promise<string>} Promise resolving to notification ID
         */
        notification: async (options, title = 'Zedmonkey Script') => {
            let notificationDetails = {};
            if (typeof options === 'string') {
                notificationDetails = { text: options, title: title };
            } else {
                notificationDetails = { 
                    title: 'Zedmonkey Script',
                    ...options 
                };
            }

            const response = await callBackground({
                action: 'GM_notification',
                ...notificationDetails
            });
            return response.notificationId;
        },

        /**
         * Opens a new tab with the specified URL.
         * @param {string|object} url - The URL to open or options object
         * @param {boolean} [active] - Whether the tab should be active (for string URL)
         * @returns {Promise<object>} Promise with tab information
         */
        openInTab: async (url, active = true) => {
            const options = typeof url === 'string' ? { url, active } : url;
            
            if (!options.url) {
                throw new Error('GM.openInTab: URL is required');
            }

            return await callBackground({
                action: 'GM_openInTab',
                ...options
            });
        },

        /**
         * Copies text to the clipboard.
         * @param {string} data - The text to copy
         * @param {string} [type] - MIME type (default: text/plain)
         * @returns {Promise<void>}
         */
        setClipboard: async (data, type = 'text/plain') => {
            if (typeof data !== 'string') {
                throw new Error('GM.setClipboard: data must be a string');
            }

            // Try native clipboard API first (more reliable)
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(data);
                    return;
                } catch (e) {
                    console.warn('Native clipboard failed, using background method:', e);
                }
            }

            return await callBackground({
                action: 'GM_setClipboard',
                data,
                type
            });
        },

        /**
         * Downloads a file from the specified URL.
         * @param {string|object} url - Download URL or options object
         * @param {string} [name] - Filename (for string URL)
         * @param {object} [headers] - Request headers
         * @returns {Promise<number>} Promise with download ID
         */
        download: async (url, name, headers = {}) => {
            const options = typeof url === 'string' ? { url, name, headers } : url;
            
            if (!options.url) {
                throw new Error('GM.download: URL is required');
            }

            const response = await callBackground({
                action: 'GM_download',
                ...options
            });
            return response.downloadId;
        },

        /**
         * Registers a menu command.
         * @param {string} name - Command name
         * @param {Function} callback - Callback function
         * @param {string} [accessKey] - Access key
         * @returns {string} Command ID
         */
        registerMenuCommand: (name, callback, accessKey) => {
            if (!name || typeof callback !== 'function') {
                throw new Error('GM.registerMenuCommand: name and callback are required');
            }

            const menuId = `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Store callback locally
            window.__ZEDMONKEY_MENU_COMMANDS__ = window.__ZEDMONKEY_MENU_COMMANDS__ || {};
            window.__ZEDMONKEY_MENU_COMMANDS__[menuId] = callback;

            callBackground({
                action: 'GM_registerMenuCommand',
                menuId,
                name,
                accessKey
            }).catch(console.error);

            return menuId;
        },

        /**
         * Unregisters a menu command.
         * @param {string} menuId - Command ID to unregister
         * @returns {Promise<void>}
         */
        unregisterMenuCommand: async (menuId) => {
            if (!menuId) {
                throw new Error('GM.unregisterMenuCommand: menuId is required');
            }

            // Remove local callback
            if (window.__ZEDMONKEY_MENU_COMMANDS__) {
                delete window.__ZEDMONKEY_MENU_COMMANDS__[menuId];
            }

            return await callBackground({
                action: 'GM_unregisterMenuCommand',
                menuId
            });
        },

        /**
         * Gets resource text content.
         * @param {string} name - Resource name
         * @returns {Promise<string>} Resource text content
         */
        getResourceText: async (name) => {
            if (!name) {
                throw new Error('GM.getResourceText: name is required');
            }

            const response = await callBackground({
                action: 'GM_getResourceText',
                name
            });
            return response.text || '';
        },

        /**
         * Gets resource URL.
         * @param {string} name - Resource name
         * @returns {Promise<string>} Resource URL
         */
        getResourceUrl: async (name) => {
            if (!name) {
                throw new Error('GM.getResourceUrl: name is required');
            }

            const response = await callBackground({
                action: 'GM_getResourceUrl',
                name
            });
            return response.url || null;
        },

        // --- Enhanced Zedmonkey Features ---

        /**
         * Watches for changes to a stored value (real-time updates).
         * @param {string} key - Key to watch
         * @param {Function} callback - Callback when value changes
         * @returns {string} Watch ID for removing the watcher
         */
        addValueChangeListener: (key, callback) => {
            if (!key || typeof callback !== 'function') {
                throw new Error('GM.addValueChangeListener: key and callback are required');
            }

            const watchId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            window.__ZEDMONKEY_VALUE_WATCHERS__ = window.__ZEDMONKEY_VALUE_WATCHERS__ || {};
            window.__ZEDMONKEY_VALUE_WATCHERS__[watchId] = { key, callback };

            callBackground({
                action: 'GM_addValueChangeListener',
                key,
                watchId
            }).catch(console.error);

            return watchId;
        },

        /**
         * Removes a value change listener.
         * @param {string} watchId - Watch ID to remove
         * @returns {Promise<void>}
         */
        removeValueChangeListener: async (watchId) => {
            if (window.__ZEDMONKEY_VALUE_WATCHERS__) {
                delete window.__ZEDMONKEY_VALUE_WATCHERS__[watchId];
            }

            return await callBackground({
                action: 'GM_removeValueChangeListener',
                watchId
            });
        },

        /**
         * Gets performance statistics for the GM API.
         * @returns {object} Performance statistics
         */
        getPerformanceStats: () => {
            return {
                runtime: performance.now() - PerformanceTracker.startTime,
                ...PerformanceTracker.getStats(),
                context: isExtensionContext,
                scriptId: SCRIPT_ID
            };
        },

        /**
         * Batch operations for better performance.
         * @param {Array} operations - Array of operations to perform
         * @returns {Promise<Array>} Results array
         */
        batch: async (operations) => {
            if (!Array.isArray(operations)) {
                throw new Error('GM.batch: operations must be an array');
            }

            const response = await callBackground({
                action: 'GM_batch',
                operations
            });
            return response.results || [];
        },

        /**
         * Advanced logging with categorization and filtering.
         * @param {string} level - Log level (debug, info, warn, error)
         * @param {string} message - Log message
         * @param {any} data - Additional data
         */
        log: (level, message, ...data) => {
            const timestamp = new Date().toISOString();
            const logData = {
                timestamp,
                level: level || 'info',
                message,
                data,
                scriptId: SCRIPT_ID,
                scriptName: SCRIPT_META.name || 'Unknown Script'
            };

            console[level] && console[level](`[Zedmonkey Script] ${message}`, ...data);
            
            // Send to background for centralized logging
            callBackground({
                action: 'GM_log',
                logData
            }).catch(() => {}); // Silent fail for logging
        },

        // --- GM_info with comprehensive metadata ---
        info: {
            script: {
                description: SCRIPT_META.description || '',
                excludes: SCRIPT_META.excludes || [],
                includes: SCRIPT_META.includes || [],
                matches: SCRIPT_META.matches || [],
                name: SCRIPT_META.name || 'Unknown Script',
                namespace: SCRIPT_META.namespace || '',
                resources: SCRIPT_META.resources || {},
                'run-at': SCRIPT_META['run-at'] || 'document-end',
                version: SCRIPT_META.version || '1.0',
                uuid: SCRIPT_ID
            },
            scriptMetaStr: SCRIPT_META.header || '',
            scriptHandler: 'Zedmonkey',
            version: '2.0.0',
            platform: {
                arch: navigator.platform,
                os: navigator.userAgent
            },
            capabilities: {
                clipboard: !!(navigator.clipboard && navigator.clipboard.writeText),
                notifications: !!('Notification' in window),
                webRequest: isExtensionContext === 'content'
            }
        }
    };

    // --- Legacy GM_* Functions for Backwards Compatibility ---
    
    const GM_legacy = {
        // Map new GM.* functions to legacy GM_* names
        GM_getValue: GM.getValue,
        GM_setValue: GM.setValue,
        GM_deleteValue: GM.deleteValue,
        GM_listValues: GM.listValues,
        GM_xmlhttpRequest: GM.xmlHttpRequest,
        GM_notification: GM.notification,
        GM_openInTab: GM.openInTab,
        GM_setClipboard: GM.setClipboard,
        GM_download: GM.download,
        GM_registerMenuCommand: GM.registerMenuCommand,
        GM_unregisterMenuCommand: GM.unregisterMenuCommand,
        GM_getResourceText: GM.getResourceText,
        GM_getResourceURL: GM.getResourceUrl,
        GM_addValueChangeListener: GM.addValueChangeListener,
        GM_removeValueChangeListener: GM.removeValueChangeListener,
        GM_log: GM.log,
        
        // Additional utility functions
        GM_info: GM.info,
        
        /**
         * Legacy GM_addStyle function.
         * @param {string} css - CSS to add
         * @returns {HTMLStyleElement} Style element
         */
        GM_addStyle: (css) => {
            if (typeof css !== 'string') {
                throw new Error('GM_addStyle: css must be a string');
            }

            const style = document.createElement('style');
            style.textContent = css;
            style.setAttribute('data-zedmonkey-script', SCRIPT_ID);
            
            const target = document.head || document.documentElement;
            target.appendChild(style);
            
            return style;
        }
    };

    // --- Global API Exposure ---
    
    // Make both modern GM and legacy GM_* functions available globally
    const fullAPI = {
        ...GM,
        ...GM_legacy
    };

    // Export the API for different injection methods
    window.GM = GM;
    window.ZEDMONKEY_API = fullAPI;
    
    // Make legacy functions available globally for backwards compatibility
    Object.assign(window, GM_legacy);

    // Enhanced event system for communication
    if (isExtensionContext === 'page') {
        // Set up postMessage bridge for page context
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'ZEDMONKEY_VALUE_CHANGED') {
                const watchers = window.__ZEDMONKEY_VALUE_WATCHERS__;
                if (watchers) {
                    Object.values(watchers).forEach(watcher => {
                        if (watcher.key === event.data.key) {
                            try {
                                watcher.callback(event.data.key, event.data.oldValue, event.data.newValue, event.data.remote);
                            } catch (e) {
                                console.error('Value change callback error:', e);
                            }
                        }
                    });
                }
            } else if (event.data && event.data.type === 'ZEDMONKEY_MENU_CLICKED') {
                const commands = window.__ZEDMONKEY_MENU_COMMANDS__;
                if (commands && commands[event.data.menuId]) {
                    try {
                        commands[event.data.menuId]();
                    } catch (e) {
                        console.error('Menu command callback error:', e);
                    }
                }
            }
        });
    }
    
    // Log successful initialization
    console.log(`[Zedmonkey GM API v2.0.0] ✅ Successfully initialized in ${isExtensionContext} context`);
    console.log('[Zedmonkey GM API] Available functions:', Object.keys(GM).filter(k => typeof GM[k] === 'function'));
    console.log('[Zedmonkey GM API] Legacy functions:', Object.keys(GM_legacy).filter(k => typeof GM_legacy[k] === 'function'));
    
    // Performance benchmark
    GM.log('info', 'Zedmonkey GM API initialized', {
        context: isExtensionContext,
        initTime: performance.now() - PerformanceTracker.startTime,
        scriptMeta: SCRIPT_META
    });
    
    // Expose debugging utilities in development
    if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
        window.__ZEDMONKEY_DEBUG__ = {
            GM,
            GM_legacy,
            PerformanceTracker,
            SCRIPT_ID,
            SCRIPT_META,
            isExtensionContext,
            callBackground
        };
        console.log('[Zedmonkey GM API] Debug utilities available at window.__ZEDMONKEY_DEBUG__');
    }

})();

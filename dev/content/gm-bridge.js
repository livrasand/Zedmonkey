/**
 * @file GM API Bridge for Content Script
 * 
 * This bridge handles communication between the page context (where userscripts run)
 * and the extension's background script. It uses postMessage to communicate with
 * the page and chrome.runtime.sendMessage to communicate with the background.
 */

(() => {
    'use strict';

    console.log('[Zedmonkey GM Bridge] Initializing communication bridge...');

    // Message passing bridge between page context and extension
    window.addEventListener('message', async (event) => {
        // Only handle messages from the same window (page context)
        if (event.source !== window) return;

        const data = event.data;
        if (!data || data.type !== 'ZEDMONKEY_GM_REQUEST') return;

        const { payload } = data;
        if (!payload || !payload.action) return;

        console.log('[Zedmonkey GM Bridge] Forwarding request:', payload.action);

        try {
            // Forward the request to the content script via postMessage
            const response = await new Promise((resolve, reject) => {
                // Send message to content script
                window.postMessage({
                    type: 'ZEDMONKEY_BRIDGE_REQUEST',
                    payload: payload,
                    requestId: Date.now() + Math.random()
                }, '*');

                // Listen for response from content script
                const responseHandler = (responseEvent) => {
                    if (responseEvent.data.type === 'ZEDMONKEY_BRIDGE_RESPONSE' &&
                        responseEvent.data.requestId === payload.messageId) {
                        window.removeEventListener('message', responseHandler);
                        if (responseEvent.data.error) {
                            reject(new Error(responseEvent.data.error));
                        } else {
                            resolve(responseEvent.data.response);
                        }
                    }
                };

                window.addEventListener('message', responseHandler);

                // Timeout after 10 seconds
                setTimeout(() => {
                    window.removeEventListener('message', responseHandler);
                    reject(new Error('Bridge request timeout'));
                }, 10000);
            });

            // Send response back to page context
            window.postMessage({
                type: 'ZEDMONKEY_GM_RESPONSE',
                messageId: payload.messageId,
                response
            }, '*');

        } catch (error) {
            console.error('[Zedmonkey GM Bridge] Request failed:', error);
            
            // Send error response back to page context
            window.postMessage({
                type: 'ZEDMONKEY_GM_RESPONSE',
                messageId: payload.messageId,
                error: error.message
            }, '*');
        }
    });

    // Listen for value change notifications from content script
    window.addEventListener('message', (event) => {
        if (event.data.type === 'ZEDMONKEY_VALUE_CHANGED') {
            // Forward value change notification to page context
            window.postMessage({
                type: 'ZEDMONKEY_VALUE_CHANGED',
                key: event.data.key,
                oldValue: event.data.oldValue,
                newValue: event.data.newValue,
                remote: event.data.remote
            }, '*');
        } else if (event.data.type === 'ZEDMONKEY_MENU_CLICKED') {
            // Forward menu click to page context
            window.postMessage({
                type: 'ZEDMONKEY_MENU_CLICKED',
                menuId: event.data.menuId
            }, '*');
        }
    });

    console.log('[Zedmonkey GM Bridge] ✅ Bridge initialized successfully');
})();

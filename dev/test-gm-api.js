// ==UserScript==
// @name         Test GM API Complete
// @namespace    https://zedmonkey.vercel.app/
// @version      1.0
// @description  Test script para probar todas las funcionalidades de la API GM
// @author       Zedmonkey Team
// @match        https://example.com/*
// @match        https://httpbin.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        GM_addElement
// @grant        GM_addStyle
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_notification
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_info
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @resource     testCSS https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('[GM Test] Starting GM API compatibility test...');
    
    // Test GM_info
    console.log('[GM Test] GM_info:', GM_info);
    
    // Test 1: Storage functions
    async function testStorage() {
        console.log('[GM Test] Testing storage functions...');
        
        // Test GM_setValue and GM_getValue
        await GM_setValue('testKey', 'testValue');
        const value = await GM_getValue('testKey', 'defaultValue');
        console.log('[GM Test] GM_getValue result:', value);
        
        // Test with default value
        const defaultValue = await GM_getValue('nonexistentKey', 'myDefault');
        console.log('[GM Test] GM_getValue with default:', defaultValue);
        
        // Test GM_listValues
        await GM_setValue('key1', 'value1');
        await GM_setValue('key2', 'value2');
        const values = await GM_listValues();
        console.log('[GM Test] GM_listValues result:', values);
        
        // Test GM_deleteValue
        await GM_deleteValue('key1');
        const valuesAfterDelete = await GM_listValues();
        console.log('[GM Test] Values after delete:', valuesAfterDelete);
    }
    
    // Test 2: DOM functions
    function testDOM() {
        console.log('[GM Test] Testing DOM functions...');
        
        // Test GM_addStyle
        const style = GM_addStyle(`
            .gm-test-element {
                background: #ff6b6b;
                color: white;
                padding: 10px;
                margin: 10px;
                border-radius: 5px;
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 9999;
                font-family: Arial, sans-serif;
            }
        `);
        console.log('[GM Test] Style element created:', style);
        
        // Test GM_addElement
        const testDiv = GM_addElement('div', {
            class: 'gm-test-element',
            textContent: 'GM API Test Active!'
        });
        document.body.appendChild(testDiv);
        console.log('[GM Test] Test element added:', testDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            testDiv.remove();
            console.log('[GM Test] Test element removed');
        }, 5000);
    }
    
    // Test 3: Menu commands
    function testMenuCommands() {
        console.log('[GM Test] Testing menu commands...');
        
        const menuId1 = GM_registerMenuCommand('Test Notification', () => {
            GM_notification({
                text: 'Menu command executed successfully!',
                title: 'GM Test',
                onclick: () => console.log('[GM Test] Notification clicked')
            });
        }, { id: 'test-menu-1' });
        
        const menuId2 = GM_registerMenuCommand('Copy Test Data', () => {
            GM_setClipboard('GM API test data copied!');
            GM_notification('Data copied to clipboard!', 'GM Test');
        }, { id: 'test-menu-2' });
        
        console.log('[GM Test] Menu commands registered:', menuId1, menuId2);
        
        // Test unregistering after 30 seconds
        setTimeout(() => {
            GM_unregisterMenuCommand(menuId2);
            console.log('[GM Test] Menu command unregistered:', menuId2);
        }, 30000);
    }
    
    // Test 4: HTTP requests
    async function testHTTP() {
        console.log('[GM Test] Testing HTTP functions...');
        
        try {
            const response = await GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://httpbin.org/json',
                headers: {
                    'User-Agent': 'Zedmonkey GM API Test'
                }
            });
            console.log('[GM Test] HTTP request successful:', response);
        } catch (error) {
            console.error('[GM Test] HTTP request failed:', error);
        }
    }
    
    // Test 5: Tab management
    function testTabs() {
        console.log('[GM Test] Testing tab functions...');
        
        // Test opening new tab (will only work on user interaction)
        const button = document.createElement('button');
        button.textContent = 'Test GM_openInTab';
        button.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            z-index: 9999;
            background: #4ecdc4;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
        `;
        button.onclick = async () => {
            const tabId = await GM_openInTab('https://zedmonkey.vercel.app/', {
                active: false,
                insert: true
            });
            console.log('[GM Test] New tab opened:', tabId);
            GM_notification('New tab opened!', 'GM Test');
        };
        document.body.appendChild(button);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            button.remove();
        }, 30000);
    }
    
    // Test 6: Resources
    function testResources() {
        console.log('[GM Test] Testing resource functions...');
        
        const cssResource = GM_getResourceText('testCSS');
        console.log('[GM Test] Resource text (first 100 chars):', cssResource ? cssResource.substring(0, 100) : 'null');
        
        const cssURL = GM_getResourceURL('testCSS');
        console.log('[GM Test] Resource URL:', cssURL);
    }
    
    // Test 7: Downloads
    function testDownload() {
        console.log('[GM Test] Testing download function...');
        
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Test GM_download';
        downloadButton.style.cssText = `
            position: fixed;
            bottom: 60px;
            right: 10px;
            z-index: 9999;
            background: #45b7d1;
            color: white;
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
        `;
        downloadButton.onclick = async () => {
            try {
                const downloadId = await GM_download({
                    url: 'data:text/plain;charset=utf-8,GM API Test File Content',
                    name: 'gm-test-file.txt',
                    headers: {}
                });
                console.log('[GM Test] Download started:', downloadId);
                GM_notification('Download started!', 'GM Test');
            } catch (error) {
                console.error('[GM Test] Download failed:', error);
            }
        };
        document.body.appendChild(downloadButton);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            downloadButton.remove();
        }, 30000);
    }
    
    // Test modern GM.* API
    function testModernAPI() {
        console.log('[GM Test] Testing modern GM.* API...');
        console.log('[GM Test] GM object:', GM);
        console.log('[GM Test] GM.info:', GM.info);
        
        // Test modern async syntax
        GM.getValue('modernTest', 'defaultModern').then(value => {
            console.log('[GM Test] Modern GM.getValue:', value);
        });
        
        GM.setValue('modernTest', 'modernValue').then(() => {
            console.log('[GM Test] Modern GM.setValue completed');
        });
    }
    
    // Run all tests
    async function runAllTests() {
        console.log('[GM Test] === Starting comprehensive GM API test ===');
        
        try {
            await testStorage();
            testDOM();
            testMenuCommands();
            await testHTTP();
            testTabs();
            testResources();
            testDownload();
            testModernAPI();
            
            console.log('[GM Test] === All tests completed successfully ===');
            
            // Final notification
            GM_notification({
                text: 'All GM API tests completed! Check console for details.',
                title: 'GM Test Suite',
                onclick: () => {
                    console.log('[GM Test] Final notification clicked');
                }
            });
            
        } catch (error) {
            console.error('[GM Test] Test suite failed:', error);
            GM_notification('Test suite failed! Check console for errors.', 'GM Test Error');
        }
    }
    
    // Wait for page load and run tests
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllTests);
    } else {
        setTimeout(runAllTests, 1000);
    }
    
})();

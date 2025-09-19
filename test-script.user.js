// ==UserScript==
// @name         Test Import Script
// @namespace    https://zedmonkey.dev/
// @version      1.0.0
// @description  Script de prueba para testear la funcionalidad de importar
// @author       Test User
// @match        *://example.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('Test script imported successfully!');
    
    // Add a simple test element to the page
    const testDiv = document.createElement('div');
    testDiv.innerHTML = 'Test script is working!';
    testDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px;
        border-radius: 4px;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    
    document.body.appendChild(testDiv);
    
    // Remove the test div after 3 seconds
    setTimeout(() => {
        if (testDiv.parentNode) {
            testDiv.parentNode.removeChild(testDiv);
        }
    }, 3000);
    
})();

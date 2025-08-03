// Script para probar la funcionalidad de carga de scripts
// Ejecutar este script en la consola del background script para agregar scripts de prueba

console.log("Agregando scripts de prueba...");

chrome.storage.local.set({
    scripts: [
        {
            id: "test-script-1",
            enabled: true,
            content: `// ==UserScript==
// @name         Test Script 1
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Script de prueba para verificar funcionalidad
// @author       Test Author
// @match        https://example.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('Test Script 1 ejecutado');
})();`,
            metadata: {
                name: "Test Script 1",
                version: "1.0",
                description: "Script de prueba para verificar funcionalidad",
                author: "Test Author",
                match: ["https://example.com/*"],
                grant: []
            }
        },
        {
            id: "test-script-2", 
            enabled: false,
            content: `// [script]
// name:Test Script 2,
// version:2.0,
// description:Segundo script de prueba,
// match:*://*/*,
// grant:,

(function() {
    'use strict';
    console.log('Test Script 2 ejecutado');
})();`,
            metadata: {
                name: "Test Script 2",
                version: "2.0", 
                description: "Segundo script de prueba",
                match: ["*://*/*"],
                grant: []
            }
        }
    ]
}, function() {
    console.log("Scripts de prueba agregados exitosamente");
});

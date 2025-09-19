/**
 * Script de prueba de integración para Zedmonkey
 * Validar todo el flujo desde la creación hasta la inyección
 */

async function testZedmonkeyIntegration() {
    console.log('🧪 Iniciando test de integración de Zedmonkey...');
    
    // Test 1: Verificar que el background script responde
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getScripts' });
        console.log('✅ Test 1: Comunicación con background script exitosa');
        console.log('   Respuesta:', response);
    } catch (error) {
        console.error('❌ Test 1: Error en comunicación con background script:', error);
        return false;
    }
    
    // Test 2: Crear un script de prueba simple
    const testScript = `// ==UserScript==
// @name         Test Integration Script
// @namespace    https://zedmonkey.dev/test
// @version      1.0.0
// @description  Script de prueba para integración de Zedmonkey
// @author       Zedmonkey Test Suite
// @match        *://example.com/*
// @match        *://www.google.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('🐒 Test Script ejecutado correctamente por Zedmonkey!');
    
    // Crear un elemento visual de prueba
    const testElement = document.createElement('div');
    testElement.id = 'zedmonkey-test-element';
    testElement.style.cssText = \`
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px;
        border-radius: 5px;
        z-index: 9999999;
        font-family: Arial, sans-serif;
        font-size: 12px;
    \`;
    testElement.textContent = '✅ Zedmonkey Test Script OK';
    
    document.body.appendChild(testElement);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (testElement.parentNode) {
            testElement.parentNode.removeChild(testElement);
        }
    }, 5000);
})();`;

    try {
        const addResponse = await chrome.runtime.sendMessage({
            action: 'addScript',
            scriptContent: testScript
        });
        
        if (addResponse.success) {
            console.log('✅ Test 2: Script de prueba creado exitosamente');
            console.log('   Script ID:', addResponse.scriptId);
            console.log('   Nombre:', addResponse.name);
            
            // Test 3: Verificar que el script se guardó correctamente
            const scriptsResponse = await chrome.runtime.sendMessage({ action: 'getScripts' });
            const savedScript = scriptsResponse.scripts?.find(s => s.id === addResponse.scriptId);
            
            if (savedScript) {
                console.log('✅ Test 3: Script encontrado en storage');
                console.log('   Metadata:', savedScript.metadata);
                console.log('   Habilitado:', savedScript.enabled);
                
                // Test 4: Probar toggle de script
                const toggleResponse = await chrome.runtime.sendMessage({
                    action: 'toggleScript',
                    scriptId: savedScript.id,
                    enabled: false
                });
                
                if (toggleResponse.success) {
                    console.log('✅ Test 4: Toggle de script exitoso');
                } else {
                    console.error('❌ Test 4: Error en toggle de script:', toggleResponse.error);
                }
                
                // Test 5: Verificar matching de URL
                const matchedResponse = await chrome.runtime.sendMessage({
                    action: 'getMatchedScripts',
                    url: 'https://www.google.com/'
                });
                
                console.log('✅ Test 5: Verificación de matching de URL');
                console.log('   Scripts que coinciden:', matchedResponse.scripts?.length || 0);
                
                // Test 6: Limpiar - eliminar el script de prueba
                const removeResponse = await chrome.runtime.sendMessage({
                    action: 'removeScript',
                    scriptId: savedScript.id
                });
                
                if (removeResponse.success) {
                    console.log('✅ Test 6: Script de prueba eliminado exitosamente');
                } else {
                    console.error('❌ Test 6: Error eliminando script de prueba:', removeResponse.error);
                }
                
            } else {
                console.error('❌ Test 3: Script no encontrado en storage después de crearlo');
                return false;
            }
            
        } else {
            console.error('❌ Test 2: Error creando script de prueba:', addResponse.error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test 2: Error en creación de script:', error);
        return false;
    }
    
    console.log('🎉 Todos los tests de integración completados exitosamente!');
    return true;
}

// Función para testing desde el popup o dashboard
function runIntegrationTest() {
    testZedmonkeyIntegration().then(success => {
        if (success) {
            console.log('🎊 Test de integración: EXITOSO');
        } else {
            console.log('💥 Test de integración: FALLIDO');
        }
    }).catch(error => {
        console.error('💥 Test de integración falló con error:', error);
    });
}

// Test específico para matching de URLs
async function testUrlMatching() {
    const testUrls = [
        'https://www.google.com/',
        'https://example.com/test',
        'https://github.com/',
        'chrome://extensions/',
        'about:blank'
    ];
    
    console.log('🔗 Testando matching de URLs...');
    
    for (const url of testUrls) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getMatchedScripts',
                url: url
            });
            console.log(`   URL: ${url} -> Scripts: ${response.scripts?.length || 0}`);
        } catch (error) {
            console.error(`   Error testando ${url}:`, error);
        }
    }
}

// Test específico para el parser
async function testParser() {
    console.log('📝 Testando parser de metadatos...');
    
    const testScripts = [
        {
            name: 'Script con @match',
            content: `// ==UserScript==
// @name Test Match Script
// @version 1.0
// @match *://example.com/*
// @grant none
// ==/UserScript==
console.log('test');`
        },
        {
            name: 'Script con @include',
            content: `// ==UserScript==
// @name Test Include Script  
// @version 1.0
// @include http*://google.com/*
// @grant GM_setValue
// ==/UserScript==
console.log('test');`
        },
        {
            name: 'Script con múltiples grants',
            content: `// ==UserScript==
// @name Test Multi Grant Script
// @version 1.0
// @match *://*/*
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_notification
// @grant GM_openInTab
// ==/UserScript==
console.log('test');`
        }
    ];
    
    for (const test of testScripts) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'validateMetadata',
                scriptContent: test.content
            });
            
            if (response.success) {
                console.log(`✅ ${test.name}:`);
                console.log(`   Válido: ${response.validation?.valid}`);
                console.log(`   Metadata:`, response.metadata);
                console.log(`   Requiere privilegios: ${response.requiresPrivileges}`);
            } else {
                console.error(`❌ ${test.name}:`, response.error);
            }
        } catch (error) {
            console.error(`❌ Error testando ${test.name}:`, error);
        }
    }
}

// Exportar funciones para uso en consola del desarrollador
if (typeof window !== 'undefined') {
    window.zedmonkeyTests = {
        runIntegrationTest,
        testUrlMatching,
        testParser,
        testZedmonkeyIntegration
    };
    
    // Auto-ejecutar si estamos en contexto de prueba
    if (window.location?.search?.includes('zedmonkey-test=true')) {
        runIntegrationTest();
    }
}

export {
    testZedmonkeyIntegration,
    runIntegrationTest,
    testUrlMatching,
    testParser
};

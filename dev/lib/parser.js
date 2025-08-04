// Parser compatible con el metadata block de Violentmonkey/Greasemonkey/Tampermonkey
// Compatible con todas las especificaciones del metadata block de Violentmonkey

function getScriptId(name) {
    let id = null;
    name = encodeURI(name);
    const ch = name.match(/[a-zA-Z0-9]/g);
    if (ch) {
        id = ch.join('');
    } else {
        id = btoa(name).replace(/[^a-zA-Z0-9]/g, '');
    }
    return id;
}

// Valida el formato del metadata block
function validateMetadataBlock(src) {
    const lines = src.split('\n');
    const startLine = lines.find(line => line.trim() === '// ==UserScript==');
    const endLine = lines.find(line => line.trim() === '// ==/UserScript==');
    
    if (!startLine || !endLine) {
        return { valid: false, errors: ['Missing // ==UserScript== or // ==/UserScript== markers'] };
    }
    
    const startIndex = lines.indexOf(startLine);
    const endIndex = lines.indexOf(endLine);
    
    if (startIndex >= endIndex) {
        return { valid: false, errors: ['Invalid metadata block structure'] };
    }
    
    // Verificar formato de líneas de metadata
    const errors = [];
    for (let i = startIndex + 1; i < endIndex; i++) {
        const line = lines[i].trim();
        if (line === '') continue; // Líneas vacías permitidas
        
        // Cada línea debe comenzar con // y tener exactamente un espacio
        if (!line.startsWith('// ')) {
            errors.push(`Line ${i + 1}: Metadata line must start with '// ' (note the space)`);
        }
        
        // Si comienza con @, debe tener formato válido
        if (line.startsWith('// @') && !line.match(/^\/\/\s@[a-zA-Z0-9_\-]+(?::[a-zA-Z\-_]+)?(?:\s+.*)?$/)) {
            errors.push(`Line ${i + 1}: Invalid metadata format`);
        }
    }
    
    return { valid: errors.length === 0, errors };  
}

function getHeader(src) {
    // Extrae el bloque de metadatos entre ==UserScript== y ==/UserScript==
    const headerStart = /^\/\/\s*==UserScript==/m;
    const headerStop = /^\/\/\s*==\/UserScript==/m;
    const startMatch = src.match(headerStart);
    const stopMatch = src.match(headerStop);
    if (!startMatch || !stopMatch) return null;
    const startIdx = src.indexOf(startMatch[0]);
    const stopIdx = src.indexOf(stopMatch[0]);
    if (startIdx === -1 || stopIdx === -1) return null;
    const header = src.substring(startIdx + startMatch[0].length, stopIdx);
    // Evita HTMLs mal formateados
    if (src.indexOf('<html>') > 0 && src.indexOf('<html>') < startIdx) return null;
    if (src.indexOf('<body>') > 0 && src.indexOf('<body>') < startIdx) return null;
    return header;
}

function processHeader(header) {
    // Estructura base compatible con todas las claves de Violentmonkey
    const script = {
        id: null,
        name: null,
        namespace: '',
        version: null,
        description: null,
        author: null,
        copyright: null,
        icon: null,
        icon64: null,
        homepage: null,
        homepageURL: null,
        website: null,
        source: null,
        supportURL: null,
        updateURL: null,
        downloadURL: null,
        // Arrays para reglas de matching
        includes: [],
        matches: [],
        excludes: [],
        excludeMatches: [], // @exclude-match
        // Dependencias
        requires: [],
        resources: [],
        // Permisos y configuración
        grants: [],
        noframes: false,
        runAt: 'document-end', // document-start, document-body, document-end, document-idle
        injectInto: 'auto', // page, content, auto
        unwrap: false,
        topLevelAwait: false,
        // Metadata adicional
        meta: {},
        locales: {}
    };

    // Limpieza y split
    header = header.replace(/\r/g, '\n').replace(/\n\n+/g, '\n');
    const lines = header.split('\n').map(l => l.replace(/^\/\//, '').trim()).filter(Boolean);

    // Regex para @key[:locale] value
    const metaRegex = /^@([a-zA-Z0-9_\-]+)(?::([a-zA-Z\-]+))?\s+(.+)$/;

    for (const l of lines) {
        const match = l.match(metaRegex);
        if (!match) continue;
        const [, key, locale, value] = match;

        // Localización
        if (locale) {
            script.locales[locale] = script.locales[locale] || {};
            script.locales[locale][key] = value;
            continue;
        }

        switch (key) {
            // Campos de información básica
            case 'name':
            case 'namespace':
            case 'version':
            case 'description':
            case 'author':
            case 'copyright':
                script[key] = value;
                break;
                
            // URLs de homepage (múltiples variantes)
            case 'homepage':
            case 'homepageURL':
            case 'website':
            case 'source':
                script.homepage = value;
                script[key] = value; // También guardar la clave original
                break;
                
            // URL de soporte
            case 'supportURL':
                script.supportURL = value;
                break;
                
            // URLs de descarga y actualización
            case 'updateURL':
                script.updateURL = value;
                break;
            case 'downloadURL':
                script.downloadURL = value;
                break;
                
            // Iconos (múltiples variantes)
            case 'icon':
            case 'iconURL':
            case 'defaulticon':
                script.icon = value;
                break;
            case 'icon64':
            case 'icon64URL':
                script.icon64 = value;
                break;
                
            // Reglas de matching - arrays múltiples
            case 'include':
                script.includes.push(value);
                break;
            case 'match':
                script.matches.push(value);
                break;
            case 'exclude':
                script.excludes.push(value);
                break;
            case 'exclude-match':
                script.excludeMatches.push(value);
                break;
                
            // Dependencias - arrays múltiples
            case 'require':
                script.requires.push({ url: value, loaded: false, textContent: null });
                break;
            case 'resource': {
                // @resource name url
                const parts = value.split(/\s+/);
                const resName = parts[0];
                const resUrl = parts.slice(1).join(' ');
                if (resName && resUrl) {
                    script.resources.push({ 
                        name: resName, 
                        url: resUrl, 
                        loaded: false, 
                        resText: null, 
                        resURL: null 
                    });
                }
                break;
            }
            
            // Permisos - array múltiple
            case 'grant':
                script.grants.push(value);
                break;
                
            // Configuración de ejecución
            case 'run-at':
                // Normaliza valores válidos: document-start, document-body, document-end, document-idle
                const validRunAt = ['document-start', 'document-body', 'document-end', 'document-idle'];
                script.runAt = validRunAt.includes(value) ? value : 'document-end';
                break;
                
            case 'inject-into':
                // Normaliza valores válidos: page, content, auto
                const validInjectInto = ['page', 'content', 'auto'];
                script.injectInto = validInjectInto.includes(value) ? value : 'auto';
                break;
                
            // Flags booleanos
            case 'noframes':
                script.noframes = true;
                break;
            case 'unwrap':
                script.unwrap = true;
                break;
            case 'top-level-await':
                script.topLevelAwait = true;
                break;
                
            default:
                // Guarda cualquier otro campo en meta para compatibilidad futura
                script.meta[key] = value;
                break;
        }
    }

    // ID y valores por defecto
    script.name = script.name || script.locales['en']?.name || 'Untitled Script';
    script.id = getScriptId(script.name);
    script.version = script.version || '0.0';

    // Normaliza arrays
    script.includes = script.includes.length ? script.includes : ['*'];
    script.matches = script.matches.length ? script.matches : [];
    script.excludes = script.excludes.length ? script.excludes : [];

    return script;
}

function parseUserscriptMetadata(scriptContent) {
    // Extrae el bloque de metadatos y lo procesa
    const header = getHeader(scriptContent);
    if (!header) return null;
    const script = processHeader(header);
    script.textContent = scriptContent;
    script.header = header;

    // GM_info completo
    script.GM_info = {
        script: {
            name: script.name,
            description: script.description,
            version: script.version,
            namespace: script.namespace,
            includes: script.includes,
            matches: script.matches,
            excludes: script.excludes,
            resources: script.resources,
            requires: script.requires,
            grants: script.grants,
            icon: script.icon,
            icon64: script.icon64,
            homepage: script.homepage,
            updateURL: script.updateURL,
            downloadURL: script.downloadURL,
            noframes: script.noframes,
            runAt: script.runAt,
            locales: script.locales
        },
        scriptMetaStr: header,
        scriptSource: scriptContent,
        scriptHandler: "Zedmonkey"
    };

    return script;
}

// Descarga y almacena recursos y requires para un script
async function fetchAndStoreResources(script) {
    // Descarga requires
    for (const req of script.requires) {
        try {
            const resp = await fetch(req.url);
            req.textContent = await resp.text();
            req.loaded = true;
        } catch (e) {
            req.loaded = false;
            req.textContent = null;
        }
    }
    // Descarga resources
    for (const res of script.resources) {
        try {
            const resp = await fetch(res.url);
            // Intenta como texto, si falla, como blob/dataURL
            try {
                res.resText = await resp.text();
            } catch {
                const blob = await resp.blob();
                res.resText = await new Promise(r => {
                    const reader = new FileReader();
                    reader.onload = () => r(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
            res.resURL = res.url;
            res.loaded = true;
        } catch (e) {
            res.loaded = false;
            res.resText = null;
            res.resURL = null;
        }
    }
    // Guarda el script actualizado
    // await saveScript(script); // Si usas tu función de guardado
}

// Función para validar versiones según especificación Violentmonkey
function validateVersion(version) {
    if (!version) return false;
    // Formato: número.número[letra]número...
    const versionRegex = /^\d+(?:\.\d+)*(?:[a-zA-Z]+\d*)*$/;
    return versionRegex.test(version);
}

// Función para obtener la localidad preferida
function getLocalizedValue(script, key, preferredLocale = 'en') {
    // Primero intenta el valor directo
    if (script[key]) return script[key];
    
    // Luego intenta la localidad preferida
    if (script.locales[preferredLocale] && script.locales[preferredLocale][key]) {
        return script.locales[preferredLocale][key];
    }
    
    // Finalmente intenta cualquier localidad disponible
    for (const locale in script.locales) {
        if (script.locales[locale][key]) {
            return script.locales[locale][key];
        }
    }
    
    return null;
}

// Función para normalizar patrones de match/include
function normalizeMatchPattern(pattern) {
    // Convierte patrones de include a formato match si es posible
    if (pattern.includes('*://')) {
        return pattern;
    }
    
    // Convierte patterns como "http*://example.com/*" a formato válido
    if (pattern.startsWith('http*://')) {
        return pattern.replace('http*://', '*://');
    }
    
    return pattern;
}

// Función para verificar si un script requiere privilegios especiales
function requiresPrivileges(script) {
    if (!script.grants || script.grants.length === 0) return false;
    
    const privilegedGrants = [
        'GM_setValue', 'GM_getValue', 'GM_deleteValue', 'GM_listValues',
        'GM_xmlhttpRequest', 'GM_download', 'GM_openInTab', 'GM_notification',
        'GM_setClipboard', 'GM_getResourceText', 'GM_getResourceURL',
        'GM_registerMenuCommand', 'GM_unregisterMenuCommand',
        'GM.setValue', 'GM.getValue', 'GM.deleteValue', 'GM.listValues',
        'GM.xmlHttpRequest', 'GM.download', 'GM.openInTab', 'GM.notification',
        'GM.setClipboard', 'GM.getResourceText', 'GM.getResourceUrl',
        'GM.registerMenuCommand', 'GM.unregisterMenuCommand',
        'window.close', 'window.focus'
    ];
    
    return script.grants.some(grant => privilegedGrants.includes(grant));
}

// Función para crear un script de prueba compatible con Violentmonkey
function createTestScript() {
    return `// ==UserScript==
// @name         Test Script
// @namespace    https://zedmonkey.dev/
// @version      1.0.0
// @description  Script de prueba para Zedmonkey
// @description:es  Script de prueba para Zedmonkey en español
// @author       Zedmonkey Team
// @match        *://example.com/*
// @exclude      *://example.com/admin/*
// @icon         https://example.com/icon.png
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.notification
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @resource     CSS https://example.com/style.css
// @run-at       document-end
// @inject-into  auto
// @supportURL   https://zedmonkey.dev/support
// @homepageURL  https://zedmonkey.dev/
// @downloadURL  https://zedmonkey.dev/scripts/test.user.js
// @updateURL    https://zedmonkey.dev/scripts/test.meta.js
// ==/UserScript==

(function() {
    'use strict';
    
    GM.notification({
        text: '¡Hola desde Zedmonkey! Este es un script de ejemplo.',
        title: 'Test Script',
        timeout: 3000
    });
    
    console.log('Script de prueba ejecutado correctamente');
})();`;
}

export {
    getScriptId,
    validateMetadataBlock,
    validateVersion,
    getLocalizedValue,
    normalizeMatchPattern,
    requiresPrivileges,
    createTestScript,
    parseUserscriptMetadata,
    fetchAndStoreResources
};

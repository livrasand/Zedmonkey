// Parser compatible con el metadata block de Greasemonkey/Tampermonkey

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
    // Estructura base
    const script = {
        id: null,
        name: null,
        namespace: null,
        version: null,
        description: null,
        author: null,
        copyright: null,
        icon: null,
        icon64: null,
        homepage: null,
        updateURL: null,
        downloadURL: null,
        includes: [],
        matches: [],
        excludes: [],
        requires: [],
        resources: [],
        grants: [],
        noframes: false,
        runAt: 'document-end',
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
            case 'name':
            case 'namespace':
            case 'version':
            case 'description':
            case 'author':
            case 'copyright':
            case 'homepage':
            case 'homepageURL':
            case 'website':
            case 'source':
                script[key] = value;
                break;
            case 'icon':
            case 'iconURL':
            case 'defaulticon':
                script.icon = value;
                break;
            case 'icon64':
            case 'icon64URL':
                script.icon64 = value;
                break;
            case 'include':
                script.includes.push(value);
                break;
            case 'match':
                script.matches.push(value);
                break;
            case 'exclude':
                script.excludes.push(value);
                break;
            case 'require':
                script.requires.push({ url: value, loaded: false, textContent: null });
                break;
            case 'resource': {
                // @resource name url
                const [resName, ...resUrlArr] = value.split(/\s+/);
                const resUrl = resUrlArr.join(' ');
                if (resName && resUrl) {
                    script.resources.push({ name: resName, url: resUrl, loaded: false, resText: null, resURL: null });
                }
                break;
            }
            case 'grant':
                script.grants.push(value);
                break;
            case 'noframes':
                script.noframes = true;
                break;
            case 'run-at':
                script.runAt = value;
                break;
            case 'updateURL':
                script.updateURL = value;
                break;
            case 'downloadURL':
                script.downloadURL = value;
                break;
            default:
                // Guarda cualquier otro campo en meta
                script.meta[key] = value;
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

export {
    getScriptId,
    parseUserscriptMetadata,
    fetchAndStoreResources
};
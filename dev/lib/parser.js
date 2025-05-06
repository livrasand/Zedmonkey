function parseUserscriptMetadata(scriptContent) {
    // Se asume que el bloque de metadatos está al inicio y cumple:
    // // ==UserScript==
    // // @key value
    // // ==/UserScript==
    const metadataBlockRegex = /^\/\/\s*==UserScript==\s*$(.*?)^\/\/\s*==\/UserScript==\s*$/ms;
    const blockMatch = scriptContent.match(metadataBlockRegex);
    if (!blockMatch) return null;

    // Se eliminan posibles espacios y líneas vacías
    const lines = blockMatch[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    const metadata = {};

    // Función auxiliar: agrega valores soportando múltiples entradas y claves localizadas.
    function addMetadata(key, locale, value) {
        const baseKey = key.toLowerCase();
        if (locale) {
            // Si la clave es multilingüe, almacénala en un objeto
            if (!metadata[baseKey]) metadata[baseKey] = {};
            metadata[baseKey][locale.toLowerCase()] = value;
        } else {
            // Para claves múltiples (como @match, @require, @resource, @grant)
            if (metadata[baseKey] === undefined) {
                metadata[baseKey] = value;
            } else if (Array.isArray(metadata[baseKey])) {
                metadata[baseKey].push(value);
            } else {
                metadata[baseKey] = [metadata[baseKey], value];
            }
        }
    }

    // Cada línea debe comenzar EXACTAMENTE con "// @"
    const lineRegex = /^\/\/\s@([\w-]+)(?::([A-Za-z0-9-]+))?\s+(.*)$/;
    for (const line of lines) {
        const match = line.match(lineRegex);
        if (match) {
            const key = match[1];
            const locale = match[2] || null;
            const value = match[3].trim();
            addMetadata(key, locale, value);
        }
    }

    // Valores requeridos o por defecto
    metadata.name = metadata.name || "Untitled Script";
    metadata.version = metadata.version || "1.0";
    // Se prioriza @match; si no existe, se utiliza @include
    metadata.match = metadata.match || metadata.include || ["*://*/*"];

    return metadata;
}

function parseZedataBlock(scriptContent) {
    try {
        var t, r, c = scriptContent.match(/\/\*\s*zedata\s*(\{[\s\S]*?\})\s*\*\//i);
        return c && c[1] ? (t = c[1], {
            name: (r = JSON.parse(t)).name || "Untitled Script",
            version: r.version || "1.0",
            match: r.match || ["*://*/*"],
            description: r.description || "",
            author: r.author || "",
            ...r
        }) : null;
    } catch (e) {
        console.error("Error parsing Zedata block:", e);
        return null;
    }
}

function parseScriptMetadata(scriptContent) {
    // Intenta primero Zedata Block
    const zedata = parseZedataBlock(scriptContent);
    if (zedata) return { ...zedata, _format: "zedata" };

    // Si no, intenta Metadata Block tradicional
    const meta = parseUserscriptMetadata(scriptContent);
    if (meta) return { ...meta, _format: "userscript" };

    // Si no hay metadatos válidos, retorna null
    return null;
}

export {
    parseZedataBlock,
    parseUserscriptMetadata,
    parseScriptMetadata
};
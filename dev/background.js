import { parseUserscriptMetadata } from './lib/parser.js';

async function getScripts() {
    console.log("getScripts: Attempting to retrieve scripts from storage.");
    return new Promise(t => {
        chrome.storage.local.get("scripts", e => {
            const scripts = e.scripts || [];
            console.log("getScripts: Retrieved scripts:", scripts);
            t(scripts);
        });
    });
}

async function saveScript(o) {
    console.log("saveScript: Attempting to save script:", o.metadata ? o.metadata.name : o.id);
    return new Promise((r, c) => {
        getScripts().then(e => {
            o.id || (o.id = Date.now().toString()), o.enabled = !1 !== o.enabled;
            var t = e.findIndex(e => e.id === o.id);
            0 <= t ? e[t] = o : e.push(o), chrome.storage.local.set({
                scripts: e
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("saveScript: Error saving script:", chrome.runtime.lastError);
                    c(chrome.runtime.lastError);
                } else {
                    console.log("saveScript: Script saved successfully:", o.metadata ? o.metadata.name : o.id);
                    r(o);
                }
            });
        });
    });
}
async function removeScript(c) {
    console.log("removeScript: Attempting to remove script with ID:", c);
    return new Promise((t, r) => {
        getScripts().then(e => {
            e = e.filter(e => e.id !== c);
            chrome.storage.local.set({
                scripts: e
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("removeScript: Error removing script:", chrome.runtime.lastError);
                    r(chrome.runtime.lastError);
                } else {
                    console.log("removeScript: Script removed successfully with ID:", c);
                    t();
                }
            });
        });
    });
}

function parseZedataBlock(e) {
    try {
        var t, r, c = e.match(/\/\*\s*zedata\s*(\{[\s\S]*?\})\s*\*\//i);
        return c && c[1] ? (t = c[1], {
            name: (r = JSON.parse(t)).name || "Untitled Script",
            version: r.version || "1.0",
            match: r.match || ["*://*/*"],
            description: r.description || "",
            author: r.author || "",
            ...r
        }) : null
    } catch (e) {
        console.error("parseZedataBlock: Error parsing Zedata block:", e);
        return null;
    }
}

function globToRegex(glob) {
    return glob
        .replace(/\*/g, '.*') // Convierte * a .*
        .replace(/\?/g, '.')  // Convierte ? a .
        .replace(/\/\*\*\//g, '/.*/') // Convierte /**/ a /.*/
        .replace(/:\/\//g, '://') // Asegura que ::// no se modifique
        .replace(/\./g, '\\.'); // Escapa los puntos
}

function isScriptMatchingUrl(script, url) {
    console.log(`[Zedmonkey] Checking script "${script.metadata.name}" against URL: ${url}`);

    // Ensure script.metadata and script.enabled are valid
    if (!script.metadata || script.enabled === false) {
        console.log(`[Zedmonkey] Script "${script.metadata.name}" skipped due to missing metadata or being disabled.`);
        return false;
    }

    const {
        match: matches = [],
        include: includes = [],
        exclude: excludes = []
    } = script.metadata;

    // 1. Verificar exclusiones ( @exclude)
    // Si la URL coincide con alguna regla de exclusión, el script no se inyecta.
    if (excludes.some(excludePattern => {
        const regex = new RegExp(globToRegex(excludePattern));
        if (regex.test(url)) {
            console.log(`[Zedmonkey] URL ${url} EXCLUIDA para el script "${script.metadata.name}" por la regla: ${excludePattern}`);
            return true;
        }
        return false;
    })) {
        return false;
    }

    // 2. Verificar inclusiones ( @match y @include)
    // El script se inyecta si coincide con alguna regla @match O @include.
    const combinedIncludes = [...matches, ...includes];
    if (combinedIncludes.length > 0) {
        if (combinedIncludes.some(includePattern => {
            const regex = new RegExp(globToRegex(includePattern));
            if (regex.test(url)) {
                console.log(`[Zedmonkey] URL ${url} INCLUIDA para el script "${script.metadata.name}" por la regla: ${includePattern}`);
                return true;
            }
            return false;
        })) {
            return true;
        }
    } else {
        // Si no hay reglas de @match o @include, se considera que coincide con todo (comportamiento por defecto)
        console.log(`[Zedmonkey] No @match or @include rules for script "${script.metadata.name}", assuming all URLs.`);
        return true;
    }

    // Si hay reglas de inclusión pero ninguna coincidió, no se inyecta.
    console.log(`[Zedmonkey] No matching include rule found for script "${script.metadata.name}".`);
    return false;
}

// 6. Manejo Robusto de Errores
async function injectWithRecovery(script, methods, tabId, frameId) {
    console.log(`injectWithRecovery: Attempting injection for script "${script.metadata.name}" into frame ${frameId}.`);
    for (const method of methods) {
        try {
            console.log(`injectWithRecovery: Attempting injection with method: ${method.name}`);
            await method.inject(script, tabId, frameId);
            console.log(`injectWithRecovery: Injection successful with method: ${method.name}`);
            return; // Inyección exitosa, salir
        } catch (error) {
            console.warn(`injectWithRecovery: Method ${method.name} failed for frame ${frameId}:`, error);
            console.error(`injectWithRecovery: Detailed error for ${method.name}:`, error); // Added detailed error logging
            // Continuar con el siguiente método
        }
    }
    throw new Error(`injectWithRecovery: All injection methods failed for frame ${frameId}`);
}

// Función para determinar el método de inyección basado en el contexto
// Placeholder: En un escenario real, siteContext.hasStrictCSP debería ser determinado
// por el content script y comunicado al background script.
function determineInjectionMethod(siteContext) {
    // Por ahora, siempre preferimos 'PAGE' (MAIN world) para mejor rendimiento y compatibilidad
    // Si siteContext.hasStrictCSP fuera verdadero, podríamos considerar 'CONTENT' (ISOLATED world)
    // o XHR Blob Injection como respaldo.
    if (siteContext && siteContext.hasStrictCSP) {
        console.log("determineInjectionMethod: Site has strict CSP, preferring PAGE world.");
        return 'PAGE'; // Mejor rendimiento
    }
    console.log("determineInjectionMethod: Preferring PAGE world.");
    return 'PAGE'; // Mejor seguridad
}

// Métodos de inyección
const injectionMethods = {
    PAGE: {
        name: 'Page (MAIN world) Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`injectionMethods.PAGE: Executing script in MAIN world for tab ${tabId}, frame ${frameId}.`);
            await chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: (content) => {
                    const s = document.createElement('script');
                    s.textContent = content;
                    (document.head || document.documentElement).appendChild(s);
                    s.remove(); // Eliminar el elemento script después de la ejecución
                },
                args: [script.content],
                world: 'MAIN'
            });
        }
    },
    CONTENT: {
        name: 'Content (ISOLATED world) Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`injectionMethods.CONTENT: Executing script in ISOLATED world for tab ${tabId}, frame ${frameId}.`);
            await chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: (content) => {
                    eval(content); // Ejecutar el script en el isolated world
                },
                args: [script.content],
                world: 'ISOLATED'
            });
        }
    },
    XHR_BLOB: {
        name: 'XHR Blob Injection',
        inject: async (script, tabId, frameId) => {
            console.log(`injectionMethods.XHR_BLOB: Executing script via XHR Blob for tab ${tabId}, frame ${frameId}.`);
            // This method is more complex and requires a content script to handle the creation of the blob URL
            // and the injection of the script. For simplicity, here is an approximation.
            // In a real scenario, the background script would send the script content to the content script,
            // and the content script would create the blob and inject it.
            await chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: async (scriptContent) => {
                    const blob = new Blob([scriptContent], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    const s = document.createElement('script');
                    s.src = url;
                    s.onload = () => URL.revokeObjectURL(url);
                    (document.head || document.documentElement).appendChild(s);
                },
                args: [script.content],
                world: 'MAIN'
            });
        }
    }
};

async function updateBadgeAndInjectScripts(tabId) {
    console.log(`[Zedmonkey] updateBadgeAndInjectScripts called for tabId: ${tabId}`);
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) {
        console.log(`[Zedmonkey] No tab or URL found for tabId: ${tabId}.`);
        return;
    }

    const excludedUrls = [/^chrome:\/\//, /^chrome-extension:\/\//, /^moz-extension:\/\//, /^about:/, /^edge:/, /^opera:/, /^extension:/, /^file:\/\/.*\/AppData\/Local\//, /^https:\/\/chrome\.google\.com\/webstore/, /^https:\/\/addons\.mozilla\.org/, /^https:\/\/microsoftedge\.microsoft\.com\/addons/];
    const isExcluded = excludedUrls.some(regex => regex.test(tab.url));

    if (isExcluded) {
        console.log(`[Zedmonkey] Tab URL ${tab.url} is excluded. Clearing badge.`);
        return chrome.action.setBadgeText({ tabId, text: '' });
    }

    const scripts = await getScripts();
    const matchedScripts = scripts.filter(s => s.enabled && isScriptMatchingUrl(s, tab.url));
    const injectionEnabled = (await chrome.storage.sync.get("injectionEnabled")).injectionEnabled !== false; // Default to true

    if (injectionEnabled) {
        console.log(`[Zedmonkey] Injection is enabled. Attempting to inject ${matchedScripts.length} scripts.`);
        for (const script of matchedScripts) {
            const frames = await chrome.webNavigation.getAllFrames({ tabId });
            for (const frame of frames) {
                if (frame.errorOccurred || frame.url.startsWith('about:blank')) {
                    console.warn(`[Zedmonkey] Skipping injection for frame: ${frame.url} (error occurred or about:blank).`);
                    continue;
                }
                const siteContext = { hasStrictCSP: false }; // Placeholder
                const preferredMethod = determineInjectionMethod(siteContext);
                let methodsToTry = [];
                if (preferredMethod === 'PAGE') {
                    methodsToTry.push(injectionMethods.PAGE);
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'CONTENT') {
                    methodsToTry.push(injectionMethods.CONTENT);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'XHR_BLOB') {
                    methodsToTry.push(injectionMethods.XHR_BLOB);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                }
                try {
                    await injectWithRecovery(script, methodsToTry, tabId, frame.frameId);
                } catch (error) {
                    console.error(`[Zedmonkey] Failed to inject script ${script.id} into frame ${frame.frameId}:`, error);
                }
            }
        }
    } else {
        console.log(`[Zedmonkey] Injection is disabled.`);
    }

    const count = matchedScripts.length;
    chrome.action.setBadgeText({
        tabId: tabId,
        text: count > 0 ? String(count) : ''
    });
    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#3498db'
    });
}

chrome.tabs.onActivated.addListener(e => {
    console.log("onActivated: Tab activated, updating badge and injecting scripts for tab ID:", e.tabId);
    updateBadgeAndInjectScripts(e.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    console.log(`onUpdated: Tab ${tabId} updated. Status: ${changeInfo.status}, URL: ${tab.url}`);
    const injectionEnabled = (await chrome.storage.sync.get("injectionEnabled")).injectionEnabled !== false; // Default to true

    if (!injectionEnabled) {
        console.log(`[Zedmonkey] Injection is disabled. Skipping script injection for tab ${tabId}.`);
        chrome.action.setBadgeText({ tabId, text: "" });
        return;
    }

    const excludedUrls = [/^chrome:\/\//, /^chrome-extension:\/\//, /^moz-extension:\/\//, /^about:/, /^edge:/, /^opera:/, /^extension:/, /^file:\/\/.*\/AppData\/Local\//, /^https:\/\/chrome\.google\.com\/webstore/, /^https:\/\/addons\.mozilla\.org/, /^https:\/\/microsoftedge\.microsoft\.com\/addons/];
    const isExcluded = excludedUrls.some(regex => regex.test(tab.url));

    if (isExcluded) {
        console.log(`[Zedmonkey] Tab URL ${tab.url} is excluded. Clearing badge.`);
        return chrome.action.setBadgeText({ tabId, text: '' });
    }

    const scripts = await getScripts();
    const matchedScripts = scripts.filter(s => s.enabled && isScriptMatchingUrl(s, tab.url));

    if (matchedScripts.length === 0) {
        console.log(`[Zedmonkey] No matched scripts for tab ${tabId}. Clearing badge.`);
        chrome.action.setBadgeText({ tabId, text: "" });
        return;
    }

    console.log(`[Zedmonkey] Found ${matchedScripts.length} matched scripts for tab ${tabId}.`);

    for (const script of matchedScripts) {
        const runAt = script.metadata.run_at || "document_idle"; // Default to document_idle
        let shouldInject = false;

        if (runAt === "document_start" && changeInfo.status === "loading") {
            shouldInject = true;
        } else if (runAt === "document_end" && changeInfo.status === "complete") {
            shouldInject = true;
        } else if (runAt === "document_idle" && changeInfo.status === "complete") {
            // For document_idle, we can inject after a short delay to ensure page is fully ready
            // This is a simplification; a more robust solution might use requestIdleCallback
            setTimeout(() => {
                updateBadgeAndInjectScripts(tabId); // Re-trigger injection for idle scripts
            }, 500);
            continue; // Skip immediate injection for document_idle
        }

        if (shouldInject) {
            const frames = await chrome.webNavigation.getAllFrames({ tabId });
            for (const frame of frames) {
                if (frame.errorOccurred || frame.url.startsWith('about:blank')) {
                    console.warn(`[Zedmonkey] Skipping injection for frame: ${frame.url} (error occurred or about:blank).`);
                    continue;
                }
                const siteContext = { hasStrictCSP: false }; // Placeholder
                const preferredMethod = determineInjectionMethod(siteContext);
                let methodsToTry = [];
                if (preferredMethod === 'PAGE') {
                    methodsToTry.push(injectionMethods.PAGE);
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'CONTENT') {
                    methodsToTry.push(injectionMethods.CONTENT);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.XHR_BLOB); // Fallback
                } else if (preferredMethod === 'XHR_BLOB') {
                    methodsToTry.push(injectionMethods.XHR_BLOB);
                    methodsToTry.push(injectionMethods.PAGE); // Fallback
                    methodsToTry.push(injectionMethods.CONTENT); // Fallback
                }
                try {
                    await injectWithRecovery(script, methodsToTry, tabId, frame.frameId);
                } catch (error) {
                    console.error(`[Zedmonkey] Failed to inject script ${script.id} into frame ${frame.frameId}:`, error);
                }
            }
        }
    }

    // Update badge after all injections for this status change are attempted
    const finalCount = matchedScripts.filter(s => s.enabled && isScriptMatchingUrl(s, tab.url)).length;
    chrome.action.setBadgeText({
        tabId: tabId,
        text: finalCount > 0 ? String(finalCount) : ''
    });
    chrome.action.setBadgeBackgroundColor({
        tabId: tabId,
        color: '#3498db'
    });
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    console.log("onMessage: Received message:", request.action, request);
    try {
        switch (request.action) {
            case "getScripts":
                try {
                    const scripts = await getScripts();
                    const response = { scripts };
                    console.log("onMessage: Sending response for getScripts (async/await):", response);
                    sendResponse(response);
                } catch (error) {
                    const response = { error: error.message };
                    console.error("onMessage: Sending error response for getScripts (async/await):", response);
                    sendResponse(response);
                }
                return true; // Indica que la respuesta será asíncrona
            case "getMatchedScripts":
                getScripts().then(scripts => {
                    const matchedScripts = scripts.filter(script => isScriptMatchingUrl(script, request.url));
                    sendResponse({ scripts: matchedScripts });
                }).catch(error => sendResponse({ error: error.message }));
                return true;
            case "getScriptContent":
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    sendResponse(script ? { content: script.content } : { error: "Script not found" });
                }).catch(error => sendResponse({ error: error.message }));
                return true;
            case "addScript":
                {
                    const metadata = parseUserscriptMetadata(request.scriptContent);
                    saveScript({
                        content: request.scriptContent,
                        metadata: metadata
                    }).then(script => sendResponse({
                        success: true,
                        scriptId: script.id,
                        name: script.metadata.name
                    })).catch(error => sendResponse({
                        success: false,
                        error: error.message
                    }));
                    return true;
                }
            case "updateScriptContent":
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    if (script) {
                        script.content = request.scriptContent;
                        try {
                            const parsedMetadata = parseZedataBlock(request.scriptContent) || parseUserscriptMetadata(request.scriptContent);
                            if (parsedMetadata) {
                                script.metadata = parsedMetadata;
                            }
                        } catch (e) {
                            console.warn("updateScriptContent: Could not update metadata:", e);
                        }
                        return saveScript(script);
                    }
                    throw new Error("Script not found");
                }).then(script => sendResponse({
                    success: true,
                    scriptId: script.id,
                    name: script.metadata.name
                })).catch(error => sendResponse({
                    success: false,
                    error: error.message
                }));
                return true;
            case "removeScript":
                removeScript(request.scriptId).then(() => sendResponse({ success: true })).catch(error => sendResponse({ success: false, error: error.message }));
                return true;
            case "toggleScriptEnabled":
            case "toggleScript":
                getScripts().then(scripts => {
                    const script = scripts.find(s => s.id === request.scriptId);
                    if (script) {
                        script.enabled = request.enabled;
                        return saveScript(script);
                    }
                    throw new Error("Script not found");
                }).then(() => {
                    sendResponse({ success: true });
                    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                        if (tabs && tabs[0]) {
                            updateBadgeAndInjectScripts(tabs[0].id);
                        }
                    });
                }).catch(error => sendResponse({ success: false, error: error.message }));
                return true;
            case "setInjectionState":
                chrome.storage.sync.set({ injectionEnabled: request.enabled }, () => {
                    sendResponse({ success: true });
                    chrome.tabs.query({}, tabs => {
                        tabs.forEach(tab => {
                            updateBadgeAndInjectScripts(tab.id);
                        });
                    });
                });
                return true;
            case "openScriptInEditor":
                try {
                    chrome.storage.local.set({ tempScriptContent: request.scriptContent }, () => {
                        chrome.tabs.create({
                            url: chrome.runtime.getURL("editor/editor.html?loadTemp=true")
                        });
                        sendResponse({ success: true });
                    });
                } catch (e) {
                    console.error("openScriptInEditor: Error opening editor:", e);
                    sendResponse({ success: false, error: e.message });
                }
                return true;
            case "getScriptsForCurrentPage":
                getScripts().then(scripts => {
                    const matchedScripts = scripts.filter(script =>
                        script.enabled && isScriptMatchingUrl(script, request.url)
                    );

                    // Send scripts to content script for safe injection
                    matchedScripts.forEach(script => {
                        chrome.tabs.sendMessage(sender.tab.id, {
                            action: "injectScript",
                            scriptContent: script.content
                        });
                    });

                    sendResponse({ count: matchedScripts.length });
                }).catch(error => sendResponse({ error: error.message }));
                return true;
            case 'proxyRequest':
                console.log("onMessage: Received proxyRequest for URL:", request.url);
                try {
                    const response = await fetch(request.url, {
                        method: request.method || 'GET',
                        headers: request.headers || {},
                        body: request.body || null
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const text = await response.text();
                    sendResponse({ success: true, content: text });
                } catch (error) {
                    console.error("onMessage: Error proxying request:", error);
                    sendResponse({ success: false, error: error.message });
                }
                return true;
            default:
                console.warn("onMessage: Unknown action received:", request.action);
                sendResponse({ error: "Unknown action" });
                return false;
        }
    } catch (e) {
        console.error("onMessage: Error handling message:", e);
        sendResponse({ error: e.message });
        return false;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("onInstalled: Extension installed or updated.");
    chrome.contextMenus.create({
        id: "reload-without-scripts",
        title: "Reload page without scripts",
        contexts: ["action"]
    });
    chrome.contextMenus.create({
        id: "extension-options",
        title: "Extension options",
        contexts: ["action"]
    });
});

chrome.contextMenus.onClicked.addListener((e, r) => {
    console.log("onClicked: Context menu item clicked:", e.menuItemId);
    if ("reload-without-scripts" === e.menuItemId) {
        chrome.storage.sync.get("injectionEnabled", e => {
            let t = !1 !== e.injectionEnabled;
            chrome.storage.sync.set({
                injectionEnabled: !1
            }, () => {
                chrome.tabs.reload(r.id, {
                    bypassCache: !0
                }, () => {
                    setTimeout(() => {
                        chrome.storage.sync.set({
                            injectionEnabled: t
                        });
                    }, 500);
                });
            });
        });
    } else if ("extension-options" === e.menuItemId) {
        chrome.runtime.openOptionsPage();
    }
});

// Listener para detectar la primera instalación
chrome.runtime.onInstalled.addListener((details) => {
    console.log("onInstalled: Details:", details.reason);
    if (details.reason === 'install') {
        // Marcar como primera instalación
        chrome.storage.local.set({ 'firstInstall': true }, () => {
            console.log('Primera instalación detectada, mostrando onboarding');
            // Abrir la página de onboarding
            chrome.tabs.create({
                url: chrome.runtime.getURL('onboarding/welcome.html')
            });
        });
    } else if (details.reason === 'update') {
        // Detectar actualización de la extensión
        console.log('Actualización detectada, mostrando página de novedades');
        // Abrir página de novedades o changelog
        chrome.tabs.create({
            url: chrome.runtime.getURL('onboarding/update.html')
        });
    }
});

// Set uninstall URL to collect feedback when users uninstall the extension
chrome.runtime.setUninstallURL('https://zedmonkey.vercel.app/feedback.html');
async function getScripts() {
    return new Promise(t => {
        chrome.storage.local.get("scripts", e => {
            t(e.scripts || [])
        })
    })
}
async function saveScript(o) {
    return new Promise((r, c) => {
        getScripts().then(e => {
            o.id || (o.id = Date.now().toString()), o.enabled = !1 !== o.enabled;
            var t = e.findIndex(e => e.id === o.id);
            0 <= t ? e[t] = o : e.push(o), chrome.storage.local.set({
                scripts: e
            }, () => {
                chrome.runtime.lastError ? c(chrome.runtime.lastError) : r(o)
            })
        })
    })
}
async function removeScript(c) {
    return new Promise((t, r) => {
        getScripts().then(e => {
            e = e.filter(e => e.id !== c);
            chrome.storage.local.set({
                scripts: e
            }, () => {
                chrome.runtime.lastError ? r(chrome.runtime.lastError) : t()
            })
        })
    })
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
        return console.error("Error parsing Zedata block:", e), null
    }
}

function parseUserscriptMetadata(e) {
    try {
        var t = e.match(/\/\/\s*==UserScript==\s*([\s\S]*?)\/\/\s*==\/UserScript==/i);
        if (!t || !t[1]) return null;
        var c = t[1].split("\n");
        let r = {};
        return c.forEach(e => {
            var t, e = e.match(/\/\/\s*@(\w+)\s+(.*)/);
            e && (t = e[1].toLowerCase(), e = e[2].trim(), ["match", "include", "exclude", "require", "resource", "grant"].includes(t) ? (r[t] || (r[t] = []), r[t].push(e)) : r[t] = e)
        }), {
            name: r.name || "Untitled Script",
            version: r.version || "1.0",
            match: r.match || r.include || ["*://*/*"],
            description: r.description || "",
            author: r.author || "",
            ...r
        }
    } catch (e) {
        return console.error("Error parsing userscript metadata:", e), null
    }
}

function isScriptMatchingUrl(e, r) {
    return !(!e.metadata || !e.metadata.match) && (Array.isArray(e.metadata.match) ? e.metadata.match : [e.metadata.match]).some(e => {
        try {
            var t;
            return e && "string" == typeof e ? (t = e.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/^(\*:\/\/)/g, "^(https?|file|ftp)://"), new RegExp(t).test(r)) : (console.error("Invalid match pattern:", e), !1)
        } catch (e) {
            return console.error("Error matching URL pattern:", e), !1
        }
    })
}

function updateScriptCountBadge(r) {
    r && chrome.tabs.get(r, t => {
        !chrome.runtime.lastError && t && t.url && ([/^chrome:\/\//, /^chrome-extension:\/\//, /^moz-extension:\/\//, /^about:/, /^edge:/, /^opera:/, /^extension:/, /^file:\/\/.*\/AppData\/Local\//, /^https:\/\/chrome\.google\.com\/webstore/, /^https:\/\/addons\.mozilla\.org/, /^https:\/\/microsoftedge\.microsoft\.com\/addons/].some(e => e.test(t.url)) ? chrome.action.setBadgeText({
            tabId: r,
            text: ""
        }) : chrome.storage.sync.get("injectionEnabled", e => {
            !1 !== e.injectionEnabled ? getScripts().then(e => {
                e = e.filter(e => isScriptMatchingUrl(e, t.url) && !1 !== e.enabled);
                0 < e.length ? (chrome.action.setBadgeText({
                    tabId: r,
                    text: e.length.toString()
                }), chrome.action.setBadgeBackgroundColor({
                    tabId: r,
                    color: "#3498db"
                })) : chrome.action.setBadgeText({
                    tabId: r,
                    text: ""
                })
            }).catch(e => {
                console.error("Error getting scripts for badge:", e), chrome.action.setBadgeText({
                    tabId: r,
                    text: ""
                })
            }) : chrome.action.setBadgeText({
                tabId: r,
                text: ""
            })
        }))
    })
}

// Update storage function to use valid resource paths
async function storeScriptAsResource(script) {
    if (!script.id) script.id = Date.now().toString();
    
    const resourcePath = `scripts/${script.id}.js`;
    await chrome.storage.local.set({
        [resourcePath]: script.content
    });
    
    // Verify storage immediately
    const result = await chrome.storage.local.get(resourcePath);
    console.log('Storage verification:', result[resourcePath] ? 'OK' : 'MISSING');
    
    return resourcePath;
}

// Simplified injection using direct storage access
async function injectScript(tabId, script) {
    const resourcePath = await storeScriptAsResource(script);
    const result = await chrome.storage.local.get(resourcePath);
    const scriptContent = result[resourcePath];

    try {
        // Try main world execution first
        await chrome.scripting.executeScript({
            target: {tabId: tabId, allFrames: true},
            func: (code) => {
                try {
                    const scriptEl = document.createElement('script');
                    scriptEl.textContent = code;
                    (document.head || document.documentElement).appendChild(scriptEl);
                    scriptEl.remove();
                } catch(e) {
                    console.warn('MAIN world injection failed, trying isolated...');
                    new Function(code)();
                }
            },
            args: [scriptContent],
            world: 'MAIN'
        });
    } catch (error) {
        // Fallback to isolated world
        await chrome.scripting.executeScript({
            target: {tabId: tabId, allFrames: true},
            func: (code) => {
                try {
                    new Function(code)();
                } catch(e) {
                    console.error('Isolated world execution error:', e);
                }
            },
            args: [scriptContent],
            world: 'ISOLATED'
        });
    }
}

chrome.tabs.onActivated.addListener(e => {
    updateScriptCountBadge(e.tabId)
}), chrome.tabs.onUpdated.addListener((e, t, r) => {
    "complete" === t.status && updateScriptCountBadge(e)
}), chrome.tabs.onUpdated.addListener(async (e, t, r) => {
    if ("loading" === t.status && r.url) {
        t = [/^chrome:\/\//, /^chrome-extension:\/\//, /^moz-extension:\/\//, /^about:/, /^edge:/, /^opera:/, /^extension:/, /^file:\/\/.*\/AppData\/Local\//, /^https:\/\/chrome\.google\.com\/webstore/, /^https:\/\/addons\.mozilla\.org/, /^https:\/\/microsoftedge\.microsoft\.com\/addons/].some(e => e.test(r.url));
        if (!t) {
            t = (await getScripts()).filter(e => isScriptMatchingUrl(e, r.url));
            if (0 < t.length) {
                updateScriptCountBadge(e);
                for (var c of t) injectScript(e, c)
            } else chrome.action.setBadgeText({
                tabId: e,
                text: ""
            })
        }
    }
}), chrome.runtime.onMessage.addListener((c, e, o) => {
    try {
        if ("getScripts" === c.action) getScripts().then(e => o({
            scripts: e
        })).catch(e => o({
            error: e.message
        }));
        else if ("getMatchedScripts" === c.action) getScripts().then(e => {
            let t = c.url;
            e = e.filter(e => isScriptMatchingUrl(e, t));
            o({
                scripts: e
            })
        }).catch(e => o({
            error: e.message
        }));
        else if ("getScriptContent" === c.action) getScripts().then(e => {
            e = e.find(e => e.id === c.scriptId);
            o(e ? {
                content: e.content
            } : {
                error: "Script not found"
            })
        }).catch(e => o({
            error: e.message
        }));
        else if ("addScript" === c.action) {
            var t = c.scriptContent;
            let e;
            try {
                saveScript({
                    content: t,
                    metadata: e = (e = (e = parseZedataBlock(t)) || parseUserscriptMetadata(t)) || {
                        name: "Untitled Script",
                        version: "1.0",
                        match: ["*://*/*"]
                    }
                }).then(e => o({
                    success: !0,
                    scriptId: e.id,
                    name: e.metadata.name
                })).catch(e => o({
                    success: !1,
                    error: e.message
                }))
            } catch (e) {
                console.error("Error parsing script:", e), o({
                    success: !1,
                    error: "Error parsing script: " + e.message
                })
            }
        } else if ("updateScriptContent" === c.action) getScripts().then(t => {
            t = t.find(e => e.id === c.scriptId);
            if (t) {
                t.content = c.scriptContent;
                try {
                    let e = parseZedataBlock(c.scriptContent);
                    (e = e || parseUserscriptMetadata(c.scriptContent)) && (t.metadata = e)
                } catch (e) {
                    console.warn("Could not update metadata:", e)
                }
                return saveScript(t)
            }
            throw new Error("Script not found")
        }).then(e => o({
            success: !0,
            scriptId: e.id,
            name: e.metadata.name
        })).catch(e => o({
            success: !1,
            error: e.message
        }));
        else if ("removeScript" === c.action) removeScript(c.scriptId).then(() => o({
            success: !0
        })).catch(e => o({
            success: !1,
            error: e.message
        }));
        else if ("toggleScriptEnabled" === c.action || "toggleScript" === c.action) {
            let {
                scriptId: t,
                enabled: r
            } = c;
            getScripts().then(e => {
                e = e.find(e => e.id === t);
                if (e) return e.enabled = r, saveScript(e);
                throw new Error("Script not found")
            }).then(() => {
                o({
                    success: !0
                }), chrome.tabs.query({
                    active: !0,
                    currentWindow: !0
                }, e => {
                    e && e[0] && updateScriptCountBadge(e[0].id)
                })
            }).catch(e => o({
                success: !1,
                error: e.message
            }))
        } else if ("setInjectionState" === c.action) {
            let t = c.enabled;
            chrome.storage.sync.set({
                injectionEnabled: t
            }, () => {
                o({
                    success: !0
                }), chrome.tabs.query({}, e => {
                    e.forEach(e => {
                        t ? updateScriptCountBadge(e.id) : chrome.action.setBadgeText({
                            tabId: e.id,
                            text: ""
                        })
                    })
                })
            })
        } else if ("openScriptInEditor" === c.action) try {
            chrome.storage.local.set({
                tempScriptContent: c.scriptContent
            }, () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL("editor/editor.html?loadTemp=true")
                }), o({
                    success: !0
                })
            })
        } catch (e) {
            console.error("Error opening editor:", e), o({
                success: !1,
                error: e.message
            })
        } else if (c.action === "getScriptsForCurrentPage") {
            getScripts().then(scripts => {
                const matchedScripts = scripts.filter(script => 
                    script.enabled && isScriptMatchingUrl(script, c.url)
                );
                
                // Send scripts to content script for safe injection
                matchedScripts.forEach(script => {
                    chrome.tabs.sendMessage(e.tab.id, {
                        action: "injectScript",
                        scriptContent: script.content
                    });
                });
                
                o({ count: matchedScripts.length });
            }).catch(error => o({ error: error.message }));
            return true;
        } else if ("getMatchedScripts" === c.action) getScripts().then(e => {
            let t = c.url;
            e = e.filter(e => isScriptMatchingUrl(e, t));
            o({
                scripts: e
            })
        }).catch(e => o({
            error: e.message
        }));
        else if ("getScriptContent" === c.action) getScripts().then(e => {
            e = e.find(e => e.id === c.scriptId);
            o(e ? {
                content: e.content
            } : {
                error: "Script not found"
            })
        }).catch(e => o({
            error: e.message
        }));
        else if ("addScript" === c.action) {
            var t = c.scriptContent;
            let e;
            try {
                saveScript({
                    content: t,
                    metadata: e = (e = (e = parseZedataBlock(t)) || parseUserscriptMetadata(t)) || {
                        name: "Untitled Script",
                        version: "1.0",
                        match: ["*://*/*"]
                    }
                }).then(e => o({
                    success: !0,
                    scriptId: e.id,
                    name: e.metadata.name
                })).catch(e => o({
                    success: !1,
                    error: e.message
                }))
            } catch (e) {
                console.error("Error parsing script:", e), o({
                    success: !1,
                    error: "Error parsing script: " + e.message
                })
            }
        } else if ("updateScriptContent" === c.action) getScripts().then(t => {
            t = t.find(e => e.id === c.scriptId);
            if (t) {
                t.content = c.scriptContent;
                try {
                    let e = parseZedataBlock(c.scriptContent);
                    (e = e || parseUserscriptMetadata(c.scriptContent)) && (t.metadata = e)
                } catch (e) {
                    console.warn("Could not update metadata:", e)
                }
                return saveScript(t)
            }
            throw new Error("Script not found")
        }).then(e => o({
            success: !0,
            scriptId: e.id,
            name: e.metadata.name
        })).catch(e => o({
            success: !1,
            error: e.message
        }));
        else if ("removeScript" === c.action) removeScript(c.scriptId).then(() => o({
            success: !0
        })).catch(e => o({
            success: !1,
            error: e.message
        }));
        else if ("toggleScriptEnabled" === c.action || "toggleScript" === c.action) {
            let {
                scriptId: t,
                enabled: r
            } = c;
            getScripts().then(e => {
                e = e.find(e => e.id === t);
                if (e) return e.enabled = r, saveScript(e);
                throw new Error("Script not found")
            }).then(() => {
                o({
                    success: !0
                }), chrome.tabs.query({
                    active: !0,
                    currentWindow: !0
                }, e => {
                    e && e[0] && updateScriptCountBadge(e[0].id)
                })
            }).catch(e => o({
                success: !1,
                error: e.message
            }))
        } else if ("setInjectionState" === c.action) {
            let t = c.enabled;
            chrome.storage.sync.set({
                injectionEnabled: t
            }, () => {
                o({
                    success: !0
                }), chrome.tabs.query({}, e => {
                    e.forEach(e => {
                        t ? updateScriptCountBadge(e.id) : chrome.action.setBadgeText({
                            tabId: e.id,
                            text: ""
                        })
                    })
                })
            })
        } else if ("openScriptInEditor" === c.action) try {
            chrome.storage.local.set({
                tempScriptContent: c.scriptContent
            }, () => {
                chrome.tabs.create({
                    url: chrome.runtime.getURL("editor/editor.html?loadTemp=true")
                }), o({
                    success: !0
                })
            })
        } catch (e) {
            console.error("Error opening editor:", e), o({
                success: !1,
                error: e.message
            })
        } else o({
            error: "Unknown action"
        });
        return !0
    } catch (e) {
        console.error("Error handling message:", e), o({
            error: e.message
        })
    }
    return !1
}), chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "reload-without-scripts",
        title: "Reload page without scripts",
        contexts: ["action"]
    }), chrome.contextMenus.create({
        id: "extension-options",
        title: "Extension options",
        contexts: ["action"]
    })
}), chrome.contextMenus.onClicked.addListener((e, r) => {
    "reload-without-scripts" === e.menuItemId ? chrome.storage.sync.get("injectionEnabled", e => {
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
                    })
                }, 500)
            })
        })
    }) : "extension-options" === e.menuItemId && chrome.runtime.openOptionsPage()
});

// Listen for injection messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle script injection
    if (message.action === "injectScript" && message.resourcePath) {
        chrome.storage.local.get('injectionEnabled', result => {
            if (result.injectionEnabled === false) return;
            
            const injectPrimary = () => {
                try {
                    const existingScript = document.querySelector('script[nonce]');
                    const nonce = existingScript?.nonce || '';
                    
                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL(message.resourcePath);
                    script.setAttribute('nonce', nonce);
                    script.setAttribute('type', 'module');
                    script.crossOrigin = 'anonymous';

                    const clone = script.cloneNode(true);
                    (document.head || document.documentElement).appendChild(clone);

                    clone.onload = () => {
                        clone.remove();
                        sendResponse({ success: true });
                    };

                    clone.onerror = () => {
                        console.warn('Primary script injection failed, trying fallback...');
                        injectFallback(); // Intenta la alternativa si falla
                    };
                } catch (error) {
                    console.error('Primary injection exception:', error);
                    injectFallback(); // En caso de excepción
                }
            };

            const injectFallback = () => {
                try {
                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL(message.resourcePath);
                    script.type = 'text/javascript';

                    const existingNonce = document.querySelector('script[nonce]')?.nonce || '';
                    if (existingNonce) script.nonce = existingNonce;

                    const clone = script.cloneNode(true);
                    (document.head || document.documentElement).appendChild(clone);
                    clone.remove();

                    sendResponse({ success: true });
                } catch (fallbackError) {
                    console.error('Fallback injection also failed:', fallbackError);
                    sendResponse({ success: false });
                }
            };

            // Asegurar contexto adecuado
            if (document.contentType === 'text/html') {
                injectPrimary();
            } else {
                const blob = new Blob([`(${injectPrimary.toString()})()`], {type: 'text/javascript'});
                const url = URL.createObjectURL(blob);
                import(url).finally(() => URL.revokeObjectURL(url));
            }
        });
        
        return true; // Mantener canal abierto
    }
    
    // Handle userscript detection
    if (message.action === "detectUserscript") {
        let result = detectUserscripts();
        sendResponse(result);
        
        if (result.detected && result.scriptContent) {
            chrome.storage.sync.get("autoShowInstallUI", e => {
                if (e.autoShowInstallUI !== false) {
                    createInstallUI(result);
                }
            });
        }
        return true;
    }
    
    // Handle script installation
    if (message.action === "installScript") {
        if (message.scriptContent) {
            createInstallUI({
                scriptContent: message.scriptContent
            });
        } else if (message.scriptUrl) {
            fetchScript(message.scriptUrl).then(content => {
                if (content && content.error) {
                    if (!content.contextInvalidated) {
                        showNotification("Error fetching script: " + content.message, true);
                    }
                } else if (content) {
                    createInstallUI({
                        scriptContent: content
                    });
                } else {
                    showNotification("Failed to fetch script content", true);
                }
            });
        }
        return true;
    }
    
    // Handle scripts for current page
    if (message.action === "getScriptsForCurrentPage") {
        // This is handled by the initial injection code
        return false;
    }
});

function detectUserscripts() {
    var e;
    for (e of document.querySelectorAll("script")) {
        var t = e.textContent || "";
        if (t.includes("// ==UserScript==") && t.includes("// ==/UserScript==")) return {
            detected: !0,
            scriptContent: t
        }
    }
    var o = document.querySelectorAll('a[href$=".user.js"]');
    return 0 < o.length ? {
        detected: !0,
        scriptLinks: Array.from(o).map(e => ({
            url: e.href,
            text: e.textContent || e.href
        }))
    } : {
        detected: !1
    }
}

function createInstallUI(o) {
    var e = document.getElementById("zedmonkey-install-ui");
    e && e.remove();
    let t = document.createElement("div"),
        r = (t.id = "zedmonkey-install-ui", t.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #2c3e50;
    color: white;
    z-index: 2147483647;
    font-family: 'Segoe UI', Arial, sans-serif;
    padding: 15px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 3px 15px rgba(0,0,0,0.4);
    border-bottom: 2px solid #3498db;
    max-height: 80vh;
    overflow-y: auto;
`, "Userscript"),
        n = "1.0",
        s = "",
        i = "";
    o.scriptContent && ((e = o.scriptContent.match(/@name\s+(.+?)(\n|$)/)) && (r = e[1].trim()), (e = o.scriptContent.match(/@version\s+(.+?)(\n|$)/)) && (n = e[1].trim()), (e = o.scriptContent.match(/@author\s+(.+?)(\n|$)/)) && (s = e[1].trim()), e = o.scriptContent.match(/@description\s+(.+?)(\n|$)/)) && (i = e[1].trim());
    
    // Header section with icon and title
    let headerSection = document.createElement("div");
    headerSection.style.cssText = `
        display: flex;
        align-items: center;
        margin-bottom: 15px;
    `;
    
    // Icon container
    let iconContainer = document.createElement("div");
    iconContainer.style.cssText = `
        width: 40px;
        height: 40px;
        margin-right: 15px;
        flex-shrink: 0;
    `;
    
    // Icon
    let icon = document.createElement("div");
    icon.style.cssText = `
        width: 40px;
        height: 40px;
        background-image: url(${chrome.runtime.getURL("icons/icon48.png")});
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        border-radius: 8px;
        background-color: #3498db;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 20px;
        color: white;
    `;
    
    // Add a fallback text in case the image doesn't load
    icon.textContent = "Z";
    
    // Try to load the icon with different paths
    const tryLoadIcon = (paths) => {
        if (paths.length === 0) return;
        
        const path = paths[0];
        const img = new Image();
        img.onload = () => {
            icon.style.backgroundImage = `url(${chrome.runtime.getURL(path)})`;
            icon.textContent = ""; // Clear the fallback text
        };
        img.onerror = () => {
            console.log(`Failed to load icon from: ${path}`);
            tryLoadIcon(paths.slice(1));
        };
        img.src = chrome.runtime.getURL(path);
    };
    
    // Try different possible paths for the icon
    tryLoadIcon([
        "icons/icon48.png",
        "../icons/icon48.png",
        "icon48.png",
        "images/icon48.png",
        "/icons/icon48.png"
    ]);
    
    iconContainer.appendChild(icon);
    
    // Title container
    let titleContainer = document.createElement("div");
    titleContainer.style.cssText = `
        flex: 1;
        display: flex;
        flex-direction: column;
    `;
    
    // Main title
    let mainTitle = document.createElement("div");
    mainTitle.textContent = "Instalando script";
    mainTitle.style.cssText = `
        font-weight: bold;
        font-size: 16px;
        color: white;
    `;
    
    // Script name
    let scriptName = document.createElement("div");
    scriptName.textContent = `${r}, ${n}`;
    scriptName.style.cssText = `
        font-size: 14px;
        font-weight: 500;
        color: #3498db;
    `;
    
    titleContainer.appendChild(mainTitle);
    titleContainer.appendChild(scriptName);
    
    headerSection.appendChild(iconContainer);
    headerSection.appendChild(titleContainer);
    
    // Script info section
    let infoSection = document.createElement("div");
    infoSection.style.cssText = `
        display: flex;
        flex-direction: column;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
    `;
    
    
    // Description
    let descriptionInfo = document.createElement("div");
    descriptionInfo.style.cssText = `
        margin-bottom: 8px;
    `;
    
    let descriptionText = document.createElement("div");
    descriptionText.textContent = i || "Adds a button that scrolls to the top of each response on ChatGPT.com";
    descriptionText.style.cssText = `
        font-size: 13px;
        color: #ecf0f1;
    `;
    
    descriptionInfo.appendChild(descriptionText);
    
    // Metadata section
    let metadataSection = document.createElement("div");
    metadataSection.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 8px;
    `;
    
    // Grant metadata
    let grantInfo = document.createElement("div");
    grantInfo.style.cssText = `
        display: flex;
        flex-direction: column;
    `;
    
    let grantLabel = document.createElement("div");
    grantLabel.textContent = "@grant";
    grantLabel.style.cssText = `
        font-size: 12px;
        color: #7f8c8d;
    `;
    
    // Extract grant values from script content
    let grantValues = [];
    if (o.scriptContent) {
        const grantMatches = o.scriptContent.match(/@grant\s+(.+?)(\n|$)/g);
        if (grantMatches && grantMatches.length > 0) {
            grantValues = grantMatches.map(match => {
                const value = match.replace(/@grant\s+/, '').trim();
                return value;
            });
        }
    }
    
    let grantValue = document.createElement("div");
    grantValue.textContent = grantValues.length > 0 ? grantValues.join('\n') : "none";
    grantValue.style.cssText = `
        font-size: 12px;
        color: #ecf0f1;
    `;
    
    grantInfo.appendChild(grantLabel);
    grantInfo.appendChild(grantValue);
    
    // Match metadata
    let matchInfo = document.createElement("div");
    matchInfo.style.cssText = `
        display: flex;
        flex-direction: column;
    `;
    
    let matchLabel = document.createElement("div");
    matchLabel.textContent = "@match";
    matchLabel.style.cssText = `
        font-size: 12px;
        color: #7f8c8d;
    `;
    
    // Extract match values from script content
    let matchValues = [];
    if (o.scriptContent) {
        const matchMatches = o.scriptContent.match(/@match\s+(.+?)(\n|$)/g);
        const includeMatches = o.scriptContent.match(/@include\s+(.+?)(\n|$)/g);
        
        if (matchMatches && matchMatches.length > 0) {
            matchValues = matchMatches.map(match => {
                return match.replace(/@match\s+/, '').trim();
            });
        }
        
        if (includeMatches && includeMatches.length > 0) {
            const includeValues = includeMatches.map(match => {
                return match.replace(/@include\s+/, '').trim();
            });
            matchValues = [...matchValues, ...includeValues];
        }
    }
    
    let matchValue = document.createElement("div");
    matchValue.textContent = matchValues.length > 0 ? matchValues.join('\n') : "http://*/*\nhttps://*/*";
    matchValue.style.cssText = `
        font-size: 12px;
        color: #ecf0f1;
    `;
    
    matchInfo.appendChild(matchLabel);
    matchInfo.appendChild(matchValue);
    
    metadataSection.appendChild(grantInfo);
    metadataSection.appendChild(matchInfo);
    
    infoSection.appendChild(descriptionInfo);
    infoSection.appendChild(metadataSection);
    
    // Buttons section
    let buttonsSection = document.createElement("div");
    buttonsSection.style.cssText = `
        display: flex;
        gap: 5px;
        justify-content: flex-end;
        margin-top: 10px;
        padding: 8px;
        border-radius: 4px;
    `;
    
    // Install button
    let installButton = document.createElement("button");
    installButton.innerHTML = "Install <span style='opacity: 0.7; font-size: 11px; margin-left: 4px;'>(Ctrl+Enter)</span>";
    installButton.style.cssText = `
        background: #2c3e50;
        color: white;
        border: 1px solid #4CAF50;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
        display: flex;
        align-items: center;
    `;
    installButton.onmouseover = () => {
        installButton.style.background = "#374a5c";
    };
    installButton.onmouseout = () => {
        installButton.style.background = "#2c3e50";
    };
    
    // Cerrar button
    let cancelButton = document.createElement("button");
    cancelButton.textContent = "Cerrar";
    cancelButton.style.cssText = `
        background: #2c3e50;
        color: white;
        border: 1px solid #95a5a6;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
    `;
    cancelButton.onmouseover = () => {
        cancelButton.style.background = "#374a5c";
    };
    cancelButton.onmouseout = () => {
        cancelButton.style.background = "#2c3e50";
    };
    
    // Edit button
    let editButton = document.createElement("button");
    editButton.textContent = "Editar";
    editButton.style.cssText = `
        background: #2c3e50;
        color: white;
        border: 1px solid #f39c12;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
    `;
    editButton.onmouseover = () => {
        editButton.style.background = "#374a5c";
    };
    editButton.onmouseout = () => {
        editButton.style.background = "#2c3e50";
    };
    
    // Add a plus sign before each button text
    const addPlusSign = (button, color) => {
        const originalText = button.textContent || button.innerText;
        button.innerHTML = `<span style="color: ${color}; margin-right: 4px;">+</span>${originalText}`;
    };
    
    addPlusSign(cancelButton, "#95a5a6");
    addPlusSign(editButton, "#f39c12");
    
    // Change the order to match the image
    buttonsSection.appendChild(installButton);
    buttonsSection.appendChild(cancelButton);
    buttonsSection.appendChild(editButton);
    
    // Add all sections to main container
    t.appendChild(headerSection);
    t.appendChild(infoSection);
    t.appendChild(buttonsSection);
    
    // Download function
    function b() {
        var e = new Blob([o.scriptContent], {
                type: "text/javascript"
            }),
            e = URL.createObjectURL(e),
            t = document.createElement("a");
        t.href = e, t.download = r.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".user.js", document.body.appendChild(t), t.click(), document.body.removeChild(t), URL.revokeObjectURL(e)
    }
    
    // Button event listeners
    installButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({
            action: "addScript",
            scriptContent: o.scriptContent
        }, e => {
            e && e.success ? showNotification("Script instalado correctamente!") : showNotification("Error al instalar el script: " + (e?.error || "Error desconocido"), !0), t.remove()
        })
    });
    
    editButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({
            action: "openScriptInEditor",
            scriptContent: o.scriptContent
        }), t.remove()
    });
    
    cancelButton.addEventListener("click", () => {
        t.remove()
    });
    
    // Close button
    let closeButton = document.createElement("div");
    closeButton.innerHTML = "&times;";
    closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 15px;
        font-size: 20px;
        cursor: pointer;
        color: #95a5a6;
        transition: color 0.2s;
    `;
    closeButton.onmouseover = () => {
        closeButton.style.color = "#ffffff";
    };
    closeButton.onmouseout = () => {
        closeButton.style.color = "#95a5a6";
    };
    closeButton.onclick = () => {
        t.remove();
    };
    t.appendChild(closeButton);
    
    // Add to document
    document.body.appendChild(t);
}

async function fetchScript(r) {
  try {
      try {
          var e = await fetch(r);
          if (e.ok) return await e.text();
          throw new Error("Failed to fetch script")
      } catch (e) {
          return console.log("Direct fetch failed, trying XMLHttpRequest:", e), new Promise((e, t) => {
              let o = new XMLHttpRequest;
              o.open("GET", r, !0), o.onload = function() {
                  200 <= o.status && o.status < 300 ? e(o.responseText) : t(new Error("XHR failed with status: " + o.status))
              }, o.onerror = function() {
                  t(new Error("XHR network error"))
              }, o.send()
          })
      }
  } catch (e) {
      return e.message.includes("Extension context invalidated") || e.message.includes("context invalidated") ? (console.error("Extension context error. The extension may have been updated or reloaded."), showNotification("Extension was updated. Please refresh the page to use Zedmonkey features.", !0, 7e3), {
          error: !0,
          contextInvalidated: !0,
          message: "Extension context invalidated. Please refresh the page."
      }) : (console.error("Error fetching script:", e), {
          error: !0,
          message: e.message || "Unknown error"
      })
  }
}

function showNotification(e, t = !1, o = 3e3) {
  let r = document.createElement("div");
  r.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: ${t?"#f44336":"#4CAF50"};
  color: white;
  padding: 10px 20px;
  border-radius: 4px;
  z-index: 2147483647;
  font-family: 'Segoe UI', Arial, sans-serif;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  max-width: 80%;
  word-wrap: break-word;
`, r.textContent = e, document.body.appendChild(r), setTimeout(() => {
      r.style.opacity = "0", r.style.transition = "opacity 0.5s", setTimeout(() => r.remove(), 500)
  }, o)
}

function addUserscriptLinkHandlers() {
  document.querySelectorAll('a[href$=".user.js"]').forEach(o => {
      o.dataset.zedmonkeyHandled || (o.dataset.zedmonkeyHandled = "true", o.addEventListener("click", async e => {
          e.preventDefault(), e.stopPropagation();
          e = o.href;
          console.log("Intercepted userscript link click:", e);
          try {
              var t = await fetchScript(e);
              if (t && t.error) return t.contextInvalidated || showNotification("Error fetching script: " + t.message, !0), !1;
              t ? createInstallUI({
                  scriptContent: t
              }) : showNotification("Failed to fetch script content", !0)
          } catch (e) {
              console.error("Error in click handler:", e), showNotification("Error: " + (e.message || "Unknown error"), !0)
          }
          return !1
      }))
  })
}

// Initial injection for persisted scripts
chrome.storage.sync.get({ injectionEnabled: true }, ({ injectionEnabled }) => {
    if (injectionEnabled) {
        chrome.runtime.sendMessage({ 
            action: "getScriptsForCurrentPage",
            url: window.location.href
        });
    }
});

// Auto-detect scripts on page load
window.addEventListener("load", () => {
    chrome.storage.sync.get("autoDetectScripts", e => {
        if (e.autoDetectScripts !== false) {
            let t = detectUserscripts();
            if (t.detected) {
                chrome.runtime.sendMessage({
                    action: "scriptDetected",
                    scriptData: t
                });
                
                chrome.storage.sync.get("autoShowInstallUI", e => {
                    if (e.autoShowInstallUI !== false && t.scriptContent) {
                        createInstallUI(t);
                    }
                });
                
                if (t.scriptLinks && t.scriptLinks.length > 0) {
                    addUserscriptLinkHandlers();
                }
            }
        }
    });
});

// Set up mutation observer to detect new userscript links
let observer = new MutationObserver(e => {
  let t = !1;
  for (var o of e) {
      if ("childList" === o.type && o.addedNodes.length > 0) {
          t = !0;
          break;
      }
  }
  if (t) addUserscriptLinkHandlers();
});

function startObserver() {
  document.body ? observer.observe(document.body, {
      childList: !0,
      subtree: !0
  }) : window.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, {
          childList: !0,
          subtree: !0
      });
      addUserscriptLinkHandlers(); // Initial scan for userscript links
  });
}

startObserver();
// Removed the duplicate DOMContentLoaded listener that was at the end of the file

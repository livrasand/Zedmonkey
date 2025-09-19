/**
 * Content Script for Zedmonkey
 * Handles userscript detection, installation UI, and GM API bridge
 */

// Import GM API bridge for postMessage communication
const script = document.createElement('script');
script.src = chrome.runtime.getURL('content/gm-bridge.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

/**
 * Message handler for GM bridge communication from injected scripts
 */
window.addEventListener('message', async (event) => {
    // Only handle messages from the same window (injected scripts)
    if (event.source !== window) return;

    const data = event.data;
    if (!data || data.type !== 'ZEDMONKEY_BRIDGE_REQUEST') return;

    console.log('[Content Script] Received bridge request:', data.payload.action);

    try {
        // Forward the request to the background script
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(data.payload, (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });

        // Send response back to the injected script
        window.postMessage({
            type: 'ZEDMONKEY_BRIDGE_RESPONSE',
            requestId: data.payload.messageId,
            response
        }, '*');

    } catch (error) {
        console.error('[Content Script] Bridge request failed:', error);

        // Send error response back to the injected script
        window.postMessage({
            type: 'ZEDMONKEY_BRIDGE_RESPONSE',
            requestId: data.payload.messageId,
            error: error.message
        }, '*');
    }
});

/**
 * Message handler for background script communication
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        switch (message.action) {
            case "detectUserscript":
                handleUserscriptDetection(sendResponse);
                return true;
                
            case "installScript":
                handleScriptInstallation(message);
                return true;
                
            default:
                console.log('Content script: Unknown message action:', message.action);
                sendResponse({ error: 'Unknown action' });
                return false;
        }
    } catch (error) {
        console.error('Content script: Error handling message:', error);
        sendResponse({ error: error.message });
        return false;
    }
});

/**
 * Handles userscript detection requests from background
 * @param {Function} sendResponse - Response callback function
 */
function handleUserscriptDetection(sendResponse) {
    const result = detectUserscripts();
    sendResponse(result);
    
    if (result.detected && result.scriptContent) {
        chrome.storage.sync.get("autoShowInstallUI", (settings) => {
            if (settings.autoShowInstallUI !== false) {
                createInstallUI(result);
            }
        });
    }
}

/**
 * Handles script installation requests
 * @param {Object} message - Message containing script data
 */
function handleScriptInstallation(message) {
    if (message.scriptContent) {
        createInstallUI({ scriptContent: message.scriptContent });
    } else if (message.scriptUrl) {
        fetchScript(message.scriptUrl)
            .then(content => {
                if (content?.error && !content.contextInvalidated) {
                    showNotification(`Error fetching script: ${content.message}`, true);
                } else if (content) {
                    createInstallUI({ scriptContent: content });
                } else {
                    showNotification("Failed to fetch script content", true);
                }
            })
            .catch(error => {
                console.error('Content script: Error in script installation:', error);
                showNotification(`Installation error: ${error.message}`, true);
            });
    } else {
        showNotification("No script content or URL provided", true);
    }
}

/**
 * Detects userscripts embedded in the current page or linked via .user.js files
 * @returns {Object} Detection result with detected flag and script data
 */
function detectUserscripts() {
    const detectionResult = {
        detected: false,
        scriptContent: null,
        scriptLinks: []
    };
    
    try {
        // Check for embedded userscripts in script tags
        const scriptTags = document.querySelectorAll('script');
        for (const scriptTag of scriptTags) {
            const content = scriptTag.textContent || scriptTag.innerText || '';
            if (isValidUserscriptContent(content)) {
                return {
                    detected: true,
                    scriptContent: content
                };
            }
        }
        
        // Check for userscript links
        const userscriptLinks = document.querySelectorAll('a[href$=".user.js"], a[href*=".user.js?"]');
        if (userscriptLinks.length > 0) {
            return {
                detected: true,
                scriptLinks: Array.from(userscriptLinks).map(link => ({
                    url: link.href,
                    text: link.textContent?.trim() || link.href
                })).filter(link => link.url) // Remove empty URLs
            };
        }
        
    } catch (error) {
        console.error('detectUserscripts: Error during detection:', error);
    }
    
    return detectionResult;
}

/**
 * Validates if content appears to be a valid userscript
 * @param {string} content - Content to validate
 * @returns {boolean} True if content looks like a userscript
 */
function isValidUserscriptContent(content) {
    if (!content || typeof content !== 'string' || content.length < 50) {
        return false;
    }
    
    const hasStartMarker = content.includes('// ==UserScript==');
    const hasEndMarker = content.includes('// ==/UserScript==');
    const startIndex = content.indexOf('// ==UserScript==');
    const endIndex = content.indexOf('// ==/UserScript==');
    
    return hasStartMarker && hasEndMarker && startIndex < endIndex;
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

async function fetchScript(url) {
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'proxyRequest',
            url: url,
            method: 'GET'
        });
        if (response.success) {
            return response.content;
        } else {
            throw new Error(response.error || "Unknown proxy error");
        }
    } catch (error) {
        if (error.message.includes("Extension context invalidated") || error.message.includes("context invalidated")) {
            console.error("Extension context error. The extension may have been updated or reloaded.");
            showNotification("Extension was updated. Please refresh the page to use Zedmonkey features.", true, 7000);
            return {
                error: true,
                contextInvalidated: true,
                message: "Extension context invalidated. Please refresh the page."
            };
        } else {
            console.error("Error fetching script:", error);
            return {
                error: true,
                message: `Failed to fetch script from ${url}: ${error.message || "Unknown error"}`
            };
        }
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
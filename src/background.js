// Zedmonkey Background Script
// Handles script management and injection

// Storage functions
async function getScripts() {
  return new Promise((resolve) => {
    chrome.storage.local.get('scripts', (result) => {
      resolve(result.scripts || []);
    });
  });
}

async function saveScript(script) {
  return new Promise((resolve, reject) => {
    getScripts().then(scripts => {
      // Generate ID if not exists
      if (!script.id) {
        script.id = Date.now().toString();
      }
      
      // Set defaults
      script.enabled = script.enabled !== false;
      
      // Find existing script or add new one
      const existingIndex = scripts.findIndex(s => s.id === script.id);
      if (existingIndex >= 0) {
        scripts[existingIndex] = script;
      } else {
        scripts.push(script);
      }
      
      // Save to storage
      chrome.storage.local.set({ scripts }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(script);
        }
      });
    });
  });
}

async function removeScript(scriptId) {
  return new Promise((resolve, reject) => {
    getScripts().then(scripts => {
      const filteredScripts = scripts.filter(s => s.id !== scriptId);
      chrome.storage.local.set({ scripts: filteredScripts }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });
}

// Parsing functions
function parseZedataBlock(content) {
  try {
    // Look for Zedata block format: /* zedata { ... } */
    const zedataMatch = content.match(/\/\*\s*zedata\s*(\{[\s\S]*?\})\s*\*\//i);
    
    if (zedataMatch && zedataMatch[1]) {
      const zedataStr = zedataMatch[1];
      // Parse the JSON data
      const metadata = JSON.parse(zedataStr);
      
      // Ensure required fields exist
      return {
        name: metadata.name || "Untitled Script",
        version: metadata.version || "1.0",
        match: metadata.match || ["*://*/*"],
        description: metadata.description || "",
        author: metadata.author || "",
        ...metadata // Include any other metadata properties
      };
    }
    return null;
  } catch (error) {
    console.error('Error parsing Zedata block:', error);
    return null;
  }
}

function parseUserscriptMetadata(content) {
  try {
    // Look for traditional userscript metadata block
    const metadataBlock = content.match(/\/\/\s*==UserScript==\s*([\s\S]*?)\/\/\s*==\/UserScript==/i);
    
    if (!metadataBlock || !metadataBlock[1]) {
      return null;
    }
    
    const metadataLines = metadataBlock[1].split('\n');
    const metadata = {};
    
    // Process each metadata line
    metadataLines.forEach(line => {
      // Match @key value format
      const match = line.match(/\/\/\s*@(\w+)\s+(.*)/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].trim();
        
        // Handle multiple values for certain keys (like @match)
        if (['match', 'include', 'exclude', 'require', 'resource', 'grant'].includes(key)) {
          if (!metadata[key]) {
            metadata[key] = [];
          }
          metadata[key].push(value);
        } else {
          metadata[key] = value;
        }
      }
    });
    
    // Ensure required fields exist
    return {
      name: metadata.name || "Untitled Script",
      version: metadata.version || "1.0",
      match: metadata.match || metadata.include || ["*://*/*"],
      description: metadata.description || "",
      author: metadata.author || "",
      ...metadata // Include any other metadata properties
    };
  } catch (error) {
    console.error('Error parsing userscript metadata:', error);
    return null;
  }
}

// Check if a script should run on a given URL
function isScriptMatchingUrl(script, url) {
  if (!script.metadata || !script.metadata.match) {
    return false;
  }
  
  const matchPatterns = Array.isArray(script.metadata.match) ? 
    script.metadata.match : [script.metadata.match];
  
  return matchPatterns.some(pattern => {
    try {
      // Check if pattern is undefined or not a string
      if (!pattern || typeof pattern !== 'string') {
        console.error('Invalid match pattern:', pattern);
        return false;
      }
      
      // Convert match pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/^(\*:\/\/)/g, '^(https?|file|ftp)://');
      
      const regex = new RegExp(regexPattern);
      return regex.test(url);
    } catch (e) {
      console.error('Error matching URL pattern:', e);
      return false;
    }
  });
}

// Injection function
// Función para actualizar el badge con el número de scripts ejecutándose
function updateScriptCountBadge(tabId) {
  if (!tabId) return;

  // Obtener la URL de la pestaña
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab || !tab.url) return;

    // Verificar si es una página donde se pueden ejecutar scripts
    const restrictedPatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^about:/,
      /^edge:/,
      /^opera:/,
      /^extension:/,
      /^file:\/\/.*\/AppData\/Local\//,
      /^https:\/\/chrome\.google\.com\/webstore/,
      /^https:\/\/addons\.mozilla\.org/,
      /^https:\/\/microsoftedge\.microsoft\.com\/addons/
    ];

    const isRestricted = restrictedPatterns.some(pattern => pattern.test(tab.url));

    if (isRestricted) {
      // No mostrar badge en sitios restringidos
      chrome.action.setBadgeText({ tabId, text: '' });
      return;
    }

    // Verificar si la inyección está habilitada
    chrome.storage.sync.get('injectionEnabled', (result) => {
      const injectionEnabled = result.injectionEnabled !== false; // Default to true
      
      if (!injectionEnabled) {
        // No mostrar badge si la inyección está deshabilitada
        chrome.action.setBadgeText({ tabId, text: '' });
        return;
      }
      
      // Obtener scripts que coinciden con esta URL
      getScripts().then(scripts => {
        const matchedScripts = scripts.filter(script => 
          isScriptMatchingUrl(script, tab.url) && script.enabled !== false
        );
        
        if (matchedScripts.length > 0) {
          // Mostrar el número de scripts activos
          chrome.action.setBadgeText({ tabId, text: matchedScripts.length.toString() });
          chrome.action.setBadgeBackgroundColor({ tabId, color: '#3498db' });
        } else {
          // No hay scripts activos
          chrome.action.setBadgeText({ tabId, text: '' });
        }
      }).catch(error => {
        console.error('Error getting scripts for badge:', error);
        chrome.action.setBadgeText({ tabId, text: '' });
      });
    });
  });
}

// Actualizar el badge cuando cambia la pestaña activa
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateScriptCountBadge(activeInfo.tabId);
});

// Actualizar el badge cuando se actualiza una pestaña
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    updateScriptCountBadge(tabId);
  }
});

// Modificar la función injectScript para verificar si la inyección está habilitada
function injectScript(tabId, script) {
  // Check if injection is enabled
  chrome.storage.sync.get('injectionEnabled', (result) => {
    const injectionEnabled = result.injectionEnabled !== false; // Default to true
    
    if (!injectionEnabled) {
      console.log('Script injection is disabled');
      return;
    }
    
    // Only inject if script is enabled
    if (script.enabled !== false) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (scriptContent) => {
          try {
            // Create a new Function instead of using eval directly
            const scriptFunction = new Function(scriptContent);
            scriptFunction();
          } catch (e) {
            console.error('Script injection error:', e);
          }
        },
        args: [script.content]
      }).catch(err => console.error('Injection error:', err));
    }
  });
}

// Modificar el listener de tabs.onUpdated para verificar sitios restringidos
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    // Check if URL is restricted
    const restrictedPatterns = [
      /^chrome:\/\//,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^about:/,
      /^edge:/,
      /^opera:/,
      /^extension:/,
      /^file:\/\/.*\/AppData\/Local\//,
      /^https:\/\/chrome\.google\.com\/webstore/,
      /^https:\/\/addons\.mozilla\.org/,
      /^https:\/\/microsoftedge\.microsoft\.com\/addons/
    ];
    
    const isRestricted = restrictedPatterns.some(pattern => pattern.test(tab.url));
    
    if (isRestricted) {
      return; // Don't inject on restricted sites
    }
    
    const scripts = await getScripts();
    const matchingScripts = scripts.filter(script => 
      isScriptMatchingUrl(script, tab.url)
    );
    
    if (matchingScripts.length > 0) {
      // Update badge with script count
      updateScriptCountBadge(tabId);
      
      // Inject each matching script
      for (const script of matchingScripts) {
        injectScript(tabId, script);
      }
    } else {
      // Clear badge if no scripts match
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});

// Corregir el handler para toggleScriptEnabled
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Add proper error handling for all message handlers
  try {
    if (message.action === 'getScripts') {
      getScripts().then(scripts => sendResponse({ scripts }))
        .catch(error => sendResponse({ error: error.message }));
      return true;
    }
    
    if (message.action === 'getMatchedScripts') {
      getScripts().then(scripts => {
        const url = message.url;
        const matchedScripts = scripts.filter(script => isScriptMatchingUrl(script, url));
        sendResponse({ scripts: matchedScripts });
      }).catch(error => sendResponse({ error: error.message }));
      return true;
    }
    
    if (message.action === 'getScriptContent') {
      getScripts().then(scripts => {
        const script = scripts.find(s => s.id === message.scriptId);
        if (script) {
          sendResponse({ content: script.content });
        } else {
          sendResponse({ error: 'Script not found' });
        }
      }).catch(error => sendResponse({ error: error.message }));
      return true;
    }
    
    if (message.action === 'addScript') {
      const scriptContent = message.scriptContent;
      let metadata;
      
      try {
        // Try to parse as Zedata Block first
        metadata = parseZedataBlock(scriptContent);
        
        // If not found, try traditional userscript metadata
        if (!metadata) {
          metadata = parseUserscriptMetadata(scriptContent);
        }
        
        // If still no metadata, create default metadata
        if (!metadata) {
          metadata = {
            name: "Untitled Script",
            version: "1.0",
            match: ["*://*/*"]
          };
        }
        
        saveScript({
          content: scriptContent,
          metadata: metadata
        }).then(script => sendResponse({ 
          success: true, 
          scriptId: script.id, 
          name: script.metadata.name 
        }))
        .catch(error => sendResponse({ 
          success: false, 
          error: error.message 
        }));
      } catch (error) {
        console.error('Error parsing script:', error);
        sendResponse({ 
          success: false, 
          error: 'Error parsing script: ' + error.message 
        });
      }
      return true;
    }
    
    if (message.action === 'updateScriptContent') {
      getScripts().then(scripts => {
        const script = scripts.find(s => s.id === message.scriptId);
        if (script) {
          // Update content
          script.content = message.scriptContent;
          
          // Try to update metadata
          try {
            let metadata = parseZedataBlock(message.scriptContent);
            if (!metadata) {
              metadata = parseUserscriptMetadata(message.scriptContent);
            }
            
            if (metadata) {
              script.metadata = metadata;
            }
          } catch (error) {
            console.warn('Could not update metadata:', error);
            // Continue with existing metadata
          }
          
          return saveScript(script);
        }
        throw new Error('Script not found');
      })
      .then(script => sendResponse({ 
        success: true, 
        scriptId: script.id, 
        name: script.metadata.name 
      }))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message 
      }));
      return true;
    }
    
    if (message.action === 'removeScript') {
      removeScript(message.scriptId)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    
    if (message.action === 'toggleScriptEnabled' || message.action === 'toggleScript') {
      const { scriptId, enabled } = message;
      getScripts().then(scripts => {
        const script = scripts.find(s => s.id === scriptId);
        if (script) {
          script.enabled = enabled;
          return saveScript(script);
        }
        throw new Error('Script not found');
      })
      .then(() => {
        sendResponse({ success: true });
        // Update badge after toggling script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0]) {
            updateScriptCountBadge(tabs[0].id);
          }
        });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
    }
    
    if (message.action === 'setInjectionState') {
      const enabled = message.enabled;
      chrome.storage.sync.set({ injectionEnabled: enabled }, () => {
        sendResponse({ success: true });
        
        // Update badges on all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (enabled) {
              updateScriptCountBadge(tab.id);
            } else {
              // Clear badges when injection is disabled
              chrome.action.setBadgeText({ tabId: tab.id, text: '' });
            }
          });
        });
      });
      return true;
    }
    
    // Add this to your message listener in background.js
    if (message.action === 'openScriptInEditor') {
      try {
        // Store the script content temporarily
        chrome.storage.local.set({ 
          'tempScriptContent': message.scriptContent 
        }, () => {
          // Open the editor with a parameter to load the temp content
          chrome.tabs.create({
            url: chrome.runtime.getURL('editor/editor.html?loadTemp=true')
          });
          sendResponse({ success: true });
        });
      } catch (error) {
        console.error('Error opening editor:', error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
    
    // Default response for unknown actions
    sendResponse({ error: 'Unknown action' });
    return true;
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  return false;
});

// Crear el menú contextual cuando se instala la extensión
chrome.runtime.onInstalled.addListener(() => {
// Submenú: Recargar página sin scripts
chrome.contextMenus.create({
id: 'reload-without-scripts',
title: 'Reload page without scripts',
contexts: ['action']
});

// Submenú: Opciones de extensiones
chrome.contextMenus.create({
id: 'extension-options',
title: 'Extension options',
contexts: ['action']
});
});

// Manejar clics en el menú contextual
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'reload-without-scripts') {
    // Temporalmente deshabilitar scripts y recargar
    chrome.storage.sync.get('injectionEnabled', (result) => {
      const wasEnabled = result.injectionEnabled !== false;
      
      // Deshabilitar la inyección
      chrome.storage.sync.set({ injectionEnabled: false }, () => {
        // Recargar la página
        chrome.tabs.reload(tab.id, { bypassCache: true }, () => {
          // Restaurar el estado anterior después de un breve retraso
          setTimeout(() => {
            chrome.storage.sync.set({ injectionEnabled: wasEnabled });
          }, 500);
        });
      });
    });
  } else if (info.menuItemId === 'extension-options') {
    chrome.runtime.openOptionsPage();
  }
});
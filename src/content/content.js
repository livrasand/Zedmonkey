// Zedmonkey Content Script
// Handles script detection and communication with the background script

// Detect userscripts in the page
function detectUserscripts() {
  // Look for script tags with userscript metadata
  const scripts = document.querySelectorAll('script');
  
  for (const script of scripts) {
    const content = script.textContent || '';
    
    // Check if it contains userscript metadata
    if (content.includes('// ==UserScript==') && content.includes('// ==/UserScript==')) {
      return {
        detected: true,
        scriptContent: content
      };
    }
  }
  
  // Check for links to userscripts
  const links = document.querySelectorAll('a[href$=".user.js"]');
  if (links.length > 0) {
    // We found links to userscripts, but we'll need to fetch them
    return {
      detected: true,
      scriptLinks: Array.from(links).map(link => ({
        url: link.href,
        text: link.textContent || link.href
      }))
    };
  }
  
  return { detected: false };
}

// Create installation UI
function createInstallUI(scriptData) {
  // Remove any existing UI
  const existingUI = document.getElementById('zedmonkey-install-ui');
  if (existingUI) {
    existingUI.remove();
  }
  
  // Create container
  const container = document.createElement('div');
  container.id = 'zedmonkey-install-ui';
  container.style.cssText = `
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
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 3px 15px rgba(0,0,0,0.4);
    border-bottom: 2px solid #3498db;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  // Parse script metadata
  let scriptName = 'Userscript';
  let scriptVersion = '1.0';
  let scriptAuthor = '';
  let scriptDescription = '';
  
  if (scriptData.scriptContent) {
    // More robust metadata extraction with multiline support
    const nameMatch = scriptData.scriptContent.match(/@name\s+(.+?)(\n|$)/);
    if (nameMatch) scriptName = nameMatch[1].trim();
    
    const versionMatch = scriptData.scriptContent.match(/@version\s+(.+?)(\n|$)/);
    if (versionMatch) scriptVersion = versionMatch[1].trim();
    
    const authorMatch = scriptData.scriptContent.match(/@author\s+(.+?)(\n|$)/);
    if (authorMatch) scriptAuthor = authorMatch[1].trim();
    
    const descMatch = scriptData.scriptContent.match(/@description\s+(.+?)(\n|$)/);
    if (descMatch) scriptDescription = descMatch[1].trim();
  }
  
  // Create left section with logo and info
  const leftSection = document.createElement('div');
  leftSection.style.cssText = `
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 300px;
    margin-bottom: 10px;
  `;
  
  // Create logo container
  const logoContainer = document.createElement('div');
  logoContainer.style.cssText = `
    display: flex;
    align-items: center;
    margin-right: 15px;
    flex-shrink: 0;
  `;
  
  // Create icon with better styling
  const icon = document.createElement('div');
  icon.style.cssText = `
    width: 40px;
    height: 40px;
    background-image: url(${chrome.runtime.getURL('../icons/icon48.png')});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  
  logoContainer.appendChild(icon);
  
  // Create info section with better styling
  const info = document.createElement('div');
  info.style.cssText = `
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  `;
  
  const title = document.createElement('div');
  title.textContent = 'Zedmonkey - Instalación de Script';
  title.style.cssText = `
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 6px;
    color: #3498db;
  `;
  
  const scriptInfo = document.createElement('div');
  scriptInfo.textContent = `${scriptName} (v${scriptVersion})`;
  scriptInfo.style.cssText = `
    font-size: 14px;
    font-weight: 500;
  `;
  
  const sourceInfo = document.createElement('div');
  sourceInfo.textContent = scriptAuthor ? `por ${scriptAuthor}` : '';
  sourceInfo.style.cssText = `
    font-size: 12px;
    opacity: 0.8;
    margin-top: 2px;
  `;
  
  const descriptionInfo = document.createElement('div');
  if (scriptDescription) {
    descriptionInfo.textContent = scriptDescription;
    descriptionInfo.style.cssText = `
      font-size: 12px;
      margin-top: 5px;
      max-width: 500px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.9;
    `;
    
    // Add tooltip for full description
    descriptionInfo.title = scriptDescription;
  }
  
  info.appendChild(title);
  info.appendChild(scriptInfo);
  if (scriptAuthor) info.appendChild(sourceInfo);
  if (scriptDescription) info.appendChild(descriptionInfo);
  
  // Create buttons with better styling
  const buttons = document.createElement('div');
  buttons.style.cssText = `
    display: flex;
    gap: 12px;
    align-items: center;
  `;
  
  const installButton = document.createElement('button');
  installButton.textContent = 'Instalar';
  installButton.style.cssText = `
    background: #4CAF50;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  installButton.onmouseover = () => { installButton.style.background = '#45a049'; };
  installButton.onmouseout = () => { installButton.style.background = '#4CAF50'; };
  
  const downloadButton = document.createElement('button');
  downloadButton.textContent = 'Descargar';
  downloadButton.style.cssText = `
    background: #3498db;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  downloadButton.onmouseover = () => { downloadButton.style.background = '#2980b9'; };
  downloadButton.onmouseout = () => { downloadButton.style.background = '#3498db'; };
  
  const installAndDownloadButton = document.createElement('button');
  installAndDownloadButton.textContent = 'Instalar y Descargar';
  installAndDownloadButton.style.cssText = `
    background: #9b59b6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  installAndDownloadButton.onmouseover = () => { installAndDownloadButton.style.background = '#8e44ad'; };
  installAndDownloadButton.onmouseout = () => { installAndDownloadButton.style.background = '#9b59b6'; };
  
  const editButton = document.createElement('button');
  editButton.textContent = 'Editar';
  editButton.style.cssText = `
    background: #f39c12;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  editButton.onmouseover = () => { editButton.style.background = '#e67e22'; };
  editButton.onmouseout = () => { editButton.style.background = '#f39c12'; };
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancelar';
  cancelButton.style.cssText = `
    background: #95a5a6;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background 0.2s;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  `;
  cancelButton.onmouseover = () => { cancelButton.style.background = '#7f8c8d'; };
  cancelButton.onmouseout = () => { cancelButton.style.background = '#95a5a6'; };
  
  // Function to download the script
  function downloadScript() {
    const blob = new Blob([scriptData.scriptContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scriptName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.user.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Add event listeners
  installButton.addEventListener('click', () => {
    // Install the script directly
    chrome.runtime.sendMessage({
      action: 'addScript',
      scriptContent: scriptData.scriptContent
    }, (response) => {
      if (response && response.success) {
        showNotification('Script instalado correctamente!');
      } else {
        showNotification('Error al instalar el script: ' + (response?.error || 'Error desconocido'), true);
      }
      container.remove();
    });
  });
  
  downloadButton.addEventListener('click', () => {
    // Just download the script
    downloadScript();
    showNotification('Script descargado correctamente!');
    container.remove();
  });
  
  installAndDownloadButton.addEventListener('click', () => {
    // Install and download
    chrome.runtime.sendMessage({
      action: 'addScript',
      scriptContent: scriptData.scriptContent
    }, (response) => {
      if (response && response.success) {
        downloadScript();
        showNotification('Script instalado y descargado correctamente!');
      } else {
        showNotification('Error al instalar el script: ' + (response?.error || 'Error desconocido'), true);
        // Still try to download
        downloadScript();
      }
      container.remove();
    });
  });
  
  editButton.addEventListener('click', () => {
    // Open in editor
    chrome.runtime.sendMessage({
      action: 'openScriptInEditor',
      scriptContent: scriptData.scriptContent
    });
    container.remove();
  });
  
  cancelButton.addEventListener('click', () => {
    container.remove();
  });
  
  buttons.appendChild(installButton);
  buttons.appendChild(downloadButton);
  buttons.appendChild(installAndDownloadButton);
  buttons.appendChild(editButton);
  buttons.appendChild(cancelButton);
  
  // Assemble UI
  container.appendChild(logoContainer);
  container.appendChild(info);
  container.appendChild(buttons);
  
  // Add to page
  document.body.appendChild(container);
  
  // Add close button in the top right
  const closeButton = document.createElement('div');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 15px;
    font-size: 20px;
    cursor: pointer;
    color: #95a5a6;
    transition: color 0.2s;
  `;
  closeButton.onmouseover = () => { closeButton.style.color = '#ffffff'; };
  closeButton.onmouseout = () => { closeButton.style.color = '#95a5a6'; };
  closeButton.onclick = () => { container.remove(); };
  
  container.appendChild(closeButton);
}

// Fetch script content from URL
async function fetchScript(url) {
  try {
    // First try using fetch API
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch script');
      return await response.text();
    } catch (fetchError) {
      console.log('Direct fetch failed, trying XMLHttpRequest:', fetchError);
      
      // If fetch fails, try XMLHttpRequest as fallback
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error('XHR failed with status: ' + xhr.status));
          }
        };
        xhr.onerror = function() {
          reject(new Error('XHR network error'));
        };
        xhr.send();
      });
    }
  } catch (error) {
    // Check if this is an extension context invalidated error
    if (error.message.includes('Extension context invalidated') || 
        error.message.includes('context invalidated')) {
      console.error('Extension context error. The extension may have been updated or reloaded.');
      
      // Show a special notification to the user
      showNotification(
        'Extension was updated. Please refresh the page to use Zedmonkey features.',
        true,
        7000
      );
      
      // Return a special error object that our code can recognize
      return { 
        error: true, 
        contextInvalidated: true,
        message: 'Extension context invalidated. Please refresh the page.'
      };
    }
    
    console.error('Error fetching script:', error);
    return { 
      error: true, 
      message: error.message || 'Unknown error'
    };
  }
}

// Update the showNotification function to accept a duration parameter
function showNotification(message, isError = false, duration = 3000) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${isError ? '#f44336' : '#4CAF50'};
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 2147483647;
    font-family: 'Segoe UI', Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    max-width: 80%;
    word-wrap: break-word;
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => notification.remove(), 500);
  }, duration);
}

// Update the link click handler to handle the special error object
function addUserscriptLinkHandlers() {
  const links = document.querySelectorAll('a[href$=".user.js"]');
  
  links.forEach(link => {
    // Skip if we already added a handler
    if (link.dataset.zedmonkeyHandled) return;
    
    // Mark as handled to avoid duplicate handlers
    link.dataset.zedmonkeyHandled = 'true';
    
    // Add click event listener
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const scriptUrl = link.href;
      console.log('Intercepted userscript link click:', scriptUrl);
      
      try {
        const content = await fetchScript(scriptUrl);
        
        // Check if we got an error object instead of script content
        if (content && content.error) {
          if (content.contextInvalidated) {
            // We already showed a notification in fetchScript
            return false;
          }
          
          showNotification('Error fetching script: ' + content.message, true);
          return false;
        }
        
        if (content) {
          createInstallUI({ scriptContent: content });
        } else {
          showNotification('Failed to fetch script content', true);
        }
      } catch (error) {
        console.error('Error in click handler:', error);
        showNotification('Error: ' + (error.message || 'Unknown error'), true);
      }
      
      return false;
    });
  });
}

// Also update the installScript message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'detectUserscript') {
    const result = detectUserscripts();
    sendResponse(result);
    
    // If script is detected and auto-install UI is enabled, show it
    if (result.detected && result.scriptContent) {
      // Check if we should show the install UI
      chrome.storage.sync.get('autoShowInstallUI', (data) => {
        if (data.autoShowInstallUI !== false) {
          createInstallUI(result);
        }
      });
    }
  }
  
  if (message.action === 'installScript') {
    if (message.scriptContent) {
      createInstallUI({ scriptContent: message.scriptContent });
    } else if (message.scriptUrl) {
      fetchScript(message.scriptUrl).then(content => {
        // Check if we got an error object
        if (content && content.error) {
          if (!content.contextInvalidated) {
            showNotification('Error fetching script: ' + content.message, true);
          }
          return;
        }
        
        if (content) {
          createInstallUI({ scriptContent: content });
        } else {
          showNotification('Failed to fetch script content', true);
        }
      });
    }
  }
});

// Run detection on page load
window.addEventListener('load', () => {
  // Check if we should auto-detect scripts
  chrome.storage.sync.get('autoDetectScripts', (data) => {
    if (data.autoDetectScripts !== false) {
      const result = detectUserscripts();
      
      if (result.detected) {
        // Notify background script about detected script
        chrome.runtime.sendMessage({
          action: 'scriptDetected',
          scriptData: result
        });
        
        // Check if we should show the install UI
        chrome.storage.sync.get('autoShowInstallUI', (data) => {
          if (data.autoShowInstallUI !== false && result.scriptContent) {
            createInstallUI(result);
          }
        });
        
        // Add click handlers to script links if present
        if (result.scriptLinks && result.scriptLinks.length > 0) {
          addUserscriptLinkHandlers();
        }
      }
    }
  });
});

// Use MutationObserver to detect new links added to the page
const observer = new MutationObserver((mutations) => {
  let shouldCheck = false;
  
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      shouldCheck = true;
      break;
    }
  }
  
  if (shouldCheck) {
    addUserscriptLinkHandlers();
  }
});

// Start observing the document only when body is available
function startObserver() {
  if (document.body) {
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  } else {
    // If body is not available yet, wait for it
    window.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    });
  }
}

// Call startObserver instead of directly observing
startObserver();

// Call the handler on DOMContentLoaded as well
document.addEventListener('DOMContentLoaded', addUserscriptLinkHandlers);

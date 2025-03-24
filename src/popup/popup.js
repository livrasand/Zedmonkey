// Zedmonkey Popup Script
// Handles the popup UI and interactions

// Define functions outside of event listeners
/**
 * Open options page
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}

/**
 * Initialize UI and set up event listeners for the new interface
 */
// Update the initializeUI function to use the new add-script button
function initializeUI() {
  // Set up event listeners for header controls
  document.getElementById('folder-button').addEventListener('click', toggleAllScriptsView);
  document.getElementById('cloud-button').addEventListener('click', toggleUpdatesView);
  document.getElementById('refresh-button').addEventListener('click', refreshPopup);
  document.getElementById('injection-toggle').addEventListener('change', toggleInjection);
  document.getElementById('open-extension-page').addEventListener('click', openExtensionPage);
  // Eliminamos el event listener para install-script
  
  // Set up event listeners for script actions
  document.getElementById('add-script').addEventListener('click', showAddScriptForm);
  document.getElementById('import-script').addEventListener('click', importScript);
  
  // Check injection state
  chrome.storage.sync.get('injectionEnabled', (result) => {
    const injectionEnabled = result.injectionEnabled !== false; // Default to true
    document.getElementById('injection-toggle').checked = injectionEnabled;
  });

  // Check if the current site is restricted
  checkRestrictedSite();
  
  // Check if there are no scripts for this page
  checkForNoScripts();

  // Check for available updates
  checkForUpdates();
}

/**
 * Toggle between matched scripts view and all scripts view
 */
function toggleAllScriptsView() {
  const allScriptsView = document.getElementById('all-scripts-view');
  const matchedScriptsView = document.getElementById('matched-scripts-view');
  const updatesView = document.getElementById('updates-view');

  if (allScriptsView.classList.contains('hidden')) {
    // Show all scripts view
    allScriptsView.classList.remove('hidden');
    matchedScriptsView.classList.add('hidden');
    updatesView.classList.add('hidden');
    loadAllScripts();
  } else {
    // Show matched scripts view
    allScriptsView.classList.add('hidden');
    matchedScriptsView.classList.remove('hidden');
    updatesView.classList.add('hidden');
    loadMatchedScripts();
  }
}

/**
 * Toggle between matched scripts view and updates view
 */
function toggleUpdatesView() {
  const updatesView = document.getElementById('updates-view');
  const matchedScriptsView = document.getElementById('matched-scripts-view');
  const allScriptsView = document.getElementById('all-scripts-view');

  if (updatesView.classList.contains('hidden')) {
    // Show updates view
    updatesView.classList.remove('hidden');
    matchedScriptsView.classList.add('hidden');
    allScriptsView.classList.add('hidden');
    loadUpdates();
  } else {
    // Show matched scripts view
    updatesView.classList.add('hidden');
    matchedScriptsView.classList.remove('hidden');
    allScriptsView.classList.add('hidden');
    loadMatchedScripts();
  }
}

/**
 * Refresh the popup content
 */
/**
 * Check if the current page is a restricted site where scripts can't run
 */
function checkRestrictedSite() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      console.error('No active tab found');
      return;
    }
    
    const url = tabs[0].url;
    const restrictedPatterns = [
      /^chrome:\/\//,           // Chrome browser UI
      /^chrome-extension:\/\//,  // Chrome extensions
      /^moz-extension:\/\//,     // Firefox extensions
      /^about:/,                // Browser pages
      /^edge:/,                 // Edge browser pages
      /^opera:/,                // Opera browser pages
      /^extension:/,            // Generic extension pages
      /^file:\/\/.*\/AppData\/Local\//, // Local extension files
      /^https:\/\/chrome\.google\.com\/webstore/,  // Chrome Web Store
      /^https:\/\/addons\.mozilla\.org/,           // Firefox Add-ons
      /^https:\/\/microsoftedge\.microsoft\.com\/addons/  // Edge Add-ons
    ];
    
    // Check if the URL matches any restricted pattern
    const isRestricted = restrictedPatterns.some(pattern => pattern.test(url));
    
    // Show or hide the restricted site alert
    const restrictedAlert = document.getElementById('restricted-site-alert');
    if (isRestricted) {
      restrictedAlert.classList.remove('hidden');
      
      // Hide the matched scripts view and show a message
      const matchedScriptsList = document.getElementById('matched-scripts-list');
      matchedScriptsList.innerHTML = '<div class="empty-state">Scripts cannot run on this page</div>';
    } else {
      restrictedAlert.classList.add('hidden');
    }
  });
}

// Update the refreshPopup function to also check for restricted sites
function refreshPopup() {
  // Determine which view is currently active
  const updatesView = document.getElementById('updates-view');
  const allScriptsView = document.getElementById('all-scripts-view');

  if (!updatesView.classList.contains('hidden')) {
    loadUpdates();
  } else if (!allScriptsView.classList.contains('hidden')) {
    loadAllScripts();
  } else {
    loadMatchedScripts();
    // Check if there are no scripts for this page
    checkForNoScripts();
  }

  // Check for userscripts on the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      // Verificamos que el elemento userscript-alert existe antes de llamar a checkForUserscripts
      const userscriptAlert = document.getElementById('userscript-alert');
      if (userscriptAlert) {
        checkForUserscripts(tabs[0].url);
      }
    }
  });
  
  // Check if the current site is restricted
  checkRestrictedSite();

  // Check for updates
  checkForUpdates();
}

/**
 * Toggle script injection on/off
 */
function toggleInjection(event) {
  const enabled = event.target.checked;
  chrome.storage.sync.set({ injectionEnabled: enabled });
  
  // Notify background script about the change
  chrome.runtime.sendMessage({ 
    action: 'setInjectionState', 
    enabled: enabled 
  });
  
  // Actualizar el badge después de cambiar el estado
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      // Si está deshabilitado, limpiar el badge
      if (!enabled) {
        chrome.action.setBadgeText({ tabId: tabs[0].id, text: '' });
      } else {
        // Si está habilitado, actualizar el badge con el recuento actual
        chrome.runtime.sendMessage(
          { action: 'getMatchedScripts', url: tabs[0].url },
          (response) => {
            const scripts = response?.scripts || [];
            const enabledScripts = scripts.filter(script => script.enabled !== false);
            
            if (enabledScripts.length > 0) {
              chrome.action.setBadgeText({ 
                tabId: tabs[0].id, 
                text: enabledScripts.length.toString() 
              });
              chrome.action.setBadgeBackgroundColor({ 
                tabId: tabs[0].id, 
                color: '#3498db' 
              });
            }
          }
        );
      }
    }
  });
}

/**
 * Open the extension options page
 */
function openExtensionPage(e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
}

function openEditorPage(e) {
  e.preventDefault();
  // Open the editor in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor/editor.html')
  });
}

/**
 * Check if there's a userscript on the current page
 * @param {string} url - The URL of the current page
 */
function checkForUserscripts(url) {
  // Verificamos que el elemento userscript-alert existe
  const alert = document.getElementById('userscript-alert');
  if (!alert) {
    console.log('Userscript alert element not found in DOM');
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      console.error('No active tab found');
      return;
    }
    
    chrome.tabs.sendMessage(
      tabs[0].id, 
      { action: 'detectUserscript' }, 
      (response) => {
        if (chrome.runtime.lastError) {
          // This is expected if the content script isn't loaded
          console.log('Content script not ready:', chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.detected) {
          // Show the userscript alert
          alert.classList.remove('hidden');
          
          // Extract script name from content and display it
          const scriptName = extractScriptName(response.scriptContent);
          const nameElement = document.getElementById('detected-script-name');
          if (nameElement) {
            nameElement.textContent = scriptName || 'Unknown Script';
          }
          
          // Store the script content for installation
          alert.dataset.scriptContent = response.scriptContent;
        }
      }
    );
  });
}

/**
 * Extract script name from userscript content
 * @param {string} scriptContent - The content of the userscript
 * @returns {string} - The name of the script or null if not found
 */
function extractScriptName(scriptContent) {
  if (!scriptContent) return null;
  
  // Try to extract from userscript metadata
  const nameMatch = scriptContent.match(/@name\s+(.+?)(\n|$)/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  
  // Try to extract from Zedata Block if present
  const zedataMatch = scriptContent.match(/\[script\][\s\S]*?name\s*=\s*["'](.+?)["']/);
  if (zedataMatch && zedataMatch[1]) {
    return zedataMatch[1].trim();
  }
  
  return 'Unknown Script';
}

/**
 * Show the add script form
 */
function showAddScriptForm() {
  // Open the editor in a new tab instead of showing the form in the popup
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor/editor.html')
  });
}

/**
 * Hide the add script form
 */
function hideAddScriptForm() {
  document.getElementById('add-script-form').classList.add('hidden');
  document.getElementById('script-content').value = '';
  // Clear any stored script ID
  document.getElementById('script-content').dataset.scriptId = '';
}

/**
 * Save a new script
 */
function saveScript() {
  const scriptContent = document.getElementById('script-content').value.trim();
  const scriptId = document.getElementById('script-content').dataset.scriptId;
  
  if (!scriptContent) {
    alert('Please enter script content');
    return;
  }
  
  // Determine if we're updating or adding
  const action = scriptId ? 'updateScriptContent' : 'addScript';
  
  // Send to background script for processing
  chrome.runtime.sendMessage(
    { action, scriptContent, scriptId },
    (response) => {
      if (response.success) {
        hideAddScriptForm();
        refreshPopup();
      } else {
        alert(`Error ${scriptId ? 'updating' : 'adding'} script: ${response.error}`);
      }
    }
  );
}

/**
 * Import a script from file
 */
function importScript() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.js,.user.js';
  
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Store the script content temporarily in local storage
      chrome.storage.local.set({ 'tempScriptContent': e.target.result }, function() {
        // Open the editor with a parameter to load the temp content
        chrome.tabs.create({
          url: chrome.runtime.getURL('editor/editor.html?loadTemp=true')
        });
      });
    };
    reader.readAsText(file);
  };
  
  input.click();
}

/**
 * Install a detected userscript
 */
function installDetectedScript() {
  const alert = document.getElementById('userscript-alert');
  if (!alert) {
    console.error("Userscript alert element not found in DOM");
    return;
  }
  
  const scriptContent = alert.dataset.scriptContent;
  
  if (scriptContent) {
    console.log("Storing script content for editor:", scriptContent.substring(0, 100) + "...");
    
    // Store the script content temporarily in local storage
    chrome.storage.local.set({ 'tempScriptContent': scriptContent }, function() {
      if (chrome.runtime.lastError) {
        console.error("Error storing script content:", chrome.runtime.lastError);
        return;
      }
      
      // Open the editor with a parameter to load the temp content
      chrome.tabs.create({
        url: chrome.runtime.getURL('editor/editor.html?loadTemp=true')
      });
    });
    
    alert.classList.add('hidden');
  } else {
    console.error("No script content found in userscript-alert element");
  }
}

/**
 * Load and display all installed scripts
 */
function loadAllScripts() {
  const scriptsList = document.getElementById('all-scripts-list');
  
  // Request scripts from background
  chrome.runtime.sendMessage({ action: 'getScripts' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading scripts:', chrome.runtime.lastError);
      scriptsList.innerHTML = '<div class="empty-state">Error loading scripts</div>';
      return;
    }
    
    const scripts = response && response.scripts ? response.scripts : [];
    
    if (scripts.length === 0) {
      scriptsList.innerHTML = '<div class="empty-state">No scripts installed</div>';
      return;
    }
    
    // Clear list
    scriptsList.innerHTML = '';
    
    // Add each script to the list
    scripts.forEach(script => {
      scriptsList.appendChild(createScriptElement(script, true));
    });
  });
}

/**
 * Load and display scripts that match the current page
 */
/**
 * Check if there are scripts for the current page and show search options if none
 */
function checkForNoScripts() {
  // Only run this check if we're in the matched scripts view
  if (document.getElementById('matched-scripts-view').classList.contains('hidden')) {
    return;
  }
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      console.error('No active tab found');
      return;
    }
    
    const currentUrl = tabs[0].url;
    
    // Don't show for restricted sites
    if (isRestrictedSite(currentUrl)) {
      return;
    }
    
    // Get the hostname for search queries
    let hostname = '';
    try {
      hostname = new URL(currentUrl).hostname;
    } catch (e) {
      console.error('Invalid URL:', e);
      return;
    }
    
    // Check if we have any scripts for this page
    chrome.runtime.sendMessage(
      { action: 'getMatchedScripts', url: currentUrl },
      (response) => {
        const scripts = response?.scripts || [];
        const noScriptsAlert = document.getElementById('no-scripts-alert');
        
        if (scripts.length === 0) {
          // Show the no scripts alert
          noScriptsAlert.classList.remove('hidden');
          
          // Set up search links
          document.getElementById('search-openuserjs').href = `https://openuserjs.org/?q=${hostname}`;
          document.getElementById('search-greasyfork').href = `https://greasyfork.org/scripts/search?q=${hostname}`;
          document.getElementById('search-github').href = `https://github.com/search?q=${hostname}+userscript&type=code`;
          document.getElementById('search-userscripts-zone').href = `https://www.userscript.zone/search?q=${hostname}`;
          
          // Add click handlers to open in new tab
          document.querySelectorAll('.search-options a').forEach(link => {
            link.addEventListener('click', (e) => {
              e.preventDefault();
              chrome.tabs.create({ url: e.target.href });
            });
          });
        } else {
          // Hide the alert if there are scripts
          noScriptsAlert.classList.add('hidden');
        }
      }
    );
  });
}

// Helper function to check if a site is restricted
function isRestrictedSite(url) {
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
  
  return restrictedPatterns.some(pattern => pattern.test(url));
}

// Update the refreshPopup function to also check for no scripts
function refreshPopup() {
  // Determine which view is currently active
  const updatesView = document.getElementById('updates-view');
  const allScriptsView = document.getElementById('all-scripts-view');

  if (!updatesView.classList.contains('hidden')) {
    loadUpdates();
  } else if (!allScriptsView.classList.contains('hidden')) {
    loadAllScripts();
  } else {
    loadMatchedScripts();
  }

  // Check for userscripts on the current page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      checkForUserscripts(tabs[0].url);
    }
  });
  
  // Check if the current site is restricted
  checkRestrictedSite();

  // Check for updates
  checkForUpdates();
}

/**
 * Toggle script injection on/off
 */
function toggleInjection(event) {
  const enabled = event.target.checked;
  chrome.storage.sync.set({ injectionEnabled: enabled });
  
  // Notify background script about the change
  chrome.runtime.sendMessage({ 
    action: 'setInjectionState', 
    enabled: enabled 
  });
}

/**
 * Open the extension options page
 */
function openExtensionPage(e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
}

function openEditorPage(e) {
  e.preventDefault();
  // Open the editor in a new tab
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor/editor.html')
  });
}

/**
 * Check if there's a userscript on the current page
 * @param {string} url - The URL of the current page
 */
function checkForUserscripts(url) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      console.error('No active tab found');
      return;
    }
    
    chrome.tabs.sendMessage(
      tabs[0].id, 
      { action: 'detectUserscript' }, 
      (response) => {
        if (chrome.runtime.lastError) {
          // This is expected if the content script isn't loaded
          console.log('Content script not ready:', chrome.runtime.lastError.message);
          return;
        }
        
        if (response && response.detected) {
          // Show the userscript alert
          const alert = document.getElementById('userscript-alert');
          alert.classList.remove('hidden');
          
          // Extract script name from content and display it
          const scriptName = extractScriptName(response.scriptContent);
          const nameElement = document.getElementById('detected-script-name');
          if (nameElement) {
            nameElement.textContent = scriptName || 'Unknown Script';
          }
          
          // Store the script content for installation
          alert.dataset.scriptContent = response.scriptContent;
        }
      }
    );
  });
}

/**
 * Show the add script form
 */
function showAddScriptForm() {
  // Open the editor in a new tab instead of showing the form in the popup
  chrome.tabs.create({
    url: chrome.runtime.getURL('editor/editor.html')
  });
}

/**
 * Hide the add script form
 */
function hideAddScriptForm() {
  document.getElementById('add-script-form').classList.add('hidden');
  document.getElementById('script-content').value = '';
  // Clear any stored script ID
  document.getElementById('script-content').dataset.scriptId = '';
}

/**
 * Save a new script
 */
function saveScript() {
  const scriptContent = document.getElementById('script-content').value.trim();
  const scriptId = document.getElementById('script-content').dataset.scriptId;
  
  if (!scriptContent) {
    alert('Please enter script content');
    return;
  }
  
  // Determine if we're updating or adding
  const action = scriptId ? 'updateScriptContent' : 'addScript';
  
  // Send to background script for processing
  chrome.runtime.sendMessage(
    { action, scriptContent, scriptId },
    (response) => {
      if (response.success) {
        hideAddScriptForm();
        refreshPopup();
      } else {
        alert(`Error ${scriptId ? 'updating' : 'adding'} script: ${response.error}`);
      }
    }
  );
}

/**
 * Import a script from file
 */
function importScript() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.js,.user.js';
  
  input.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      // Store the script content temporarily in local storage
      chrome.storage.local.set({ 'tempScriptContent': e.target.result }, function() {
        // Open the editor with a parameter to load the temp content
        chrome.tabs.create({
          url: chrome.runtime.getURL('editor/editor.html?loadTemp=true')
        });
      });
    };
    reader.readAsText(file);
  };
  
  input.click();
}

/**
 * Install a detected userscript
 */
function installDetectedScript() {
  const alert = document.getElementById('userscript-alert');
  const scriptContent = alert.dataset.scriptContent;
  
  if (scriptContent) {
    console.log("Storing script content for editor:", scriptContent.substring(0, 100) + "...");
    
    // Store the script content temporarily in local storage
    chrome.storage.local.set({ 'tempScriptContent': scriptContent }, function() {
      if (chrome.runtime.lastError) {
        console.error("Error storing script content:", chrome.runtime.lastError);
        return;
      }
      
      // Open the editor with a parameter to load the temp content
      chrome.tabs.create({
        url: chrome.runtime.getURL('editor/editor.html?loadTemp=true')
      });
    });
    
    alert.classList.add('hidden');
  } else {
    console.error("No script content found in userscript-alert element");
  }
}

/**
 * Load and display all installed scripts
 */
function loadAllScripts() {
  const scriptsList = document.getElementById('all-scripts-list');
  
  // Request scripts from background
  chrome.runtime.sendMessage({ action: 'getScripts' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading scripts:', chrome.runtime.lastError);
      scriptsList.innerHTML = '<div class="empty-state">Error loading scripts</div>';
      return;
    }
    
    const scripts = response && response.scripts ? response.scripts : [];
    
    if (scripts.length === 0) {
      scriptsList.innerHTML = '<div class="empty-state">No scripts installed</div>';
      return;
    }
    
    // Clear list
    scriptsList.innerHTML = '';
    
    // Add each script to the list
    scripts.forEach(script => {
      scriptsList.appendChild(createScriptElement(script, true));
    });
  });
}

/**
 * Load and display scripts that match the current page
 */
function loadMatchedScripts() {
  const scriptsList = document.getElementById('matched-scripts-list');
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    // Request matched scripts from background
    chrome.runtime.sendMessage(
      { action: 'getMatchedScripts', url: currentTab.url },
      (response) => {
        const scripts = response.scripts || [];
        
        if (scripts.length === 0) {
          scriptsList.innerHTML = '<div class="empty-state">No scripts match this page</div>';
          return;
        }
        
        // Clear list
        scriptsList.innerHTML = '';
        
        // Add each script to the list
        scripts.forEach(script => {
          const isSubframe = script.matchedInSubframe === true;
          scriptsList.appendChild(createScriptElement(script, false, isSubframe));
        });
      }
    );
  });
}

/**
 * Check for available updates
 */
function checkForUpdates() {
  chrome.runtime.sendMessage({ action: 'checkUpdates' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error checking updates:', chrome.runtime.lastError);
      return;
    }
    
    const updates = response && response.updates ? response.updates : [];
    const badge = document.getElementById('update-badge');
    
    if (updates.length > 0) {
      badge.textContent = updates.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });
}

/**
 * Load and display available updates
 */
function loadUpdates() {
  const updatesList = document.getElementById('updates-list');
  
  chrome.runtime.sendMessage({ action: 'getUpdates' }, (response) => {
    const updates = response.updates || [];
    
    if (updates.length === 0) {
      updatesList.innerHTML = '<div class="empty-state">No updates available</div>';
      return;
    }
    
    // Clear list
    updatesList.innerHTML = '';
    
    // Add each update to the list
    updates.forEach(update => {
      const updateItem = document.createElement('div');
      updateItem.className = 'script-item';
      
      const updateInfo = document.createElement('div');
      updateInfo.className = 'script-info';
      
      const updateName = document.createElement('div');
      updateName.className = 'script-name';
      updateName.textContent = update.metadata.name;
      
      const updateVersion = document.createElement('div');
      updateVersion.className = 'script-version';
      updateVersion.textContent = `v${update.currentVersion} → v${update.newVersion}`;
      
      const updateActions = document.createElement('div');
      updateActions.className = 'script-actions';
      
      const updateButton = document.createElement('button');
      updateButton.className = 'btn-icon update';
      updateButton.innerHTML = '↑';
      updateButton.title = 'Update script';
      updateButton.addEventListener('click', () => updateScript(update.id));
      
      // Assemble the elements
      updateInfo.appendChild(updateName);
      updateInfo.appendChild(updateVersion);
      
      updateActions.appendChild(updateButton);
      
      updateItem.appendChild(updateInfo);
      updateItem.appendChild(updateActions);
      
      updatesList.appendChild(updateItem);
    });
  });
}

/**
 * Create a script element for the list
 * @param {object} script - The script object
 * @param {boolean} showToggle - Whether to show the toggle switch
 * @param {boolean} isSubframe - Whether the script is matched in a subframe
 * @returns {HTMLElement} - The script element
 */
function createScriptElement(script, showToggle = true, isSubframe = false) {
  const scriptItem = document.createElement('div');
  scriptItem.className = 'script-item';
  
  const scriptInfo = document.createElement('div');
  scriptInfo.className = 'script-info';
  
  const scriptNameContainer = document.createElement('div');
  scriptNameContainer.className = 'script-name-container';
  
  const scriptName = document.createElement('span');
  scriptName.className = 'script-name';
  scriptName.textContent = script.metadata.name;
  
  const scriptType = document.createElement('span');
  scriptType.className = `script-type ${getScriptType(script)}`;
  scriptType.textContent = getScriptType(script).toUpperCase();
  
  if (isSubframe) {
    const subframeTag = document.createElement('span');
    subframeTag.className = 'script-subframe';
    subframeTag.textContent = 'sub';
    scriptNameContainer.appendChild(subframeTag);
  }
  
  const scriptVersion = document.createElement('div');
  scriptVersion.className = 'script-version';
  scriptVersion.textContent = `v${script.metadata.version}`;
  
  const scriptActions = document.createElement('div');
  scriptActions.className = 'script-actions';
  
  if (showToggle) {
    const toggleContainer = document.createElement('label');
    toggleContainer.className = 'script-toggle';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = script.enabled !== false; // Default to true
    toggleInput.addEventListener('change', (e) => {
      toggleScript(script.id, e.target.checked);
      e.stopPropagation(); // Prevent item click
    });
    
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'script-toggle-slider';
    
    toggleContainer.appendChild(toggleInput);
    toggleContainer.appendChild(toggleSlider);
    scriptActions.appendChild(toggleContainer);
  }
  
  // Assemble the elements
  scriptNameContainer.appendChild(scriptName);
  scriptNameContainer.appendChild(scriptType);
  
  scriptInfo.appendChild(scriptNameContainer);
  scriptInfo.appendChild(scriptVersion);
  
  scriptItem.appendChild(scriptInfo);
  scriptItem.appendChild(scriptActions);
  
  // Add click event to toggle script
  scriptItem.addEventListener('click', () => {
    if (showToggle) {
      const toggle = scriptItem.querySelector('input[type="checkbox"]');
      toggle.checked = !toggle.checked;
      toggleScript(script.id, toggle.checked);
    }
  });
  
  return scriptItem;
}

/**
 * Get the type of a script (js or css)
 * @param {object} script - The script object
 * @returns {string} - The script type
 */
function getScriptType(script) {
  // Check if the script is CSS based on content or metadata
  if (
    script.metadata.type === 'css' || 
    (script.content && script.content.trim().startsWith('/* ==UserStyle== */')) ||
    script.metadata.name.toLowerCase().includes('.css')
  ) {
    return 'css';
  }
  return 'js';
}

/**
 * Toggle a script on/off
 * @param {string} scriptId - The ID of the script
 * @param {boolean} enabled - Whether the script should be enabled
 */
function toggleScript(scriptId, enabled) {
  chrome.runtime.sendMessage(
    { action: 'toggleScript', scriptId, enabled },
    (response) => {
      if (response.success) {
        // If we're in the matched scripts view, refresh it
        if (document.getElementById('matched-scripts-view').classList.contains('hidden') === false) {
          loadMatchedScripts();
        }
      }
    }
  );
}

/**
 * Update a script
 * @param {string} scriptId - The ID of the script to update
 */
function updateScript(scriptId) {
  chrome.runtime.sendMessage(
    { action: 'updateScript', scriptId },
    (response) => {
      if (response.success) {
        loadUpdates();
        checkForUpdates();
      } else {
        alert(`Error updating script: ${response.error}`);
      }
    }
  );
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab information
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  // Initialize UI state
  initializeUI();
  
  // Check for userscripts on the current page only if the element exists
  const userscriptAlert = document.getElementById('userscript-alert');
  if (userscriptAlert && currentTab) {
    checkForUserscripts(currentTab.url);
  }
  
  // Load matched scripts for the current page
  loadMatchedScripts();
});
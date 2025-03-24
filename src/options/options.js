// Zedmonkey Options Script
// Handles the options page functionality

// Default settings
const DEFAULT_SETTINGS = {
    autoUpdate: true,
    scriptLimit: 13, // KB
    injectionTiming: 'document_start',
    debugMode: false,
    metadataPreference: 'zedata'
  };
  
  // DOM elements
  const elements = {
    autoUpdate: document.getElementById('auto-update'),
    scriptLimit: document.getElementById('script-limit'),
    injectionTiming: document.getElementById('injection-timing'),
    debugMode: document.getElementById('debug-mode'),
    metadataPreference: document.getElementById('metadata-preference'),
    exportAll: document.getElementById('export-all'),
    importAll: document.getElementById('import-all'),
    clearAll: document.getElementById('clear-all'),
    saveSettings: document.getElementById('save-settings'),
    statusMessage: document.getElementById('status-message')
  };
  
  // Load settings when the page opens
  document.addEventListener('DOMContentLoaded', loadSettings);
  
  // Set up event listeners
  elements.saveSettings.addEventListener('click', saveSettings);
  elements.exportAll.addEventListener('click', exportAllScripts);
  elements.importAll.addEventListener('click', importAllScripts);
  elements.clearAll.addEventListener('click', clearAllScripts);
  
  /**
   * Load settings from storage
   */
  async function loadSettings() {
    chrome.storage.sync.get('settings', (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      
      // Apply settings to form elements
      elements.autoUpdate.checked = settings.autoUpdate;
      elements.scriptLimit.value = settings.scriptLimit;
      elements.injectionTiming.value = settings.injectionTiming;
      elements.debugMode.checked = settings.debugMode;
      elements.metadataPreference.value = settings.metadataPreference;
    });
  }
  
  /**
   * Save settings to storage
   */
  async function saveSettings() {
    const settings = {
      autoUpdate: elements.autoUpdate.checked,
      scriptLimit: parseInt(elements.scriptLimit.value, 10),
      injectionTiming: elements.injectionTiming.value,
      debugMode: elements.debugMode.checked,
      metadataPreference: elements.metadataPreference.value
    };
    
    // Validate script limit
    if (settings.scriptLimit < 1 || settings.scriptLimit > 100) {
      showStatus('Script size limit must be between 1 and 100 KB', 'error');
      return;
    }
    
    // Save to storage
    chrome.storage.sync.set({ settings }, () => {
      showStatus('Settings saved successfully', 'success');
    });
  }
  
  /**
   * Export all scripts as a JSON file
   */
  async function exportAllScripts() {
    chrome.runtime.sendMessage({ action: 'getScripts' }, (response) => {
      const scripts = response.scripts || [];
      
      if (scripts.length === 0) {
        showStatus('No scripts to export', 'error');
        return;
      }
      
      // Create a JSON blob
      const blob = new Blob([JSON.stringify(scripts, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `zedmonkey-scripts-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      showStatus(`Exported ${scripts.length} scripts`, 'success');
    });
  }
  
  /**
   * Import scripts from a JSON file
   */
  async function importAllScripts() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const scripts = JSON.parse(e.target.result);
          
          if (!Array.isArray(scripts)) {
            throw new Error('Invalid format: expected an array of scripts');
          }
          
          // Import each script
          chrome.runtime.sendMessage(
            { action: 'importScripts', scripts },
            (response) => {
              if (response.success) {
                showStatus(`Imported ${response.count} scripts`, 'success');
              } else {
                showStatus(`Error importing scripts: ${response.error}`, 'error');
              }
            }
          );
        } catch (error) {
          showStatus(`Error parsing file: ${error.message}`, 'error');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }
  
  /**
   * Clear all scripts after confirmation
   */
  async function clearAllScripts() {
    if (confirm('Are you sure you want to delete ALL scripts? This cannot be undone.')) {
      chrome.runtime.sendMessage({ action: 'clearAllScripts' }, (response) => {
        if (response.success) {
          showStatus('All scripts have been deleted', 'success');
        } else {
          showStatus(`Error clearing scripts: ${response.error}`, 'error');
        }
      });
    }
  }
  
  /**
   * Show a status message
   * @param {string} message - The message to show
   * @param {string} type - The type of message ('success' or 'error')
   */
  function showStatus(message, type = 'success') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
    
    // Clear the message after 3 seconds
    setTimeout(() => {
      elements.statusMessage.textContent = '';
      elements.statusMessage.className = 'status-message';
    }, 3000);
  }
  
  // Cargar configuración
  function loadSettings() {
    chrome.storage.sync.get(['injectionEnabled', 'autoDetectScripts', 'autoShowInstallUI'], (result) => {
      document.getElementById('injection-enabled').checked = result.injectionEnabled !== false;
      document.getElementById('auto-detect-scripts').checked = result.autoDetectScripts !== false;
      document.getElementById('auto-show-install-ui').checked = result.autoShowInstallUI !== false;
    });
  }
  
  // Guardar configuración
  function saveSettings() {
    const injectionEnabled = document.getElementById('injection-enabled').checked;
    const autoDetectScripts = document.getElementById('auto-detect-scripts').checked;
    const autoShowInstallUI = document.getElementById('auto-show-install-ui').checked;
    
    chrome.storage.sync.set({
      injectionEnabled,
      autoDetectScripts,
      autoShowInstallUI
    }, () => {
      showStatus('Settings saved', 'success');
    });
  }
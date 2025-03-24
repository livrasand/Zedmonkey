// Zedmonkey Editor Script
// Handles the script editor UI and interactions

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const scriptId = urlParams.get('id');
const scriptName = urlParams.get('name') || 'New Script';

// Set script title
document.getElementById('script-title').textContent = scriptName;

// Initialize editor
function initializeEditor() {
  const scriptContent = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  
  // Set up event listeners
  document.getElementById('save-script').addEventListener('click', saveScript);
  document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
  
  // Add event listeners for new buttons
  const downloadButton = document.getElementById('download-script');
  if (downloadButton) {
    downloadButton.addEventListener('click', downloadScript);
  }
  
  const refreshButton = document.getElementById('refresh-script');
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshScript);
  }
  
  const deleteButton = document.getElementById('delete-script');
  if (deleteButton) {
    deleteButton.addEventListener('click', deleteScript);
  }
  
  // Check if log button exists before adding listener
  const logButton = document.getElementById('log-button');
  if (logButton) {
    logButton.addEventListener('click', logScriptContent);
  }
  
  // Add event listeners for textarea
  scriptContent.addEventListener('input', () => {
    updateLineNumbers();
    highlightSyntax();
    updateCursorPosition();
  });
  scriptContent.addEventListener('scroll', () => {
    syncScroll();
    highlightSyntax(); // Re-highlight to keep in sync
  });
  scriptContent.addEventListener('keydown', handleTabKey);
  scriptContent.addEventListener('click', updateCursorPosition);
  scriptContent.addEventListener('keyup', updateCursorPosition);
  
  // Set up search functionality
  document.getElementById('search-scripts').addEventListener('input', filterScripts);
  
  // Load all scripts for the sidebar
  loadAllScripts();
  
  // Load script content if editing existing script
  if (scriptId) {
    loadScriptContent(scriptId);
  } else {
    // Initialize with empty content and template
    scriptContent.value = getScriptTemplate();
    updateLineNumbers();
  }
  
  // Load temporary script content if available
  if (urlParams.get('loadTemp')) {
    // Load temporary script content from storage
    chrome.storage.local.get('tempScriptContent', function(result) {
      if (result.tempScriptContent) {
        document.getElementById('script-content').value = result.tempScriptContent;
        updateLineNumbers();
        
        // Clear the temporary storage
        chrome.storage.local.remove('tempScriptContent');
      }
    });
  }
}

/**
 * Get a template for new scripts
 */
function getScriptTemplate() {
  return `[script]
name = "Hello World Script"
namespace = "zedmonkey"
version = "1.0"
description = "Muestra una alerta de 'Hello World' al cargar la página"
author = "Zedmonkey User"
match = "*://*/*"
grant = "none"

(function() {
    'use strict';
    
    // Crear un elemento de notificación estilizado
    const notification = document.createElement('div');
    notification.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: opacity 0.5s ease-in-out;
    \`;
    notification.textContent = '¡Hello World desde Zedmonkey!';
    
    // Añadir la notificación al documento
    document.body.appendChild(notification);
    
    // Desvanecer y eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
    
    // También mostrar en la consola
    console.log('Hello World desde Zedmonkey!');
})();
`;
}

/**
 * Load all scripts for the sidebar
 */
function loadAllScripts() {
  chrome.runtime.sendMessage({ action: 'getScripts' }, (response) => {
    if (response && response.scripts) {
      renderScriptsList(response.scripts);
    } else {
      showStatusMessage('Error loading scripts', true);
    }
  });
}

/**
 * Render the scripts list in the sidebar
 */
function renderScriptsList(scripts) {
  const scriptsListElement = document.getElementById('scripts-list');
  scriptsListElement.innerHTML = '';
  
  if (scripts.length === 0) {
    scriptsListElement.innerHTML = '<div class="empty-state">No scripts installed</div>';
    return;
  }
  
  scripts.forEach(script => {
    const scriptItem = document.createElement('div');
    scriptItem.className = 'script-item';
    if (script.id === scriptId) {
      scriptItem.classList.add('active');
    }
    
    // Set border color based on script type
    const scriptType = getScriptType(script);
    if (scriptType === 'css') {
      scriptItem.style.borderLeftColor = '#4caf50';
    } else if (scriptType === 'bookmarklet') {
      scriptItem.style.borderLeftColor = '#2196f3';
    } else {
      scriptItem.style.borderLeftColor = '#ffcc00'; // Default for JS
    }
    
    const scriptInfo = document.createElement('div');
    scriptInfo.className = 'script-info';
    
    // Create badge and name container
    const nameContainer = document.createElement('div');
    nameContainer.style.display = 'flex';
    nameContainer.style.alignItems = 'center';
    
    // Add script type badge
    const badge = document.createElement('span');
    badge.className = `script-badge ${scriptType}`;
    badge.textContent = scriptType.toUpperCase();
    nameContainer.appendChild(badge);
    
    // Add script name
    const scriptName = document.createElement('div');
    scriptName.className = 'script-name';
    scriptName.style.display = 'inline';
    scriptName.textContent = script.metadata?.name || 'Unnamed Script';
    nameContainer.appendChild(scriptName);
    
    scriptInfo.appendChild(nameContainer);
    
    // Add script metadata
    const scriptMeta = document.createElement('div');
    scriptMeta.className = 'script-meta';
    scriptMeta.textContent = `v${script.metadata?.version || '1.0'} • ${script.metadata?.match?.[0] || '*'}`;
    scriptInfo.appendChild(scriptMeta);
    
    // Add script description if available
    if (script.metadata?.description) {
      const scriptDesc = document.createElement('div');
      scriptDesc.className = 'script-description';
      scriptDesc.textContent = script.metadata.description;
      scriptInfo.appendChild(scriptDesc);
    }
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = script.enabled !== false;
    toggleInput.dataset.scriptId = script.id;
    toggleInput.addEventListener('change', toggleScriptEnabled);
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(slider);
    
    scriptItem.appendChild(scriptInfo);
    scriptItem.appendChild(toggleSwitch);
    
    // Add click event to edit the script
    scriptInfo.addEventListener('click', () => {
      window.location.href = `editor.html?id=${script.id}&name=${encodeURIComponent(script.metadata?.name || 'Script')}`;
    });
    
    scriptsListElement.appendChild(scriptItem);
  });
}

/**
 * Determine script type based on content or metadata
 */
function getScriptType(script) {
  if (!script.content) return 'js';
  
  if (script.metadata?.type) {
    return script.metadata.type.toLowerCase();
  }
  
  if (script.content.includes('@resource') || script.content.includes('@require')) {
    return 'js';
  }
  
  if (script.content.trim().startsWith('javascript:')) {
    return 'bookmarklet';
  }
  
  if (script.content.includes('@-moz-document') || 
      script.content.includes('@namespace') ||
      script.content.includes('@media')) {
    return 'js';
  }
  
  return 'js';
}

/**
 * Toggle script enabled/disabled state
 */
function toggleScriptEnabled(event) {
  const scriptId = event.target.dataset.scriptId;
  const enabled = event.target.checked;
  
  chrome.runtime.sendMessage(
    { action: 'toggleScriptEnabled', scriptId, enabled },
    (response) => {
      if (response && response.success) {
        showStatusMessage(`Script ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        showStatusMessage('Error updating script state', true);
        // Revert the toggle if there was an error
        event.target.checked = !enabled;
      }
    }
  );
}

/**
 * Filter scripts based on search input
 */
function filterScripts(event) {
  const searchTerm = event.target.value.toLowerCase();
  const scriptItems = document.querySelectorAll('.script-item');
  
  scriptItems.forEach(item => {
    const scriptName = item.querySelector('.script-name').textContent.toLowerCase();
    const scriptMeta = item.querySelector('.script-meta').textContent.toLowerCase();
    
    if (scriptName.includes(searchTerm) || scriptMeta.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Load script content from storage
 */
function loadScriptContent(id) {
  chrome.runtime.sendMessage(
    { action: 'getScriptContent', scriptId: id },
    (response) => {
      if (response && response.content) {
        document.getElementById('script-content').value = response.content;
        updateLineNumbers();
        showStatusMessage('Script loaded successfully');
      } else {
        showStatusMessage('Error loading script', true);
      }
    }
  );
}

/**
 * Save script to storage
 */
function saveScript() {
  const scriptContent = document.getElementById('script-content').value.trim();
  
  if (!scriptContent) {
    showStatusMessage('Please enter script content', true);
    return;
  }
  
  // Determine if we're updating or adding
  const action = scriptId ? 'updateScriptContent' : 'addScript';
  
  // Send to background script for processing
  chrome.runtime.sendMessage(
    { action, scriptContent, scriptId },
    (response) => {
      if (response && response.success) {
        showStatusMessage('Script saved successfully');
        
        // If this is a new script, redirect to edit with the new ID
        if (!scriptId && response.scriptId) {
          window.location.href = `editor.html?id=${response.scriptId}&name=${encodeURIComponent(response.name || 'Script')}`;
        }
      } else {
        showStatusMessage(`Error saving script: ${response.error || 'Unknown error'}`, true);
      }
    }
  );
}

/**
 * Cancel editing and return to popup
 */
function cancelEdit() {
  window.close();
}

/**
 * Log script content to console (for debugging)
 */
function logScriptContent() {
  console.log(document.getElementById('script-content').value);
  showStatusMessage('Script content logged to console');
}

/**
 * Update line numbers based on content
 */
function updateLineNumbers() {
  const textarea = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  
  // Count lines
  const lines = textarea.value.split('\n').length;
  
  // Generate line numbers
  lineNumbers.innerHTML = '';
  for (let i = 1; i <= Math.max(10, lines); i++) {
    const div = document.createElement('div');
    div.textContent = i;
    lineNumbers.appendChild(div);
  }
}

/**
 * Synchronize scrolling between textarea and line numbers
 */
function syncScroll() {
  const textarea = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  lineNumbers.scrollTop = textarea.scrollTop;
}

/**
 * Handle tab key in textarea
 */
function handleTabKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert tab at cursor position
    textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
    
    // Move cursor after the inserted tab
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  }
}

/**
 * Show status message
 */
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#f44336' : '#4caf50';
  
  // Clear message after 3 seconds
  setTimeout(() => {
    statusElement.textContent = '';
  }, 3000);
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEditor);

/**
 * Download script as a file
 */
function downloadScript() {
  const scriptContent = document.getElementById('script-content').value;
  const scriptTitle = document.getElementById('script-title').textContent;
  
  // Create a safe filename
  const filename = scriptTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.js';
  
  // Create a blob and download link
  const blob = new Blob([scriptContent], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
  
  showStatusMessage('Script downloaded');
}

/**
 * Refresh script (reload from storage)
 */
function refreshScript() {
  if (scriptId) {
    loadScriptContent(scriptId);
    showStatusMessage('Script refreshed');
  } else {
    showStatusMessage('Cannot refresh new script', true);
  }
}

/**
 * Delete the current script
 */
function deleteScript() {
  if (!scriptId) {
    showStatusMessage('Cannot delete new script', true);
    return;
  }
  
  if (confirm('Are you sure you want to delete this script?')) {
    chrome.runtime.sendMessage(
      { action: 'removeScript', scriptId },
      (response) => {
        if (response && response.success) {
          showStatusMessage('Script deleted');
          // Redirect to create a new script
          setTimeout(() => {
            window.location.href = 'editor.html';
          }, 1000);
        } else {
          showStatusMessage('Error deleting script', true);
        }
      }
    );
  }
}

// Add this near the beginning of your editor.js file

// Check if we should load temporary content
function loadTempContentIfNeeded() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('loadTemp') === 'true') {
    chrome.storage.local.get('tempScriptContent', (data) => {
      if (data.tempScriptContent) {
        // Load the content into your editor
        editor.setValue(data.tempScriptContent);
        
        // Clear the temporary storage
        chrome.storage.local.remove('tempScriptContent');
      } else {
        console.error('No temporary script content found');
        // Show some error message in the UI
      }
    });
  }
}

// Call this function when your editor is initialized
document.addEventListener('DOMContentLoaded', () => {
  // Your existing editor initialization code
  // ...
  
  // Then load temp content if needed
  loadTempContentIfNeeded();
});

// Add these functions after the initializeEditor function

/**
 * Highlight syntax in the editor
 */
function highlightSyntax() {
  const scriptContent = document.getElementById('script-content');
  const highlightLayer = document.getElementById('highlight-layer');
  const code = scriptContent.value;
  
  // Apply syntax highlighting
  const highlighted = applyHighlighting(code);
  highlightLayer.innerHTML = highlighted;
  
  // Sync scroll position
  highlightLayer.scrollTop = scriptContent.scrollTop;
  highlightLayer.scrollLeft = scriptContent.scrollLeft;
}

/**
 * Apply syntax highlighting to code
 * @param {string} code - The code to highlight
 * @returns {string} - HTML with syntax highlighting
 */
function applyHighlighting(code) {
  if (!code) return '';
  
  // Simple tokenizer for JavaScript and Zedata Block
  let html = code
    // Handle Zedata Block section
    .replace(/(\[script\])/g, '<span class="token zedata-section">$1</span>')
    
    // Handle Zedata Block key-value pairs
    .replace(/^(\w+)\s*=\s*(".*?")/gm, '<span class="token zedata-key">$1</span> <span class="token operator">=</span> <span class="token zedata-value">$2</span>')
    
    // Handle comments
    .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>')
    
    // Handle strings
    .replace(/("(?:\\.|[^"\\])*")|('(?:\\.|[^'\\])*')|(`(?:\\.|[^`\\])*`)/g, '<span class="token string">$1$2$3</span>')
    
    // Handle numbers
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token number">$1</span>')
    
    // Handle keywords
    .replace(/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|try|catch|finally|throw|class|extends|import|export|default|from|async|await|this|super|yield|typeof|instanceof|in|of|delete|void|null|undefined|true|false)\b/g, '<span class="token keyword">$1</span>')
    
    // Handle function calls
    .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, '<span class="token function">$1</span>(')
    
    // Handle brackets
    .replace(/([{}[\]()])/g, '<span class="token bracket">$1</span>')
    
    // Handle operators
    .replace(/(\+|\-|\*|\/|%|=|\+=|\-=|\*=|\/=|%=|==|===|!=|!==|>|<|>=|<=|&&|\|\||!|\?|:|&|\||\^|~|<<|>>|>>>)/g, '<span class="token operator">$1</span>')
    
    // Handle punctuation
    .replace(/([;,.])/g, '<span class="token punctuation">$1</span>');
  
  return html;
}

/**
 * Update cursor position display
 */
function updateCursorPosition() {
  const textarea = document.getElementById('script-content');
  const position = document.getElementById('cursor-position');
  
  const text = textarea.value;
  const cursorPos = textarea.selectionStart;
  
  // Calculate line and column
  let line = 1;
  let col = 1;
  
  for (let i = 0; i < cursorPos; i++) {
    if (text[i] === '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  
  position.textContent = `Line: ${line}, Column: ${col}`;
  
  // Highlight current line
  highlightCurrentLine(line);
}

/**
 * Highlight the current line
 * @param {number} lineNumber - The line number to highlight
 */
function highlightCurrentLine(lineNumber) {
  const highlightLayer = document.getElementById('highlight-layer');
  const lines = highlightLayer.innerHTML.split('\n');
  
  // Remove existing line highlights
  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].replace(/<div class="current-line">(.*?)<\/div>/g, '$1');
  }
  
  // Add highlight to current line
  if (lineNumber > 0 && lineNumber <= lines.length) {
    lines[lineNumber - 1] = `<div class="current-line">${lines[lineNumber - 1]}</div>`;
  }
  
  highlightLayer.innerHTML = lines.join('\n');
}

// Update the existing event listeners in initializeEditor function
function initializeEditor() {
  // ... existing code ...
  
  // Add event listeners for textarea
  scriptContent.addEventListener('input', () => {
    updateLineNumbers();
    highlightSyntax();
    updateCursorPosition();
  });
  scriptContent.addEventListener('scroll', () => {
    syncScroll();
    highlightSyntax(); // Re-highlight to keep in sync
  });
  scriptContent.addEventListener('keydown', handleTabKey);
  scriptContent.addEventListener('click', updateCursorPosition);
  scriptContent.addEventListener('keyup', updateCursorPosition);
  
  // Set up search functionality
  document.getElementById('search-scripts').addEventListener('input', filterScripts);
  
  // Load all scripts for the sidebar
  loadAllScripts();
  
  // Load script content if editing existing script
  if (scriptId) {
    loadScriptContent(scriptId);
  } else {
    // Initialize with empty content and template
    scriptContent.value = getScriptTemplate();
    updateLineNumbers();
  }
  
  // Load temporary script content if available
  if (urlParams.get('loadTemp')) {
    // Load temporary script content from storage
    chrome.storage.local.get('tempScriptContent', function(result) {
      if (result.tempScriptContent) {
        document.getElementById('script-content').value = result.tempScriptContent;
        updateLineNumbers();
        
        // Clear the temporary storage
        chrome.storage.local.remove('tempScriptContent');
      }
    });
  }
}

/**
 * Get a template for new scripts
 */
function getScriptTemplate() {
  return `[script]
name = "Hello World Script"
namespace = "zedmonkey"
version = "1.0"
description = "Muestra una alerta de 'Hello World' al cargar la página"
author = "Zedmonkey User"
match = "*://*/*"
grant = "none"

(function() {
    'use strict';
    
    // Crear un elemento de notificación estilizado
    const notification = document.createElement('div');
    notification.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: opacity 0.5s ease-in-out;
    \`;
    notification.textContent = '¡Hello World desde Zedmonkey!';
    
    // Añadir la notificación al documento
    document.body.appendChild(notification);
    
    // Desvanecer y eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
    
    // También mostrar en la consola
    console.log('Hello World desde Zedmonkey!');
})();
`;
}

/**
 * Load all scripts for the sidebar
 */
function loadAllScripts() {
  chrome.runtime.sendMessage({ action: 'getScripts' }, (response) => {
    if (response && response.scripts) {
      renderScriptsList(response.scripts);
    } else {
      showStatusMessage('Error loading scripts', true);
    }
  });
}

/**
 * Render the scripts list in the sidebar
 */
function renderScriptsList(scripts) {
  const scriptsListElement = document.getElementById('scripts-list');
  scriptsListElement.innerHTML = '';
  
  if (scripts.length === 0) {
    scriptsListElement.innerHTML = '<div class="empty-state">No scripts installed</div>';
    return;
  }
  
  scripts.forEach(script => {
    const scriptItem = document.createElement('div');
    scriptItem.className = 'script-item';
    if (script.id === scriptId) {
      scriptItem.classList.add('active');
    }
    
    // Set border color based on script type
    const scriptType = getScriptType(script);
    if (scriptType === 'css') {
      scriptItem.style.borderLeftColor = '#4caf50';
    } else if (scriptType === 'bookmarklet') {
      scriptItem.style.borderLeftColor = '#2196f3';
    } else {
      scriptItem.style.borderLeftColor = '#ffcc00'; // Default for JS
    }
    
    const scriptInfo = document.createElement('div');
    scriptInfo.className = 'script-info';
    
    // Create badge and name container
    const nameContainer = document.createElement('div');
    nameContainer.style.display = 'flex';
    nameContainer.style.alignItems = 'center';
    
    // Add script type badge
    const badge = document.createElement('span');
    badge.className = `script-badge ${scriptType}`;
    badge.textContent = scriptType.toUpperCase();
    nameContainer.appendChild(badge);
    
    // Add script name
    const scriptName = document.createElement('div');
    scriptName.className = 'script-name';
    scriptName.style.display = 'inline';
    scriptName.textContent = script.metadata?.name || 'Unnamed Script';
    nameContainer.appendChild(scriptName);
    
    scriptInfo.appendChild(nameContainer);
    
    // Add script metadata
    const scriptMeta = document.createElement('div');
    scriptMeta.className = 'script-meta';
    scriptMeta.textContent = `v${script.metadata?.version || '1.0'} • ${script.metadata?.match?.[0] || '*'}`;
    scriptInfo.appendChild(scriptMeta);
    
    // Add script description if available
    if (script.metadata?.description) {
      const scriptDesc = document.createElement('div');
      scriptDesc.className = 'script-description';
      scriptDesc.textContent = script.metadata.description;
      scriptInfo.appendChild(scriptDesc);
    }
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = script.enabled !== false;
    toggleInput.dataset.scriptId = script.id;
    toggleInput.addEventListener('change', toggleScriptEnabled);
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(slider);
    
    scriptItem.appendChild(scriptInfo);
    scriptItem.appendChild(toggleSwitch);
    
    // Add click event to edit the script
    scriptInfo.addEventListener('click', () => {
      window.location.href = `editor.html?id=${script.id}&name=${encodeURIComponent(script.metadata?.name || 'Script')}`;
    });
    
    scriptsListElement.appendChild(scriptItem);
  });
}

/**
 * Determine script type based on content or metadata
 */
function getScriptType(script) {
  if (!script.content) return 'js';
  
  if (script.metadata?.type) {
    return script.metadata.type.toLowerCase();
  }
  
  if (script.content.includes('@resource') || script.content.includes('@require')) {
    return 'js';
  }
  
  if (script.content.trim().startsWith('javascript:')) {
    return 'bookmarklet';
  }
  
  if (script.content.includes('@-moz-document') || 
      script.content.includes('@namespace') ||
      script.content.includes('@media')) {
    return 'js';
  }
  
  return 'js';
}

/**
 * Toggle script enabled/disabled state
 */
function toggleScriptEnabled(event) {
  const scriptId = event.target.dataset.scriptId;
  const enabled = event.target.checked;
  
  chrome.runtime.sendMessage(
    { action: 'toggleScriptEnabled', scriptId, enabled },
    (response) => {
      if (response && response.success) {
        showStatusMessage(`Script ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        showStatusMessage('Error updating script state', true);
        // Revert the toggle if there was an error
        event.target.checked = !enabled;
      }
    }
  );
}

/**
 * Filter scripts based on search input
 */
function filterScripts(event) {
  const searchTerm = event.target.value.toLowerCase();
  const scriptItems = document.querySelectorAll('.script-item');
  
  scriptItems.forEach(item => {
    const scriptName = item.querySelector('.script-name').textContent.toLowerCase();
    const scriptMeta = item.querySelector('.script-meta').textContent.toLowerCase();
    
    if (scriptName.includes(searchTerm) || scriptMeta.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Load script content from storage
 */
function loadScriptContent(id) {
  chrome.runtime.sendMessage(
    { action: 'getScriptContent', scriptId: id },
    (response) => {
      if (response && response.content) {
        document.getElementById('script-content').value = response.content;
        updateLineNumbers();
        showStatusMessage('Script loaded successfully');
      } else {
        showStatusMessage('Error loading script', true);
      }
    }
  );
}

/**
 * Save script to storage
 */
function saveScript() {
  const scriptContent = document.getElementById('script-content').value.trim();
  
  if (!scriptContent) {
    showStatusMessage('Please enter script content', true);
    return;
  }
  
  // Determine if we're updating or adding
  const action = scriptId ? 'updateScriptContent' : 'addScript';
  
  // Send to background script for processing
  chrome.runtime.sendMessage(
    { action, scriptContent, scriptId },
    (response) => {
      if (response && response.success) {
        showStatusMessage('Script saved successfully');
        
        // If this is a new script, redirect to edit with the new ID
        if (!scriptId && response.scriptId) {
          window.location.href = `editor.html?id=${response.scriptId}&name=${encodeURIComponent(response.name || 'Script')}`;
        }
      } else {
        showStatusMessage(`Error saving script: ${response.error || 'Unknown error'}`, true);
      }
    }
  );
}

/**
 * Cancel editing and return to popup
 */
function cancelEdit() {
  window.close();
}

/**
 * Log script content to console (for debugging)
 */
function logScriptContent() {
  console.log(document.getElementById('script-content').value);
  showStatusMessage('Script content logged to console');
}

/**
 * Update line numbers based on content
 */
function updateLineNumbers() {
  const textarea = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  
  // Count lines
  const lines = textarea.value.split('\n').length;
  
  // Generate line numbers
  lineNumbers.innerHTML = '';
  for (let i = 1; i <= Math.max(10, lines); i++) {
    const div = document.createElement('div');
    div.textContent = i;
    lineNumbers.appendChild(div);
  }
}

/**
 * Synchronize scrolling between textarea and line numbers
 */
function syncScroll() {
  const textarea = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  lineNumbers.scrollTop = textarea.scrollTop;
}

/**
 * Handle tab key in textarea
 */
function handleTabKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert tab at cursor position
    textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
    
    // Move cursor after the inserted tab
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  }
}

/**
 * Show status message
 */
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#f44336' : '#4caf50';
  
  // Clear message after 3 seconds
  setTimeout(() => {
    statusElement.textContent = '';
  }, 3000);
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEditor);

/**
 * Download script as a file
 */
function downloadScript() {
  const scriptContent = document.getElementById('script-content').value;
  const scriptTitle = document.getElementById('script-title').textContent;
  
  // Create a safe filename
  const filename = scriptTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.js';
  
  // Create a blob and download link
  const blob = new Blob([scriptContent], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
  
  showStatusMessage('Script downloaded');
}

/**
 * Refresh script (reload from storage)
 */
function refreshScript() {
  if (scriptId) {
    loadScriptContent(scriptId);
    showStatusMessage('Script refreshed');
  } else {
    showStatusMessage('Cannot refresh new script', true);
  }
}

/**
 * Delete the current script
 */
function deleteScript() {
  if (!scriptId) {
    showStatusMessage('Cannot delete new script', true);
    return;
  }
  
  if (confirm('Are you sure you want to delete this script?')) {
    chrome.runtime.sendMessage(
      { action: 'removeScript', scriptId },
      (response) => {
        if (response && response.success) {
          showStatusMessage('Script deleted');
          // Redirect to create a new script
          setTimeout(() => {
            window.location.href = 'editor.html';
          }, 1000);
        } else {
          showStatusMessage('Error deleting script', true);
        }
      }
    );
  }
}

// Add this near the beginning of your editor.js file

// Check if we should load temporary content
function loadTempContentIfNeeded() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('loadTemp') === 'true') {
    chrome.storage.local.get('tempScriptContent', (data) => {
      if (data.tempScriptContent) {
        // Load the content into your editor
        editor.setValue(data.tempScriptContent);
        
        // Clear the temporary storage
        chrome.storage.local.remove('tempScriptContent');
      } else {
        console.error('No temporary script content found');
        // Show some error message in the UI
      }
    });
  }
}

// Call this function when your editor is initialized
document.addEventListener('DOMContentLoaded', () => {
  // Your existing editor initialization code
  // ...
  
  // Then load temp content if needed
  loadTempContentIfNeeded();
});

// Update the existing event listeners in initializeEditor function
// Update the existing event listeners in initializeEditor function
function initializeEditor() {
  const scriptContent = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  
  // Set up event listeners
  document.getElementById('save-script').addEventListener('click', saveScript);
  document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
  
  // Add event listeners for new buttons
  const downloadButton = document.getElementById('download-script');
  if (downloadButton) {
    downloadButton.addEventListener('click', downloadScript);
  }
  
  const refreshButton = document.getElementById('refresh-script');
  if (refreshButton) {
    refreshButton.addEventListener('click', refreshScript);
  }
  
  const deleteButton = document.getElementById('delete-script');
  if (deleteButton) {
    deleteButton.addEventListener('click', deleteScript);
  }
  
  // Check if log button exists before adding listener
  const logButton = document.getElementById('log-button');
  if (logButton) {
    logButton.addEventListener('click', logScriptContent);
  }
  
  // Add event listeners for textarea
  scriptContent.addEventListener('input', () => {
    updateLineNumbers();
    highlightSyntax();
    updateCursorPosition();
  });
  scriptContent.addEventListener('scroll', () => {
    syncScroll();
    highlightSyntax(); // Re-highlight to keep in sync
  });
  scriptContent.addEventListener('keydown', handleTabKey);
  scriptContent.addEventListener('click', updateCursorPosition);
  scriptContent.addEventListener('keyup', updateCursorPosition);
  
  // Set up search functionality
  document.getElementById('search-scripts').addEventListener('input', filterScripts);
  
  // Load all scripts for the sidebar
  loadAllScripts();
  
  // Load script content if editing existing script
  if (scriptId) {
    loadScriptContent(scriptId);
  } else {
    // Initialize with empty content and template
    scriptContent.value = getScriptTemplate();
    updateLineNumbers();
    highlightSyntax(); // Initialize syntax highlighting
  }
  
  // Load temporary script content if available
  if (urlParams.get('loadTemp')) {
    // Load temporary script content from storage
    chrome.storage.local.get('tempScriptContent', function(result) {
      if (result.tempScriptContent) {
        scriptContent.value = result.tempScriptContent;
        updateLineNumbers();
        highlightSyntax(); // Update syntax highlighting
        
        // Clear the temporary storage
        chrome.storage.local.remove('tempScriptContent');
      }
    });
  }
}

/**
 * Get a template for new scripts
 */
function getScriptTemplate() {
  return `[script]
name = "Hello World Script"
namespace = "zedmonkey"
version = "1.0"
description = "Muestra una alerta de 'Hello World' al cargar la página"
author = "Zedmonkey User"
match = "*://*/*"
grant = "none"

(function() {
    'use strict';
    
    // Crear un elemento de notificación estilizado
    const notification = document.createElement('div');
    notification.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        font-family: Arial, sans-serif;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: opacity 0.5s ease-in-out;
    \`;
    notification.textContent = '¡Hello World desde Zedmonkey!';
    
    // Añadir la notificación al documento
    document.body.appendChild(notification);
    
    // Desvanecer y eliminar después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
    
    // También mostrar en la consola
    console.log('Hello World desde Zedmonkey!');
})();
`;
}

/**
 * Load all scripts for the sidebar
 */
function loadAllScripts() {
  chrome.runtime.sendMessage({ action: 'getScripts' }, (response) => {
    if (response && response.scripts) {
      renderScriptsList(response.scripts);
    } else {
      showStatusMessage('Error loading scripts', true);
    }
  });
}

/**
 * Render the scripts list in the sidebar
 */
function renderScriptsList(scripts) {
  const scriptsListElement = document.getElementById('scripts-list');
  scriptsListElement.innerHTML = '';
  
  if (scripts.length === 0) {
    scriptsListElement.innerHTML = '<div class="empty-state">No scripts installed</div>';
    return;
  }
  
  scripts.forEach(script => {
    const scriptItem = document.createElement('div');
    scriptItem.className = 'script-item';
    if (script.id === scriptId) {
      scriptItem.classList.add('active');
    }
    
    // Set border color based on script type
    const scriptType = getScriptType(script);
    if (scriptType === 'css') {
      scriptItem.style.borderLeftColor = '#4caf50';
    } else if (scriptType === 'bookmarklet') {
      scriptItem.style.borderLeftColor = '#2196f3';
    } else {
      scriptItem.style.borderLeftColor = '#ffcc00'; // Default for JS
    }
    
    const scriptInfo = document.createElement('div');
    scriptInfo.className = 'script-info';
    
    // Create badge and name container
    const nameContainer = document.createElement('div');
    nameContainer.style.display = 'flex';
    nameContainer.style.alignItems = 'center';
    
    // Add script type badge
    const badge = document.createElement('span');
    badge.className = `script-badge ${scriptType}`;
    badge.textContent = scriptType.toUpperCase();
    nameContainer.appendChild(badge);
    
    // Add script name
    const scriptName = document.createElement('div');
    scriptName.className = 'script-name';
    scriptName.style.display = 'inline';
    scriptName.textContent = script.metadata?.name || 'Unnamed Script';
    nameContainer.appendChild(scriptName);
    
    scriptInfo.appendChild(nameContainer);
    
    // Add script metadata
    const scriptMeta = document.createElement('div');
    scriptMeta.className = 'script-meta';
    scriptMeta.textContent = `v${script.metadata?.version || '1.0'} • ${script.metadata?.match?.[0] || '*'}`;
    scriptInfo.appendChild(scriptMeta);
    
    // Add script description if available
    if (script.metadata?.description) {
      const scriptDesc = document.createElement('div');
      scriptDesc.className = 'script-description';
      scriptDesc.textContent = script.metadata.description;
      scriptInfo.appendChild(scriptDesc);
    }
    
    const toggleSwitch = document.createElement('label');
    toggleSwitch.className = 'toggle-switch';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.checked = script.enabled !== false;
    toggleInput.dataset.scriptId = script.id;
    toggleInput.addEventListener('change', toggleScriptEnabled);
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    toggleSwitch.appendChild(toggleInput);
    toggleSwitch.appendChild(slider);
    
    scriptItem.appendChild(scriptInfo);
    scriptItem.appendChild(toggleSwitch);
    
    // Add click event to edit the script
    scriptInfo.addEventListener('click', () => {
      window.location.href = `editor.html?id=${script.id}&name=${encodeURIComponent(script.metadata?.name || 'Script')}`;
    });
    
    scriptsListElement.appendChild(scriptItem);
  });
}

/**
 * Determine script type based on content or metadata
 */
function getScriptType(script) {
  if (!script.content) return 'js';
  
  if (script.metadata?.type) {
    return script.metadata.type.toLowerCase();
  }
  
  if (script.content.includes('@resource') || script.content.includes('@require')) {
    return 'js';
  }
  
  if (script.content.trim().startsWith('javascript:')) {
    return 'bookmarklet';
  }
  
  if (script.content.includes('@-moz-document') || 
      script.content.includes('@namespace') ||
      script.content.includes('@media')) {
    return 'js';
  }
  
  return 'js';
}

/**
 * Toggle script enabled/disabled state
 */
function toggleScriptEnabled(event) {
  const scriptId = event.target.dataset.scriptId;
  const enabled = event.target.checked;
  
  chrome.runtime.sendMessage(
    { action: 'toggleScriptEnabled', scriptId, enabled },
    (response) => {
      if (response && response.success) {
        showStatusMessage(`Script ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        showStatusMessage('Error updating script state', true);
        // Revert the toggle if there was an error
        event.target.checked = !enabled;
      }
    }
  );
}

/**
 * Filter scripts based on search input
 */
function filterScripts(event) {
  const searchTerm = event.target.value.toLowerCase();
  const scriptItems = document.querySelectorAll('.script-item');
  
  scriptItems.forEach(item => {
    const scriptName = item.querySelector('.script-name').textContent.toLowerCase();
    const scriptMeta = item.querySelector('.script-meta').textContent.toLowerCase();
    
    if (scriptName.includes(searchTerm) || scriptMeta.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Load script content from storage
 */
function loadScriptContent(id) {
  chrome.runtime.sendMessage(
    { action: 'getScriptContent', scriptId: id },
    (response) => {
      if (response && response.content) {
        document.getElementById('script-content').value = response.content;
        updateLineNumbers();
        showStatusMessage('Script loaded successfully');
      } else {
        showStatusMessage('Error loading script', true);
      }
    }
  );
}

/**
 * Save script to storage
 */
function saveScript() {
  const scriptContent = document.getElementById('script-content').value.trim();
  
  if (!scriptContent) {
    showStatusMessage('Please enter script content', true);
    return;
  }
  
  // Determine if we're updating or adding
  const action = scriptId ? 'updateScriptContent' : 'addScript';
  
  // Send to background script for processing
  chrome.runtime.sendMessage(
    { action, scriptContent, scriptId },
    (response) => {
      if (response && response.success) {
        showStatusMessage('Script saved successfully');
        
        // If this is a new script, redirect to edit with the new ID
        if (!scriptId && response.scriptId) {
          window.location.href = `editor.html?id=${response.scriptId}&name=${encodeURIComponent(response.name || 'Script')}`;
        }
      } else {
        showStatusMessage(`Error saving script: ${response.error || 'Unknown error'}`, true);
      }
    }
  );
}

/**
 * Cancel editing and return to popup
 */
function cancelEdit() {
  window.close();
}

/**
 * Log script content to console (for debugging)
 */
function logScriptContent() {
  console.log(document.getElementById('script-content').value);
  showStatusMessage('Script content logged to console');
}

/**
 * Update line numbers based on content
 */
function updateLineNumbers() {
  const textarea = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  
  // Count lines
  const lines = textarea.value.split('\n').length;
  
  // Generate line numbers
  lineNumbers.innerHTML = '';
  for (let i = 1; i <= Math.max(10, lines); i++) {
    const div = document.createElement('div');
    div.textContent = i;
    lineNumbers.appendChild(div);
  }
}

/**
 * Synchronize scrolling between textarea and line numbers
 */
function syncScroll() {
  const textarea = document.getElementById('script-content');
  const lineNumbers = document.getElementById('line-numbers');
  const highlightLayer = document.getElementById('highlight-layer');
  
  lineNumbers.scrollTop = textarea.scrollTop;
  
  // Sync highlight layer
  if (highlightLayer) {
    highlightLayer.scrollTop = textarea.scrollTop;
    highlightLayer.scrollLeft = textarea.scrollLeft;
  }
}

/**
 * Handle tab key in textarea
 */
function handleTabKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    
    const textarea = e.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert tab at cursor position
    textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
    
    // Move cursor after the inserted tab
    textarea.selectionStart = textarea.selectionEnd = start + 2;
  }
}

/**
 * Show status message
 */
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.style.color = isError ? '#f44336' : '#4caf50';
  
  // Clear message after 3 seconds
  setTimeout(() => {
    statusElement.textContent = '';
  }, 3000);
}

// Initialize the editor when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEditor);

/**
 * Download script as a file
 */
function downloadScript() {
  const scriptContent = document.getElementById('script-content').value;
  const scriptTitle = document.getElementById('script-title').textContent;
  
  // Create a safe filename
  const filename = scriptTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.js';
  
  // Create a blob and download link
  const blob = new Blob([scriptContent], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
  
  showStatusMessage('Script downloaded');
}

/**
 * Refresh script (reload from storage)
 */
function refreshScript() {
  if (scriptId) {
    loadScriptContent(scriptId);
    showStatusMessage('Script refreshed');
  } else {
    showStatusMessage('Cannot refresh new script', true);
  }
}

/**
 * Delete the current script
 */
function deleteScript() {
  if (!scriptId) {
    showStatusMessage('Cannot delete new script', true);
    return;
  }
  
  if (confirm('Are you sure you want to delete this script?')) {
    chrome.runtime.sendMessage(
      { action: 'removeScript', scriptId },
      (response) => {
        if (response && response.success) {
          showStatusMessage('Script deleted');
          // Redirect to create a new script
          setTimeout(() => {
            window.location.href = 'editor.html';
          }, 1000);
        } else {
          showStatusMessage('Error deleting script', true);
        }
      }
    );
  }
}
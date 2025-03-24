// Zedmonkey Storage Library
// Handles script storage and retrieval

/**
 * Get all stored scripts
 * @returns {Promise<Array>} - Array of script objects
 */
export async function getScripts() {
    return new Promise((resolve) => {
      chrome.storage.local.get('scripts', (result) => {
        resolve(result.scripts || []);
      });
    });
  }
  
  /**
   * Save a script to storage
   * @param {object} script - The script object to save
   * @returns {Promise<void>}
   */
  export async function saveScript(script) {
    // Generate a unique ID if not present
    if (!script.id) {
      script.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    // Add timestamp
    script.addedAt = Date.now();
    
    // Get existing scripts
    const scripts = await getScripts();
    
    // Check if script with same name and namespace exists
    const existingIndex = scripts.findIndex(s => 
      s.metadata.name === script.metadata.name && 
      s.metadata.namespace === script.metadata.namespace
    );
    
    if (existingIndex >= 0) {
      // Update existing script
      scripts[existingIndex] = script;
    } else {
      // Add new script
      scripts.push(script);
    }
    
    // Save back to storage
    return new Promise((resolve) => {
      chrome.storage.local.set({ scripts }, resolve);
    });
  }
  
  /**
   * Remove a script from storage
   * @param {string} scriptId - The ID of the script to remove
   * @returns {Promise<void>}
   */
  export async function removeScript(scriptId) {
    const scripts = await getScripts();
    const filteredScripts = scripts.filter(script => script.id !== scriptId);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ scripts: filteredScripts }, resolve);
    });
  }
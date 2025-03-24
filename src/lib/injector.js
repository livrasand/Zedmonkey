// Zedmonkey Injector Library
// Handles script injection into web pages

/**
 * Inject a script into a tab
 * @param {number} tabId - The ID of the tab to inject into
 * @param {object} script - The script object containing content and metadata
 */
export function injectScript(tabId, script) {
    // Create a function that will be serialized and injected
    const injectionCode = `
      (function() {
        try {
          // Create script element
          const scriptElement = document.createElement('script');
          scriptElement.textContent = ${JSON.stringify(script.content)};
          scriptElement.setAttribute('data-zedmonkey-script', ${JSON.stringify(script.metadata.name)});
          
          // Add to document
          (document.head || document.documentElement).appendChild(scriptElement);
          
          // Log success
          console.log('[Zedmonkey] Injected script: ' + ${JSON.stringify(script.metadata.name)});
        } catch (error) {
          console.error('[Zedmonkey] Error injecting script:', error);
        }
      })();
    `;
    
    // Execute the injection code
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: new Function(injectionCode),
      world: "MAIN" // Execute in the main world to have access to page's JavaScript
    }).catch(error => {
      console.error(`Error injecting script into tab ${tabId}:`, error);
    });
  }
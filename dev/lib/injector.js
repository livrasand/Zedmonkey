function injectScript(e, t) {
  t = `
    (function() {
      try {
        // Create script element
        const scriptElement = document.createElement('script');
        scriptElement.textContent = ${JSON.stringify(t.content)};
        scriptElement.setAttribute('data-zedmonkey-script', ${JSON.stringify(t.metadata.name)});
        
        // Add to document
        (document.head || document.documentElement).appendChild(scriptElement);
        
        // Log success
        console.log('[Zedmonkey] Injected script: ' + ${JSON.stringify(t.metadata.name)});
      } catch (error) {
        console.error('[Zedmonkey] Error injecting script:', error);
      }
    })();
  `;
  chrome.scripting.executeScript({
      target: {
          tabId: e
      },
      func: new Function(t),
      world: "MAIN"
  }).catch(t => {
      console.error(`Error injecting script into tab ${e}:`, t)
  })
}
export {
  injectScript
};
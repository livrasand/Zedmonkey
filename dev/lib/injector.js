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
async function injectScriptWithResources(tabId, script) {
    // Inyecta requires
    for (const req of script.requires) {
        if (req.loaded && req.textContent) {
            await chrome.scripting.executeScript({
                target: { tabId, allFrames: true },
                func: content => {
                    const s = document.createElement('script');
                    s.textContent = content;
                    (document.head || document.documentElement).appendChild(s).remove();
                },
                args: [req.textContent],
                world: 'MAIN'
            });
        }
    }
    // Inyecta GM_api con recursos
    await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: (resources, gmInfo) => {
            window.GM_getResourceText = name => {
                const res = resources.find(r => r.name === name);
                return res ? res.resText : null;
            };
            window.GM_getResourceURL = name => {
                const res = resources.find(r => r.name === name);
                return res ? res.resURL : null;
            };
            window.GM_info = gmInfo;
        },
        args: [script.resources, script.GM_info],
        world: 'MAIN'
    });
    // Inyecta el script principal
    await chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: content => {
            const s = document.createElement('script');
            s.textContent = content;
            (document.head || document.documentElement).appendChild(s).remove();
        },
        args: [script.textContent],
        world: 'MAIN'
    });
}
export {
  injectScript,
  injectScriptWithResources
};
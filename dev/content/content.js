// Listen for injection messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "injectScript" && message.resourcePath) {
        // Forward to background script for proper handling
        chrome.runtime.sendMessage(message);
        return true;
    }
});

function detectUserscripts() {
  var e;
  for (e of document.querySelectorAll("script")) {
      var t = e.textContent || "";
      if (t.includes("// ==UserScript==") && t.includes("// ==/UserScript==")) return {
          detected: !0,
          scriptContent: t
      }
  }
  var o = document.querySelectorAll('a[href$=".user.js"]');
  return 0 < o.length ? {
      detected: !0,
      scriptLinks: Array.from(o).map(e => ({
          url: e.href,
          text: e.textContent || e.href
      }))
  } : {
      detected: !1
  }
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 3px 15px rgba(0,0,0,0.4);
  border-bottom: 2px solid #3498db;
  max-height: 80vh;
  overflow-y: auto;
`, "Userscript"),
      n = "1.0",
      s = "",
      i = "";
  o.scriptContent && ((e = o.scriptContent.match(/@name\s+(.+?)(\n|$)/)) && (r = e[1].trim()), (e = o.scriptContent.match(/@version\s+(.+?)(\n|$)/)) && (n = e[1].trim()), (e = o.scriptContent.match(/@author\s+(.+?)(\n|$)/)) && (s = e[1].trim()), e = o.scriptContent.match(/@description\s+(.+?)(\n|$)/)) && (i = e[1].trim());
  document.createElement("div").style.cssText = `
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 300px;
  margin-bottom: 10px;
`;
  var e = document.createElement("div"),
      a = (e.style.cssText = `
  display: flex;
  align-items: center;
  margin-right: 15px;
  flex-shrink: 0;
`, document.createElement("div")),
      a = (a.style.cssText = `
  width: 40px;
  height: 40px;
  background-image: url(${chrome.runtime.getURL("../icons/icon48.png")});
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`, e.appendChild(a), document.createElement("div")),
      c = (a.style.cssText = `
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`, document.createElement("div")),
      d = (c.textContent = "Zedmonkey - Instalación de Script", c.style.cssText = `
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 6px;
  color: #3498db;
`, document.createElement("div")),
      l = (d.textContent = `${r} (v${n})`, d.style.cssText = `
  font-size: 14px;
  font-weight: 500;
`, document.createElement("div")),
      p = (l.textContent = s ? "por " + s : "", l.style.cssText = `
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
`, document.createElement("div")),
      c = (i && (p.textContent = i, p.style.cssText = `
    font-size: 12px;
    margin-top: 5px;
    max-width: 500px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.9;
  `, p.title = i), a.appendChild(c), a.appendChild(d), s && a.appendChild(l), i && a.appendChild(p), document.createElement("div"));
  c.style.cssText = `
  display: flex;
  gap: 12px;
  align-items: center;
`;
  let u = document.createElement("button"),
      m = (u.textContent = "Instalar", u.style.cssText = `
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`, u.onmouseover = () => {
          u.style.background = "#45a049"
      }, u.onmouseout = () => {
          u.style.background = "#4CAF50"
      }, document.createElement("button")),
      x = (m.textContent = "Descargar", m.style.cssText = `
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`, m.onmouseover = () => {
          m.style.background = "#2980b9"
      }, m.onmouseout = () => {
          m.style.background = "#3498db"
      }, document.createElement("button")),
      h = (x.textContent = "Instalar y Descargar", x.style.cssText = `
  background: #9b59b6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`, x.onmouseover = () => {
          x.style.background = "#8e44ad"
      }, x.onmouseout = () => {
          x.style.background = "#9b59b6"
      }, document.createElement("button")),
      g = (h.textContent = "Editar", h.style.cssText = `
  background: #f39c12;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`, h.onmouseover = () => {
          h.style.background = "#e67e22"
      }, h.onmouseout = () => {
          h.style.background = "#f39c12"
      }, document.createElement("button"));

  function b() {
      var e = new Blob([o.scriptContent], {
              type: "text/javascript"
          }),
          e = URL.createObjectURL(e),
          t = document.createElement("a");
      t.href = e, t.download = r.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".user.js", document.body.appendChild(t), t.click(), document.body.removeChild(t), URL.revokeObjectURL(e)
  }
  g.textContent = "Cancelar", g.style.cssText = `
  background: #95a5a6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`, g.onmouseover = () => {
      g.style.background = "#7f8c8d"
  }, g.onmouseout = () => {
      g.style.background = "#95a5a6"
  }, u.addEventListener("click", () => {
      chrome.runtime.sendMessage({
          action: "addScript",
          scriptContent: o.scriptContent
      }, e => {
          e && e.success ? showNotification("Script instalado correctamente!") : showNotification("Error al instalar el script: " + (e?.error || "Error desconocido"), !0), t.remove()
      })
  }), m.addEventListener("click", () => {
      b(), showNotification("Script descargado correctamente!"), t.remove()
  }), x.addEventListener("click", () => {
      chrome.runtime.sendMessage({
          action: "addScript",
          scriptContent: o.scriptContent
      }, e => {
          e && e.success ? (b(), showNotification("Script instalado y descargado correctamente!")) : (showNotification("Error al instalar el script: " + (e?.error || "Error desconocido"), !0), b()), t.remove()
      })
  }), h.addEventListener("click", () => {
      chrome.runtime.sendMessage({
          action: "openScriptInEditor",
          scriptContent: o.scriptContent
      }), t.remove()
  }), g.addEventListener("click", () => {
      t.remove()
  }), c.appendChild(u), c.appendChild(m), c.appendChild(x), c.appendChild(h), c.appendChild(g), t.appendChild(e), t.appendChild(a), t.appendChild(c), document.body.appendChild(t);
  let f = document.createElement("div");
  f.innerHTML = "&times;", f.style.cssText = `
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 20px;
  cursor: pointer;
  color: #95a5a6;
  transition: color 0.2s;
`, f.onmouseover = () => {
      f.style.color = "#ffffff"
  }, f.onmouseout = () => {
      f.style.color = "#95a5a6"
  }, f.onclick = () => {
      t.remove()
  }, t.appendChild(f)
}
async function fetchScript(r) {
  try {
      try {
          var e = await fetch(r);
          if (e.ok) return await e.text();
          throw new Error("Failed to fetch script")
      } catch (e) {
          return console.log("Direct fetch failed, trying XMLHttpRequest:", e), new Promise((e, t) => {
              let o = new XMLHttpRequest;
              o.open("GET", r, !0), o.onload = function() {
                  200 <= o.status && o.status < 300 ? e(o.responseText) : t(new Error("XHR failed with status: " + o.status))
              }, o.onerror = function() {
                  t(new Error("XHR network error"))
              }, o.send()
          })
      }
  } catch (e) {
      return e.message.includes("Extension context invalidated") || e.message.includes("context invalidated") ? (console.error("Extension context error. The extension may have been updated or reloaded."), showNotification("Extension was updated. Please refresh the page to use Zedmonkey features.", !0, 7e3), {
          error: !0,
          contextInvalidated: !0,
          message: "Extension context invalidated. Please refresh the page."
      }) : (console.error("Error fetching script:", e), {
          error: !0,
          message: e.message || "Unknown error"
      })
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

// Initial injection for persisted scripts
chrome.storage.sync.get({ injectionEnabled: true }, ({ injectionEnabled }) => {
    if (injectionEnabled) {
        chrome.runtime.sendMessage({ 
            action: "getScriptsForCurrentPage",
            url: window.location.href
        });
    }
});

chrome.runtime.onMessage.addListener((e, t, o) => {
  if ("detectUserscript" === e.action) {
      let t = detectUserscripts();
      o(t), t.detected && t.scriptContent && chrome.storage.sync.get("autoShowInstallUI", e => {
          !1 !== e.autoShowInstallUI && createInstallUI(t)
      })
  }
  "installScript" === e.action && (e.scriptContent ? createInstallUI({
      scriptContent: e.scriptContent
  }) : e.scriptUrl && fetchScript(e.scriptUrl).then(e => {
      e && e.error ? e.contextInvalidated || showNotification("Error fetching script: " + e.message, !0) : e ? createInstallUI({
          scriptContent: e
      }) : showNotification("Failed to fetch script content", !0)
  }))
}), window.addEventListener("load", () => {
  chrome.storage.sync.get("autoDetectScripts", e => {
      if (!1 !== e.autoDetectScripts) {
          let t = detectUserscripts();
          t.detected && (chrome.runtime.sendMessage({
              action: "scriptDetected",
              scriptData: t
          }), chrome.storage.sync.get("autoShowInstallUI", e => {
              !1 !== e.autoShowInstallUI && t.scriptContent && createInstallUI(t)
          }), t.scriptLinks) && 0 < t.scriptLinks.length && addUserscriptLinkHandlers()
      }
  })
});
let observer = new MutationObserver(e => {
  let t = !1;
  for (var o of e)
      if ("childList" === o.type && 0 < o.addedNodes.length) {
          t = !0;
          break
      } t && addUserscriptLinkHandlers()
});

function startObserver() {
  document.body ? observer.observe(document.body, {
      childList: !0,
      subtree: !0
  }) : window.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body, {
          childList: !0,
          subtree: !0
      })
  })
}
startObserver(), document.addEventListener("DOMContentLoaded", addUserscriptLinkHandlers);
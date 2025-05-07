function detectUserscripts(){var e;for(e of document.querySelectorAll("script")){var t=e.textContent||"";if(t.includes("// ==UserScript==")&&t.includes("// ==/UserScript=="))return{detected:!0,scriptContent:t}}var n=document.querySelectorAll('a[href$=".user.js"]');return 0<n.length?{detected:!0,scriptLinks:Array.from(n).map(e=>({url:e.href,text:e.textContent||e.href}))}:{detected:!1}}function createInstallUI(e){var t=document.getElementById("zedmonkey-install-ui");t&&t.remove();let n=document.createElement("div"),o=(n.id="zedmonkey-install-ui",n.style.cssText=`
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
    flex-direction: column;
    box-shadow: 0 3px 15px rgba(0,0,0,0.4);
    border-bottom: 2px solid #3498db;
    max-height: 80vh;
    overflow-y: auto;
`,"Userscript"),r="1.0",i="";e.scriptContent&&((t=e.scriptContent.match(/@name\s+(.+?)(\n|$)/))&&(o=t[1].trim()),(t=e.scriptContent.match(/@version\s+(.+?)(\n|$)/))&&(r=t[1].trim()),(t=e.scriptContent.match(/@author\s+(.+?)(\n|$)/))&&t[1].trim(),t=e.scriptContent.match(/@description\s+(.+?)(\n|$)/))&&(i=t[1].trim());var t=document.createElement("div"),c=(t.style.cssText=`
        display: flex;
        align-items: center;
        margin-bottom: 15px;
    `,document.createElement("div"));c.style.cssText=`
        width: 40px;
        height: 40px;
        margin-right: 15px;
        flex-shrink: 0;
    `;let s=document.createElement("div"),a=(s.style.cssText=`
        width: 40px;
        height: 40px;
        background-image: url(${chrome.runtime.getURL("icons/icon48.png")});
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        border-radius: 8px;
        background-color: #3498db;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 20px;
        color: white;
    `,s.textContent="Z",t=>{if(0!==t.length){let e=t[0];var n=new Image;n.onload=()=>{s.style.backgroundImage=`url(${chrome.runtime.getURL(e)})`,s.textContent=""},n.onerror=()=>{console.log("Failed to load icon from: "+e),a(t.slice(1))},n.src=chrome.runtime.getURL(e)}});a(["icons/icon48.png","../icons/icon48.png","icon48.png","images/icon48.png","/icons/icon48.png"]),c.appendChild(s);var d=document.createElement("div"),l=(d.style.cssText=`
        flex: 1;
        display: flex;
        flex-direction: column;
    `,document.createElement("div")),p=(l.textContent="Instalando script",l.style.cssText=`
        font-weight: bold;
        font-size: 16px;
        color: white;
    `,document.createElement("div")),l=(p.textContent=o+", "+r,p.style.cssText=`
        font-size: 14px;
        font-weight: 500;
        color: #3498db;
    `,d.appendChild(l),d.appendChild(p),t.appendChild(c),t.appendChild(d),document.createElement("div")),p=(l.style.cssText=`
        display: flex;
        flex-direction: column;
        margin-bottom: 15px;
        padding: 10px;
        background: rgba(0,0,0,0.2);
        border-radius: 4px;
    `,document.createElement("div")),c=(p.style.cssText=`
        margin-bottom: 8px;
    `,document.createElement("div")),d=(c.textContent=i||"Adds a button that scrolls to the top of each response on ChatGPT.com",c.style.cssText=`
        font-size: 13px;
        color: #ecf0f1;
    `,p.appendChild(c),document.createElement("div")),c=(d.style.cssText=`
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        margin-bottom: 8px;
    `,document.createElement("div")),m=(c.style.cssText=`
        display: flex;
        flex-direction: column;
    `,document.createElement("div"));m.textContent="@grant",m.style.cssText=`
        font-size: 12px;
        color: #7f8c8d;
    `;let u=[];e.scriptContent&&(h=e.scriptContent.match(/@grant\s+(.+?)(\n|$)/g))&&0<h.length&&(u=h.map(e=>e.replace(/@grant\s+/,"").trim()));var h=document.createElement("div"),m=(h.textContent=0<u.length?u.join("\n"):"none",h.style.cssText=`
        font-size: 12px;
        color: #ecf0f1;
    `,c.appendChild(m),c.appendChild(h),document.createElement("div")),h=(m.style.cssText=`
        display: flex;
        flex-direction: column;
    `,document.createElement("div"));h.textContent="@match",h.style.cssText=`
        font-size: 12px;
        color: #7f8c8d;
    `;let x=[];e.scriptContent&&(g=e.scriptContent.match(/@match\s+(.+?)(\n|$)/g),f=e.scriptContent.match(/@include\s+(.+?)(\n|$)/g),g&&0<g.length&&(x=g.map(e=>e.replace(/@match\s+/,"").trim())),f)&&0<f.length&&(g=f.map(e=>e.replace(/@include\s+/,"").trim()),x=[...x,...g]);var f=document.createElement("div"),g=(f.textContent=0<x.length?x.join("\n"):"http://*/*\nhttps://*/*",f.style.cssText=`
        font-size: 12px;
        color: #ecf0f1;
    `,m.appendChild(h),m.appendChild(f),d.appendChild(c),d.appendChild(m),l.appendChild(p),l.appendChild(d),document.createElement("div"));g.style.cssText=`
        display: flex;
        gap: 5px;
        justify-content: flex-end;
        margin-top: 10px;
        padding: 8px;
        border-radius: 4px;
    `;let y=document.createElement("button"),b=(y.innerHTML="Install <span style='opacity: 0.7; font-size: 11px; margin-left: 4px;'>(Ctrl+Enter)</span>",y.style.cssText=`
        background: #2c3e50;
        color: white;
        border: 1px solid #4CAF50;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
        display: flex;
        align-items: center;
    `,y.onmouseover=()=>{y.style.background="#374a5c"},y.onmouseout=()=>{y.style.background="#2c3e50"},document.createElement("button")),v=(b.textContent="Cerrar",b.style.cssText=`
        background: #2c3e50;
        color: white;
        border: 1px solid #95a5a6;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
    `,b.onmouseover=()=>{b.style.background="#374a5c"},b.onmouseout=()=>{b.style.background="#2c3e50"},document.createElement("button"));v.textContent="Editar",v.style.cssText=`
        background: #2c3e50;
        color: white;
        border: 1px solid #f39c12;
        padding: 6px 12px;
        border-radius: 2px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: background 0.2s;
    `,v.onmouseover=()=>{v.style.background="#374a5c"},v.onmouseout=()=>{v.style.background="#2c3e50"};h=(e,t)=>{var n=e.textContent||e.innerText;e.innerHTML=`<span style="color: ${t}; margin-right: 4px;">+</span>`+n};h(b,"#95a5a6"),h(v,"#f39c12"),g.appendChild(y),g.appendChild(b),g.appendChild(v),n.appendChild(t),n.appendChild(l),n.appendChild(g),y.addEventListener("click",()=>{chrome.runtime.sendMessage({action:"addScript",scriptContent:e.scriptContent},e=>{e&&e.success?showNotification("Script instalado correctamente!"):showNotification("Error al instalar el script: "+(e?.error||"Error desconocido"),!0),n.remove()})}),v.addEventListener("click",()=>{chrome.runtime.sendMessage({action:"openScriptInEditor",scriptContent:e.scriptContent}),n.remove()}),b.addEventListener("click",()=>{n.remove()});let C=document.createElement("div");C.innerHTML="&times;",C.style.cssText=`
        position: absolute;
        top: 10px;
        right: 15px;
        font-size: 20px;
        cursor: pointer;
        color: #95a5a6;
        transition: color 0.2s;
    `,C.onmouseover=()=>{C.style.color="#ffffff"},C.onmouseout=()=>{C.style.color="#95a5a6"},C.onclick=()=>{n.remove()},n.appendChild(C),document.body.appendChild(n)}async function fetchScript(o){try{try{var e=await fetch(o);if(e.ok)return await e.text();throw new Error("Failed to fetch script")}catch(e){return console.log("Direct fetch failed, trying XMLHttpRequest:",e),new Promise((e,t)=>{let n=new XMLHttpRequest;n.open("GET",o,!0),n.onload=function(){200<=n.status&&n.status<300?e(n.responseText):t(new Error("XHR failed with status: "+n.status))},n.onerror=function(){t(new Error("XHR network error"))},n.send()})}}catch(e){return e.message.includes("Extension context invalidated")||e.message.includes("context invalidated")?(console.error("Extension context error. The extension may have been updated or reloaded."),showNotification("Extension was updated. Please refresh the page to use Zedmonkey features.",!0,7e3),{error:!0,contextInvalidated:!0,message:"Extension context invalidated. Please refresh the page."}):(console.error("Error fetching script:",e),{error:!0,message:e.message||"Unknown error"})}}function showNotification(e,t=!1,n=3e3){let o=document.createElement("div");o.style.cssText=`
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
`,o.textContent=e,document.body.appendChild(o),setTimeout(()=>{o.style.opacity="0",o.style.transition="opacity 0.5s",setTimeout(()=>o.remove(),500)},n)}function addUserscriptLinkHandlers(){document.querySelectorAll('a[href$=".user.js"]').forEach(n=>{n.dataset.zedmonkeyHandled||(n.dataset.zedmonkeyHandled="true",n.addEventListener("click",async e=>{e.preventDefault(),e.stopPropagation(),e=n.href,console.log("Intercepted userscript link click:",e);try{var t=await fetchScript(e);if(t&&t.error)return t.contextInvalidated||showNotification("Error fetching script: "+t.message,!0),!1;t?createInstallUI({scriptContent:t}):showNotification("Failed to fetch script content",!0)}catch(e){console.error("Error in click handler:",e),showNotification("Error: "+(e.message||"Unknown error"),!0)}return!1}))})}chrome.runtime.onMessage.addListener((r,e,i)=>{if("injectScript"===r.action&&r.resourcePath)return chrome.storage.local.get("injectionEnabled",t=>{if(!1===t.injectionEnabled)return;t=()=>{try{var t=document.querySelector("script[nonce]")?.nonce||"",n=document.createElement("script");n.src=chrome.runtime.getURL(r.resourcePath),n.setAttribute("nonce",t),n.setAttribute("type","module"),n.crossOrigin="anonymous";let e=n.cloneNode(!0);(document.head||document.documentElement).appendChild(e),e.onload=()=>{e.remove(),i({success:!0})},e.onerror=()=>{console.warn("Primary script injection failed, trying fallback..."),o()}}catch(e){console.error("Primary injection exception:",e),o()}};let o=()=>{try{var e=document.createElement("script"),t=(e.src=chrome.runtime.getURL(r.resourcePath),e.type="text/javascript",document.querySelector("script[nonce]")?.nonce||""),n=(t&&(e.nonce=t),e.cloneNode(!0));(document.head||document.documentElement).appendChild(n),n.remove(),i({success:!0})}catch(e){console.error("Fallback injection also failed:",e),i({success:!1})}};if("text/html"===document.contentType)t();else{t=new Blob([`(${t.toString()})()`],{type:"text/javascript"});let e=URL.createObjectURL(t);import(e).finally(()=>URL.revokeObjectURL(e))}}),!0;if("detectUserscript"!==r.action)return"installScript"===r.action?(r.scriptContent?createInstallUI({scriptContent:r.scriptContent}):r.scriptUrl&&fetchScript(r.scriptUrl).then(e=>{e&&e.error?e.contextInvalidated||showNotification("Error fetching script: "+e.message,!0):e?createInstallUI({scriptContent:e}):showNotification("Failed to fetch script content",!0)}),!0):"getScriptsForCurrentPage"!==r.action&&void 0;{let t=detectUserscripts();return i(t),t.detected&&t.scriptContent&&chrome.storage.sync.get("autoShowInstallUI",e=>{!1!==e.autoShowInstallUI&&createInstallUI(t)}),!0}}),chrome.storage.sync.get({injectionEnabled:!0},({injectionEnabled:e})=>{e&&chrome.runtime.sendMessage({action:"getScriptsForCurrentPage",url:window.location.href})}),window.addEventListener("load",()=>{chrome.storage.sync.get("autoDetectScripts",e=>{if(!1!==e.autoDetectScripts){let t=detectUserscripts();t.detected&&(chrome.runtime.sendMessage({action:"scriptDetected",scriptData:t}),chrome.storage.sync.get("autoShowInstallUI",e=>{!1!==e.autoShowInstallUI&&t.scriptContent&&createInstallUI(t)}),t.scriptLinks)&&0<t.scriptLinks.length&&addUserscriptLinkHandlers()}})});let observer=new MutationObserver(e=>{let t=!1;for(var n of e)if("childList"===n.type&&0<n.addedNodes.length){t=!0;break}t&&addUserscriptLinkHandlers()});function startObserver(){document.body?observer.observe(document.body,{childList:!0,subtree:!0}):window.addEventListener("DOMContentLoaded",()=>{observer.observe(document.body,{childList:!0,subtree:!0}),addUserscriptLinkHandlers()})}function initEditor(e){var t=document.createElement("div");return t.innerHTML=`
        <textarea id="zedEditor" 
                  style="width:100%; height:300px; 
                         font-family: 'Fira Code', monospace;
                         tab-size: 2" 
                  spellcheck="false">${e}</textarea>
    `,t.querySelector("#zedEditor").addEventListener("keydown",e=>{"Tab"===e.key&&(e.preventDefault(),document.execCommand("insertText",!1,"  "))}),t}startObserver();
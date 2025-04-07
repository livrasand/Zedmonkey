chrome.runtime.onMessage.addListener((r,e,c)=>{function o(){var e;for(e of document.querySelectorAll("script")){var t=e.textContent||"";if(t.includes("// ==UserScript==")&&t.includes("// ==/UserScript=="))return{detected:!0,scriptContent:t}}var n=document.querySelectorAll('a[href$=".user.js"]');return 0<n.length?{detected:!0,scriptLinks:Array.from(n).map(e=>({url:e.href,text:e.textContent||e.href}))}:{detected:!1}}function i(n){(i=document.getElementById("zedmonkey-install-ui"))&&i.remove();let t=document.createElement("div"),o=(t.id="zedmonkey-install-ui",t.style.cssText=`
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
`,"Userscript"),e="1.0",r="",c="";n.scriptContent&&((i=n.scriptContent.match(/@name\s+(.+?)(\n|$)/))&&(o=i[1].trim()),(i=n.scriptContent.match(/@version\s+(.+?)(\n|$)/))&&(e=i[1].trim()),(i=n.scriptContent.match(/@author\s+(.+?)(\n|$)/))&&(r=i[1].trim()),i=n.scriptContent.match(/@description\s+(.+?)(\n|$)/))&&(c=i[1].trim()),document.createElement("div").style.cssText=`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 300px;
  margin-bottom: 10px;
`;(i=document.createElement("div")).style.cssText=`
  display: flex;
  align-items: center;
  margin-right: 15px;
  flex-shrink: 0;
`;var i,s=document.createElement("div");s.style.cssText=`
  width: 40px;
  height: 40px;
  background-image: url(${chrome.runtime.getURL("../icons/icon48.png")});
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`,i.appendChild(s);(s=document.createElement("div")).style.cssText=`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;var a=document.createElement("div"),d=(a.textContent="Zedmonkey - Instalación de Script",a.style.cssText=`
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 6px;
  color: #3498db;
`,document.createElement("div")),l=(d.textContent=`${o} (v${e})`,d.style.cssText=`
  font-size: 14px;
  font-weight: 500;
`,document.createElement("div")),p=(l.textContent=r?"por "+r:"",l.style.cssText=`
  font-size: 12px;
  opacity: 0.8;
  margin-top: 2px;
`,document.createElement("div"));c&&(p.textContent=c,p.style.cssText=`
    font-size: 12px;
    margin-top: 5px;
    max-width: 500px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 0.9;
  `,p.title=c),s.appendChild(a),s.appendChild(d),r&&s.appendChild(l),c&&s.appendChild(p),(a=document.createElement("div")).style.cssText=`
  display: flex;
  gap: 12px;
  align-items: center;
`;let u=document.createElement("button"),m=(u.textContent="Instalar",u.style.cssText=`
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`,u.onmouseover=()=>{u.style.background="#45a049"},u.onmouseout=()=>{u.style.background="#4CAF50"},document.createElement("button")),x=(m.textContent="Descargar",m.style.cssText=`
  background: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`,m.onmouseover=()=>{m.style.background="#2980b9"},m.onmouseout=()=>{m.style.background="#3498db"},document.createElement("button")),h=(x.textContent="Instalar y Descargar",x.style.cssText=`
  background: #9b59b6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`,x.onmouseover=()=>{x.style.background="#8e44ad"},x.onmouseout=()=>{x.style.background="#9b59b6"},document.createElement("button")),g=(h.textContent="Editar",h.style.cssText=`
  background: #f39c12;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`,h.onmouseover=()=>{h.style.background="#e67e22"},h.onmouseout=()=>{h.style.background="#f39c12"},document.createElement("button"));function b(){var e=new Blob([n.scriptContent],{type:"text/javascript"}),e=URL.createObjectURL(e),t=document.createElement("a");t.href=e,t.download=o.replace(/[^a-z0-9]/gi,"_").toLowerCase()+".user.js",document.body.appendChild(t),t.click(),document.body.removeChild(t),URL.revokeObjectURL(e)}g.textContent="Cancelar",g.style.cssText=`
  background: #95a5a6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`,g.onmouseover=()=>{g.style.background="#7f8c8d"},g.onmouseout=()=>{g.style.background="#95a5a6"},u.addEventListener("click",()=>{chrome.runtime.sendMessage({action:"addScript",scriptContent:n.scriptContent},e=>{e&&e.success?y("Script instalado correctamente!"):y("Error al instalar el script: "+(e?.error||"Error desconocido"),!0),t.remove()})}),m.addEventListener("click",()=>{b(),y("Script descargado correctamente!"),t.remove()}),x.addEventListener("click",()=>{chrome.runtime.sendMessage({action:"addScript",scriptContent:n.scriptContent},e=>{e&&e.success?(b(),y("Script instalado y descargado correctamente!")):(y("Error al instalar el script: "+(e?.error||"Error desconocido"),!0),b()),t.remove()})}),h.addEventListener("click",()=>{chrome.runtime.sendMessage({action:"openScriptInEditor",scriptContent:n.scriptContent}),t.remove()}),g.addEventListener("click",()=>{t.remove()}),a.appendChild(u),a.appendChild(m),a.appendChild(x),a.appendChild(h),a.appendChild(g),t.appendChild(i),t.appendChild(s),t.appendChild(a),document.body.appendChild(t);let f=document.createElement("div");f.innerHTML="&times;",f.style.cssText=`
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 20px;
  cursor: pointer;
  color: #95a5a6;
  transition: color 0.2s;
`,f.onmouseover=()=>{f.style.color="#ffffff"},f.onmouseout=()=>{f.style.color="#95a5a6"},f.onclick=()=>{t.remove()},t.appendChild(f)}async function s(o){try{try{var e=await fetch(o);if(e.ok)return await e.text();throw new Error("Failed to fetch script")}catch(e){return console.log("Direct fetch failed, trying XMLHttpRequest:",e),new Promise((e,t)=>{let n=new XMLHttpRequest;n.open("GET",o,!0),n.onload=function(){200<=n.status&&n.status<300?e(n.responseText):t(new Error("XHR failed with status: "+n.status))},n.onerror=function(){t(new Error("XHR network error"))},n.send()})}}catch(e){return e.message.includes("Extension context invalidated")||e.message.includes("context invalidated")?(console.error("Extension context error. The extension may have been updated or reloaded."),y("Extension was updated. Please refresh the page to use Zedmonkey features.",!0,7e3),{error:!0,contextInvalidated:!0,message:"Extension context invalidated. Please refresh the page."}):(console.error("Error fetching script:",e),{error:!0,message:e.message||"Unknown error"})}}function y(e,t=!1,n=3e3){let o=document.createElement("div");o.style.cssText=`
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
`,o.textContent=e,document.body.appendChild(o),setTimeout(()=>{o.style.opacity="0",o.style.transition="opacity 0.5s",setTimeout(()=>o.remove(),500)},n)}function a(){document.querySelectorAll('a[href$=".user.js"]').forEach(n=>{n.dataset.zedmonkeyHandled||(n.dataset.zedmonkeyHandled="true",n.addEventListener("click",async e=>{e.preventDefault(),e.stopPropagation(),e=n.href,console.log("Intercepted userscript link click:",e);try{var t=await s(e);if(t&&t.error)return t.contextInvalidated||y("Error fetching script: "+t.message,!0),!1;t?i({scriptContent:t}):y("Failed to fetch script content",!0)}catch(e){console.error("Error in click handler:",e),y("Error: "+(e.message||"Unknown error"),!0)}return!1}))})}chrome.storage.local.get("injectionEnabled",t=>{if(!1!==t.injectionEnabled&&"injectScript"===r.action&&r.resourcePath){t=()=>{try{var t=document.querySelector("script[nonce]")?.nonce||"",n=document.createElement("script");n.src=chrome.runtime.getURL(r.resourcePath),n.setAttribute("nonce",t),n.setAttribute("type","module"),n.crossOrigin="anonymous";let e=n.cloneNode(!0);(document.head||document.documentElement).appendChild(e),e.onload=()=>{e.remove(),c({success:!0})},e.onerror=()=>{console.warn("Primary script injection failed, trying fallback..."),o()}}catch(e){console.error("Primary injection exception:",e),o()}};let o=()=>{try{var e=document.createElement("script"),t=(e.src=chrome.runtime.getURL(r.resourcePath),e.type="text/javascript",document.querySelector("script[nonce]")?.nonce||""),n=(t&&(e.nonce=t),e.cloneNode(!0));(document.head||document.documentElement).appendChild(n),n.remove(),c({success:!0})}catch(e){console.error("Fallback injection also failed:",e),c({success:!1})}};if("text/html"===document.contentType)t();else{t=new Blob([`(${t.toString()})()`],{type:"text/javascript"});let e=URL.createObjectURL(t);import(e).finally(()=>URL.revokeObjectURL(e))}return!0}}),chrome.storage.sync.get({injectionEnabled:!0},({injectionEnabled:e})=>{e&&chrome.runtime.sendMessage({action:"getScriptsForCurrentPage",url:window.location.href})}),chrome.runtime.onMessage.addListener((e,t,n)=>{if("detectUserscript"===e.action){let t=o();n(t),t.detected&&t.scriptContent&&chrome.storage.sync.get("autoShowInstallUI",e=>{!1!==e.autoShowInstallUI&&i(t)})}"installScript"===e.action&&(e.scriptContent?i({scriptContent:e.scriptContent}):e.scriptUrl&&s(e.scriptUrl).then(e=>{e&&e.error?e.contextInvalidated||y("Error fetching script: "+e.message,!0):e?i({scriptContent:e}):y("Failed to fetch script content",!0)}))}),window.addEventListener("load",()=>{chrome.storage.sync.get("autoDetectScripts",e=>{if(!1!==e.autoDetectScripts){let t=o();t.detected&&(chrome.runtime.sendMessage({action:"scriptDetected",scriptData:t}),chrome.storage.sync.get("autoShowInstallUI",e=>{!1!==e.autoShowInstallUI&&t.scriptContent&&i(t)}),t.scriptLinks)&&0<t.scriptLinks.length&&a()}})});let t=new MutationObserver(e=>{let t=!1;for(var n of e)if("childList"===n.type&&0<n.addedNodes.length){t=!0;break}t&&a()});document.body?t.observe(document.body,{childList:!0,subtree:!0}):window.addEventListener("DOMContentLoaded",()=>{t.observe(document.body,{childList:!0,subtree:!0})}),document.addEventListener("DOMContentLoaded",a)});
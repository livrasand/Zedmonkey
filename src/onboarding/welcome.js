function i18nReplace(){document.querySelectorAll('[class^="__MSG_"], [id^="__MSG_"], [data-i18n]').forEach(e=>{var t=e.dataset.i18n||e.id.replace("__MSG_","").replace("__","")||e.className.replace("__MSG_","").replace("__","");t&&(t=chrome.i18n.getMessage(t))&&(e.textContent=t)}),document.querySelectorAll("h1, h2, p, button, span").forEach(e=>{for(var t of e.childNodes){var n;t.nodeType===Node.TEXT_NODE&&(n=t.textContent.trim().match(/^__MSG_(\w+)__$/))&&(n=chrome.i18n.getMessage(n[1]))&&(t.textContent=n)}}),document.documentElement.lang=chrome.i18n.getMessage("htmlLang")||"en",document.title=chrome.i18n.getMessage("title")||document.title}document.addEventListener("DOMContentLoaded",()=>{i18nReplace();let e=document.querySelectorAll(".step-indicator"),t=document.querySelectorAll(".step-content"),s=document.getElementById("prev-btn"),o=document.getElementById("next-btn");var n=document.getElementById("skip-btn"),a=document.getElementById("example-btn");let i=1,c=t.length,r=Date.now(),d=[1];function l(n){e.forEach(e=>{e.classList.toggle("active",parseInt(e.dataset.step)===n)}),t.forEach((e,t)=>{e.classList.toggle("active",t+1===n)}),s.disabled=1===n,o.textContent=n===c?chrome.i18n.getMessage("finish")||"Finalizar":chrome.i18n.getMessage("next")||"Siguiente",d.includes(n)||d.push(n),i=n}function m(e){chrome.storage.local.set({onboardingCompleted:!0,onboardingMetrics:{completed:e,duration:Date.now()-r,stepsViewed:d}},()=>{window.close()})}s.addEventListener("click",()=>{1<i&&l(i-1)}),o.addEventListener("click",()=>{i<c?l(i+1):m(!0)}),e.forEach(e=>{e.addEventListener("click",()=>{l(parseInt(e.dataset.step))})}),n.addEventListener("click",()=>{m(!1)}),a.addEventListener("click",()=>{chrome.storage.local.set({tempScriptContent:`// ==UserScript==
// @name         Mi Primer Script
// @namespace    zedmonkey
// @version      1.0
// @description  Un script de ejemplo para Zedmonkey
// @author       Usuario de Zedmonkey
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Crear un elemento de mensaje
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'fixed';
    messageDiv.style.bottom = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.backgroundColor = '#3498db';
    messageDiv.style.color = 'white';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    messageDiv.textContent = '¡Hola desde Zedmonkey! Este es un script de ejemplo.';
    
    // Añadir al documento
    document.body.appendChild(messageDiv);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
        messageDiv.style.transition = 'opacity 0.5s';
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 500);
    }, 5000);
})();`},()=>{chrome.tabs.create({url:chrome.runtime.getURL("editor/editor.html?loadTemp=true")})})}),l(1)});
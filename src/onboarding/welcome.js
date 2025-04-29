document.addEventListener("DOMContentLoaded",()=>{let e=document.querySelectorAll(".step-indicator"),t=document.querySelectorAll(".step-content"),i=document.getElementById("prev-btn"),n=document.getElementById("next-btn");var s=document.getElementById("skip-btn"),o=document.getElementById("example-btn");let a=1,d=t.length,r={startTime:Date.now(),stepsViewed:[1],completed:!1,skipped:!1};function c(s){e.forEach(e=>{e.classList.remove("active"),parseInt(e.dataset.step)===s&&e.classList.add("active")}),t.forEach((e,t)=>{e.classList.remove("active"),t+1===s&&e.classList.add("active")}),i.disabled=1===s,n.textContent=s===d?"Finalizar":"Siguiente",r.stepsViewed.includes(s)||r.stepsViewed.push(s),a=s}function m(e){r.completed=e,r.endTime=Date.now(),r.duration=r.endTime-r.startTime,l(),chrome.storage.local.set({onboardingCompleted:!0},()=>{window.close()})}function l(){chrome.storage.local.get("onboardingMetrics",e=>{e=e.onboardingMetrics||[];e.push(r),chrome.storage.local.set({onboardingMetrics:e})})}i.addEventListener("click",()=>{1<a&&c(a-1)}),n.addEventListener("click",()=>{a<d?c(a+1):m(!0)}),e.forEach(e=>{e.addEventListener("click",()=>{c(parseInt(e.dataset.step))})}),s.addEventListener("click",()=>{m(!(r.skipped=!0))}),o.addEventListener("click",()=>{chrome.storage.local.set({tempScriptContent:`// ==UserScript==
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
})();`},()=>{chrome.tabs.create({url:chrome.runtime.getURL("editor/editor.html?loadTemp=true")}),r.viewedExample=!0,l()})}),c(1)});
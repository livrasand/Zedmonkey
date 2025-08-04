function getScriptId(e){let t=null;var a=(e=encodeURI(e)).match(/[a-zA-Z0-9]/g);return t=a?a.join(""):btoa(e).replace(/[^a-zA-Z0-9]/g,"")}function validateMetadataBlock(t){var a=t.split("\n"),t=a.find(e=>"// ==UserScript=="===e.trim()),e=a.find(e=>"// ==/UserScript=="===e.trim());if(!t||!e)return{valid:!1,errors:["Missing // ==UserScript== or // ==/UserScript== markers"]};var t=a.indexOf(t),r=a.indexOf(e);if(r<=t)return{valid:!1,errors:["Invalid metadata block structure"]};var n=[];for(let e=t+1;e<r;e++){var s=a[e].trim();""!==s&&(s.startsWith("// ")||n.push(`Line ${e+1}: Metadata line must start with '// ' (note the space)`),s.startsWith("// @")&&!s.match(/^\/\/\s@[a-zA-Z0-9_\-]+(?::[a-zA-Z\-_]+)?(?:\s+.*)?$/))&&n.push(`Line ${e+1}: Invalid metadata format`)}return{valid:0===n.length,errors:n}}function getHeader(e){var t,a=e.match(/^\/\/\s*==UserScript==/m),r=e.match(/^\/\/\s*==\/UserScript==/m);return!a||!r||(t=e.indexOf(a[0]),r=e.indexOf(r[0]),-1===t)||-1===r||(a=e.substring(t+a[0].length,r),0<e.indexOf("<html>")&&e.indexOf("<html>")<t)||0<e.indexOf("<body>")&&e.indexOf("<body>")<t?null:a}function processHeader(e){var t,a={id:null,name:null,namespace:"",version:null,description:null,author:null,copyright:null,icon:null,icon64:null,homepage:null,homepageURL:null,website:null,source:null,supportURL:null,updateURL:null,downloadURL:null,includes:[],matches:[],excludes:[],excludeMatches:[],requires:[],resources:[],grants:[],noframes:!1,runAt:"document-end",injectInto:"auto",unwrap:!1,topLevelAwait:!1,meta:{},locales:{}},r=/^@([a-zA-Z0-9_\-]+)(?::([a-zA-Z\-]+))?\s+(.+)$/;for(t of(e=e.replace(/\r/g,"\n").replace(/\n\n+/g,"\n")).split("\n").map(e=>e.replace(/^\/\//,"").trim()).filter(Boolean)){var n=t.match(r);if(n){var[,s,n,c]=n;if(n)a.locales[n]=a.locales[n]||{},a.locales[n][s]=c;else switch(s){case"name":case"namespace":case"version":case"description":case"author":case"copyright":a[s]=c;break;case"homepage":case"homepageURL":case"website":case"source":a.homepage=c,a[s]=c;break;case"supportURL":a.supportURL=c;break;case"updateURL":a.updateURL=c;break;case"downloadURL":a.downloadURL=c;break;case"icon":case"iconURL":case"defaulticon":a.icon=c;break;case"icon64":case"icon64URL":a.icon64=c;break;case"include":a.includes.push(c);break;case"match":a.matches.push(c);break;case"exclude":a.excludes.push(c);break;case"exclude-match":a.excludeMatches.push(c);break;case"require":a.requires.push({url:c,loaded:!1,textContent:null});break;case"resource":var o=c.split(/\s+/),l=o[0],o=o.slice(1).join(" ");l&&o&&a.resources.push({name:l,url:o,loaded:!1,resText:null,resURL:null});break;case"grant":a.grants.push(c);break;case"run-at":l=["document-start","document-body","document-end","document-idle"];a.runAt=l.includes(c)?c:"document-end";break;case"inject-into":o=["page","content","auto"];a.injectInto=o.includes(c)?c:"auto";break;case"noframes":a.noframes=!0;break;case"unwrap":a.unwrap=!0;break;case"top-level-await":a.topLevelAwait=!0;break;default:a.meta[s]=c}}}return a.name=a.name||a.locales.en?.name||"Untitled Script",a.id=getScriptId(a.name),a.version=a.version||"0.0",a.includes=a.includes.length?a.includes:["*"],a.matches=a.matches.length?a.matches:[],a.excludes=a.excludes.length?a.excludes:[],a}function parseUserscriptMetadata(e){var t,a=getHeader(e);return a?((t=processHeader(a)).textContent=e,t.header=a,t.GM_info={script:{name:t.name,description:t.description,version:t.version,namespace:t.namespace,includes:t.includes,matches:t.matches,excludes:t.excludes,resources:t.resources,requires:t.requires,grants:t.grants,icon:t.icon,icon64:t.icon64,homepage:t.homepage,updateURL:t.updateURL,downloadURL:t.downloadURL,noframes:t.noframes,runAt:t.runAt,locales:t.locales},scriptMetaStr:a,scriptSource:e,scriptHandler:"Zedmonkey"},t):null}async function fetchAndStoreResources(e){for(var t of e.requires)try{var a=await fetch(t.url);t.textContent=await a.text(),t.loaded=!0}catch(e){t.loaded=!1,t.textContent=null}for(var r of e.resources)try{var n=await fetch(r.url);try{r.resText=await n.text()}catch{let a=await n.blob();r.resText=await new Promise(e=>{let t=new FileReader;t.onload=()=>e(t.result),t.readAsDataURL(a)})}r.resURL=r.url,r.loaded=!0}catch(e){r.loaded=!1,r.resText=null,r.resURL=null}}function validateVersion(e){return!!e&&/^\d+(?:\.\d+)*(?:[a-zA-Z]+\d*)*$/.test(e)}function getLocalizedValue(e,t,a="en"){if(e[t])return e[t];if(e.locales[a]&&e.locales[a][t])return e.locales[a][t];for(var r in e.locales)if(e.locales[r][t])return e.locales[r][t];return null}function normalizeMatchPattern(e){return!e.includes("*://")&&e.startsWith("http*://")?e.replace("http*://","*://"):e}function requiresPrivileges(e){if(!e.grants||0===e.grants.length)return!1;let t=["GM_setValue","GM_getValue","GM_deleteValue","GM_listValues","GM_xmlhttpRequest","GM_download","GM_openInTab","GM_notification","GM_setClipboard","GM_getResourceText","GM_getResourceURL","GM_registerMenuCommand","GM_unregisterMenuCommand","GM.setValue","GM.getValue","GM.deleteValue","GM.listValues","GM.xmlHttpRequest","GM.download","GM.openInTab","GM.notification","GM.setClipboard","GM.getResourceText","GM.getResourceUrl","GM.registerMenuCommand","GM.unregisterMenuCommand","window.close","window.focus"];return e.grants.some(e=>t.includes(e))}function createTestScript(){return`// ==UserScript==
// @name         Test Script
// @namespace    https://zedmonkey.dev/
// @version      1.0.0
// @description  Script de prueba para Zedmonkey
// @description:es  Script de prueba para Zedmonkey en español
// @author       Zedmonkey Team
// @match        *://example.com/*
// @exclude      *://example.com/admin/*
// @icon         https://example.com/icon.png
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.notification
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @resource     CSS https://example.com/style.css
// @run-at       document-end
// @inject-into  auto
// @supportURL   https://zedmonkey.dev/support
// @homepageURL  https://zedmonkey.dev/
// @downloadURL  https://zedmonkey.dev/scripts/test.user.js
// @updateURL    https://zedmonkey.dev/scripts/test.meta.js
// ==/UserScript==

(function() {
    'use strict';
    
    GM.notification({
        text: '¡Hola desde Zedmonkey! Este es un script de ejemplo.',
        title: 'Test Script',
        timeout: 3000
    });
    
    console.log('Script de prueba ejecutado correctamente');
})();`}export{getScriptId,validateMetadataBlock,validateVersion,getLocalizedValue,normalizeMatchPattern,requiresPrivileges,createTestScript,parseUserscriptMetadata,fetchAndStoreResources};
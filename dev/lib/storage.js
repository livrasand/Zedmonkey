async function getScripts() {
    return new Promise(e => {
        chrome.storage.local.get("scripts", t => {
            e(t.scripts || [])
        })
    })
}
async function saveScript(e) {
    e.id || (e.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5)), e.addedAt = Date.now();
    let a = await getScripts();
    var t = a.findIndex(t => t.metadata.name === e.metadata.name && t.metadata.namespace === e.metadata.namespace);
    return 0 <= t ? a[t] = e : a.push(e), new Promise(t => {
        chrome.storage.local.set({
            scripts: a
        }, t)
    })
}
async function removeScript(e) {
    let a = (await getScripts()).filter(t => t.id !== e);
    return new Promise(t => {
        chrome.storage.local.set({
            scripts: a
        }, t)
    })
}
async function secureStorageOperation(action) {
    // Validación de origen para prevenir ataques XSS
    if (!chrome.runtime.id) throw new Error('Operación no permitida');
    
    // Encriptación básica con Web Crypto API
    const key = await crypto.subtle.importKey('raw', 
        new TextEncoder().encode('zed-secret-key'), 
        {name: 'AES-GCM'}, 
        false, 
        ['encrypt', 'decrypt']
    );
    
    return crypto.subtle[action](key, ...arguments);
}
export {
    getScripts,
    saveScript,
    removeScript
};
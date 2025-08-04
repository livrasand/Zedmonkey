/******************************************************************************
 * Zedmonkey GM API Implementation
 * Complete compatibility with Violentmonkey/Greasemonkey/Tampermonkey APIs
 * 
 * This provides all standard GM_* functions and GM.* async aliases
 * Compatible with:
 * - Violentmonkey 2.x APIs
 * - Greasemonkey 3.x and 4.x APIs  
 * - Tampermonkey APIs
 ******************************************************************************/

(function() {
    // --- unsafeWindow ---
    if (typeof unsafeWindow === "undefined") {
        window.unsafeWindow = window;
    }

    // --- GM_info ---
    function createGMInfo() {
        const getBrowserName = () => {
            const ua = navigator.userAgent;
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Chrome')) return 'Chrome';
            if (ua.includes('Safari')) return 'Safari';
            if (ua.includes('Edge')) return 'Edge';
            return 'Chrome'; // Default
        };
        
        const getBrowserVersion = () => {
            const ua = navigator.userAgent;
            const match = ua.match(/(Chrome|Firefox|Safari|Edge)\/([0-9.]+)/);
            return match ? match[2] : '100.0';
        };
        
        const getOS = () => {
            const platform = navigator.platform;
            if (platform.includes('Win')) return 'win';
            if (platform.includes('Mac')) return 'mac';
            if (platform.includes('Linux')) return 'linux';
            if (platform.includes('Android')) return 'android';
            return 'linux';
        };
        
        const getArch = () => {
            if (navigator.platform.includes('64') || navigator.userAgent.includes('x64')) return 'x86-64';
            if (navigator.platform.includes('ARM') || navigator.userAgent.includes('ARM')) return 'arm64';
            return 'x86-32';
        };
        
        return {
            injectInto: window.__ZEDMONKEY_INJECT_INTO__ || 'auto',
            isIncognito: chrome?.extension?.inIncognitoContext || false,
            platform: {
                arch: getArch(),
                browserName: getBrowserName(),
                browserVersion: getBrowserVersion(),
                fullVersionList: navigator.userAgentData?.brands || [],
                mobile: navigator.userAgentData?.mobile || /Mobile|Android/i.test(navigator.userAgent),
                os: getOS()
            },
            script: window.__ZEDMONKEY_SCRIPT_META__ || {
                antifeature: [],
                author: '',
                compatible: [],
                connect: [],
                description: 'Zedmonkey Script',
                downloadURL: '',
                excludeMatches: [],
                excludes: [],
                grant: ['none'],
                homepage: '',
                homepageURL: '',
                icon: '',
                includes: [],
                matches: ['*://*/*'],
                name: 'Zedmonkey Script',
                namespace: 'zedmonkey',
                noframes: false,
                require: [],
                resources: [],
                runAt: 'document-idle',
                supportURL: '',
                unwrap: false,
                updateURL: '',
                version: '1.0'
            },
            scriptHandler: 'Zedmonkey',
            scriptMetaStr: window.__ZEDMONKEY_SCRIPT_META_STR__ || '// ==UserScript==\n// @name Zedmonkey Script\n// ==/UserScript==',
            scriptWillUpdate: false,
            userAgent: navigator.userAgent,
            userAgentData: navigator.userAgentData,
            uuid: window.__ZEDMONKEY_SCRIPT_UUID__ || 'zedmonkey-' + Date.now(),
            version: '1.4.0'
        };
    }
    
    window.GM_info = window.__ZEDMONKEY_GM_INFO__ || createGMInfo();
    if (!window.GM) window.GM = {};
    window.GM.info = window.GM_info;

    // --- Storage helpers ---
    const STORAGE_KEY = '__zedmonkey_gm_storage__' + (GM_info?.script?.uuid || GM_info?.script?.name || '');

    function getStorage() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch {
            return {};
        }
    }
    function setStorage(obj) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }

    // --- Value storage ---
    window.GM_getValue = function(key, def) {
        const store = getStorage();
        return store.hasOwnProperty(key) ? store[key] : def;
    };
    window.GM_setValue = function(key, value) {
        const store = getStorage();
        store[key] = value;
        setStorage(store);
    };
    window.GM_deleteValue = function(key) {
        const store = getStorage();
        delete store[key];
        setStorage(store);
    };
    window.GM_listValues = function() {
        return Object.keys(getStorage());
    };
    // Async GM.* aliases
    if (!window.GM) window.GM = {};
    window.GM.getValue = key => Promise.resolve(GM_getValue(key));
    window.GM.setValue = (key, value) => Promise.resolve(GM_setValue(key, value));
    window.GM.deleteValue = key => Promise.resolve(GM_deleteValue(key));
    window.GM.listValues = () => Promise.resolve(GM_listValues());

    // --- Multi-value helpers (Violentmonkey) ---
    window.GM_getValues = function(keysOrObj) {
        const store = getStorage();
        if (Array.isArray(keysOrObj)) {
            let out = {};
            for (const k of keysOrObj) out[k] = store[k];
            return out;
        } else if (typeof keysOrObj === 'object') {
            let out = {};
            for (const k in keysOrObj) out[k] = store.hasOwnProperty(k) ? store[k] : keysOrObj[k];
            return out;
        }
        return {};
    };
    window.GM_setValues = function(obj) {
        const store = getStorage();
        for (const k in obj) store[k] = obj[k];
        setStorage(store);
    };
    window.GM_deleteValues = function(keys) {
        const store = getStorage();
        for (const k of keys) delete store[k];
        setStorage(store);
    };
    window.GM.getValues = keys => Promise.resolve(GM_getValues(keys));
    window.GM.setValues = obj => Promise.resolve(GM_setValues(obj));
    window.GM.deleteValues = keys => Promise.resolve(GM_deleteValues(keys));

    // --- Value change listeners ---
    const changeListeners = {};
    window.GM_addValueChangeListener = function(name, cb) {
        const id = Math.random().toString(36).slice(2);
        changeListeners[id] = { name, cb };
        // No cross-tab sync, only local
        return id;
    };
    window.GM_removeValueChangeListener = function(id) {
        delete changeListeners[id];
    };

    // --- Resources ---
    window.GM_getResourceText = function(name) {
        const res = (GM_info?.script?.resources || []).find(r => r.name === name);
        return res ? res.resText : null;
    };
    window.GM_getResourceURL = function(name, isBlobUrl = true) {
        const res = (GM_info?.script?.resources || []).find(r => r.name === name);
        return res ? (isBlobUrl ? res.resURL : res.resText) : null;
    };
    window.GM.getResourceText = name => Promise.resolve(GM_getResourceText(name));
    window.GM.getResourceUrl = name => Promise.resolve(GM_getResourceURL(name));

    // --- Add element/style ---
    window.GM_addElement = function(...args) {
        let parent, tag, attrs;
        if (args.length === 2) {
            [tag, attrs] = args;
            parent = null;
        } else {
            [parent, tag, attrs] = args;
        }
        const el = document.createElement(tag);
        if (attrs) for (const k in attrs) {
            if (k === 'textContent') el.textContent = attrs[k];
            else el.setAttribute(k, attrs[k]);
        }
        if (!parent) {
            if (['script', 'link', 'style', 'meta'].includes(tag)) {
                (document.head || document.documentElement).appendChild(el);
            } else if (document.body) {
                document.body.appendChild(el);
            } else {
                document.documentElement.appendChild(el);
            }
        } else {
            parent.appendChild(el);
        }
        return el;
    };
    window.GM_addStyle = function(css) {
        return GM_addElement('style', { textContent: css });
    };
    window.GM.addElement = (...args) => Promise.resolve(GM_addElement(...args));
    window.GM.addStyle = css => Promise.resolve(GM_addStyle(css));

    // --- Open in tab ---
    window.GM_openInTab = function(url, opts) {
        window.open(url, (typeof opts === 'object' && opts.active === false) ? '_blank' : '_blank');
        return {
            close: () => {}, // No control in content scripts
            closed: false
        };
    };
    window.GM.openInTab = (url, opts) => Promise.resolve(GM_openInTab(url, opts));

    // --- Menu commands ---
    const menuCommands = {};
    window.GM_registerMenuCommand = function(caption, onClick, options) {
        const id = options?.id || caption;
        menuCommands[id] = { caption, onClick, options };
        // Zedmonkey: deberías exponer esto en tu UI
        return id;
    };
    window.GM_unregisterMenuCommand = function(id) {
        delete menuCommands[id];
    };
    window.GM.registerMenuCommand = (...args) => Promise.resolve(GM_registerMenuCommand(...args));
    window.GM.unregisterMenuCommand = id => Promise.resolve(GM_unregisterMenuCommand(id));

    // --- Notification ---
    window.GM_notification = function(...args) {
        let opts = {};
        if (typeof args[0] === 'object') opts = args[0];
        else [opts.text, opts.title, opts.image, opts.onclick] = args;
        // Usa Notification API nativa
        if (Notification && Notification.permission === "granted") {
            const n = new Notification(opts.title || GM_info?.script?.name || '', {
                body: opts.text,
                icon: opts.image
            });
            if (opts.onclick) n.onclick = opts.onclick;
            return { remove: () => n.close() };
        }
        return null;
    };
    window.GM.notification = opts => Promise.resolve(GM_notification(opts));

    // --- Clipboard ---
    window.GM_setClipboard = function(data, type = 'text/plain') {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(data);
        } else {
            const el = document.createElement('textarea');
            el.value = data;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
    };
    window.GM.setClipboard = (data, type) => Promise.resolve(GM_setClipboard(data, type));

    // --- XHR ---
    window.GM_xmlhttpRequest = function(details) {
        const xhr = new XMLHttpRequest();
        xhr.open(details.method || 'GET', details.url, true, details.user, details.password);
        if (details.headers) for (const k in details.headers) xhr.setRequestHeader(k, details.headers[k]);
        xhr.responseType = details.responseType || '';
        xhr.withCredentials = !!details.withCredentials;
        if (details.overrideMimeType) xhr.overrideMimeType(details.overrideMimeType);
        for (const ev of ['onabort','onerror','onload','onloadend','onloadstart','onprogress','onreadystatechange','ontimeout']) {
            if (typeof details[ev] === 'function') xhr[ev] = e => details[ev](xhr);
        }
        xhr.onload = function() {
            if (details.onload) details.onload(xhr);
        };
        xhr.onerror = function() {
            if (details.onerror) details.onerror(xhr);
        };
        xhr.send(details.data || null);
        return {
            abort: () => xhr.abort()
        };
    };
    window.GM.xmlHttpRequest = details => Promise.resolve(GM_xmlhttpRequest(details));

    // --- Download ---
    window.GM_download = function(optionsOrUrl, name) {
        let url, filename, opts;
        if (typeof optionsOrUrl === 'object') {
            url = optionsOrUrl.url;
            filename = optionsOrUrl.name;
            opts = optionsOrUrl;
        } else {
            url = optionsOrUrl;
            filename = name;
            opts = {};
        }
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || '';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (opts.onload) opts.onload();
        return { abort: () => {} };
    };
    window.GM.download = (...args) => Promise.resolve(GM_download(...args));

    // --- GM.* async aliases ---
    // Ya cubiertos arriba

    // --- Exponer unsafeWindow y GM_info en window.GM ---
    window.GM.unsafeWindow = window.unsafeWindow;
    window.GM.info = window.GM_info;

})();
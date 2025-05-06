// Implementación básica de compatibilidad GM_* para Zedmonkey
// Esta implementación provee funciones para emular las APIs de Violentmonkey a nivel
// de userscripts, usando las capacidades de chrome.storage, chrome.tabs, chrome.notifications, etc.
// NOTA: Algunas funciones se implementan de forma simplificada y pueden requerir ajustes.

(function() {
    if (typeof window.GM === 'undefined') {
        window.GM = {
            // Funciones de almacenamiento usando chrome.storage.local
            getValue: (key, defaultValue) => {
                return new Promise(resolve => {
                    chrome.storage.local.get(key, result => {
                        resolve(result[key] === undefined ? defaultValue : result[key]);
                    });
                });
            },
            setValue: (key, value) => {
                return new Promise(resolve => {
                    let obj = {};
                    obj[key] = value;
                    chrome.storage.local.set(obj, resolve);
                });
            },
            deleteValue: (key) => {
                return new Promise(resolve => {
                    chrome.storage.local.remove(key, resolve);
                });
            },
            listValues: () => {
                return new Promise(resolve => {
                    chrome.storage.local.get(null, result => {
                        resolve(Object.keys(result));
                    });
                });
            },
            // Wrapper sencillo para XMLHttpRequest usando fetch
            xmlHttpRequest: (details) => {
                const controller = new AbortController();
                const signal = controller.signal;
                let fetchOptions = {
                    method: details.method || 'GET',
                    headers: details.headers,
                    body: details.data,
                    signal: signal
                };
                fetch(details.url, fetchOptions)
                  .then(async response => {
                      let responseText = await response.text();
                      if (typeof details.onload === 'function') {
                          details.onload({
                              status: response.status,
                              statusText: response.statusText,
                              responseText: responseText,
                              response: responseText,
                              finalUrl: response.url
                          });
                      }
                  })
                  .catch(error => {
                      if (typeof details.onerror === 'function') {
                          details.onerror(error);
                      }
                  });
                return {
                    abort: () => controller.abort()
                };
            },
            // Inyecta un bloque de CSS en el documento
            addStyle: (css) => {
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
                return style;
            },
            // Agrega un elemento al DOM
            addElement: (parent, tagName, attributes) => {
                if (typeof parent === 'string') {
                    attributes = tagName;
                    tagName = parent;
                    parent = document.head;
                }
                const el = document.createElement(tagName);
                if (attributes) {
                    for (const key in attributes) {
                        el.setAttribute(key, attributes[key]);
                    }
                }
                (parent || document.head).appendChild(el);
                return el;
            },
            // Abre una URL en una nueva pestaña
            openInTab: (url, options = {}) => {
                let createProperties = {
                    url: url,
                    active: options.active !== undefined ? options.active : true
                };
                chrome.tabs.create(createProperties, tab => {
                    // Se podría devolver un objeto de control adicional
                });
                return {
                    close: () => {
                        console.warn('Cerrar pestañas abiertas no es soportado');
                    }
                };
            },
            // Muestra una notificación usando chrome.notifications
            notification: (options) => {
                const notifOptions = {
                    type: 'basic',
                    iconUrl: options.image || 'icons/icon48.png',
                    title: options.title || '',
                    message: options.text || ''
                };
                chrome.notifications.create('', notifOptions, notifId => {
                    if (options.onclick) {
                        chrome.notifications.onClicked.addListener(function handler(id) {
                            if (id === notifId) {
                                options.onclick();
                                chrome.notifications.onClicked.removeListener(handler);
                            }
                        });
                    }
                    if (options.ondone) {
                        chrome.notifications.onClosed.addListener(function handler(id, byUser) {
                            if (id === notifId) {
                                options.ondone();
                                chrome.notifications.onClosed.removeListener(handler);
                            }
                        });
                    }
                });
            },
            // Copia datos al portapapeles (utiliza un método basado en execCommand)
            setClipboard: (data, type = 'text/plain') => {
                const textarea = document.createElement('textarea');
                textarea.value = data;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                } catch (e) {
                    console.error('GM_setClipboard failed:', e);
                }
                document.body.removeChild(textarea);
            },
            // Registra un comando en el menú (se simplifica a un log)
            registerMenuCommand: (caption, onClick, options = {}) => {
                console.log('Registro de comando de menú:', caption);
                // Opcional: se puede implementar utilizando chrome.contextMenus
                return caption; // Se retorna el id (en este caso el mismo caption)
            },
            unregisterMenuCommand: (captionOrId) => {
                console.log('Anulación de comando de menú:', captionOrId);
            },
            // Funciones no implementadas (placeholders)
            getResourceText: (name) => {
                console.warn('GM_getResourceText no implementado');
                return '';
            },
            getResourceURL: (name, isBlobUrl = true) => {
                console.warn('GM_getResourceURL no implementado');
                return '';
            },
            addValueChangeListener: (name, callback) => {
                console.warn('GM_addValueChangeListener no implementado');
                return 'dummyListenerId';
            },
            removeValueChangeListener: (listenerId) => {
                console.warn('GM_removeValueChangeListener no implementado');
            },
            // Descarga un archivo usando fetch y Blob
            download: (options) => {
                fetch(options.url)
                    .then(response => response.blob())
                    .then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = options.name;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                        if (options.onload) options.onload();
                    })
                    .catch(error => {
                        if (options.onerror) options.onerror(error);
                    });
                return {
                    abort: () => {
                        console.warn('Abort no soportado en GM_download placeholder');
                    }
                };
            }
        };

        // Provee información del script (ejemplo básico)
        window.GM_info = {
            script: {
                name: "Zedmonkey Script",
                version: "1.0",
                namespace: "zedmonkey",
                match: ["*://*/*"]
            },
            injectInto: "auto",
            isIncognito: false,
            platform: { os: "linux", browserName: "chrome" }
        };

        // Alias para compatibilidad con GM_* tradicionales
        window.GM_getValue = window.GM.getValue;
        window.GM_setValue = window.GM.setValue;
        window.GM_deleteValue = window.GM.deleteValue;
        window.GM_listValues = window.GM.listValues;
        window.GM_xmlhttpRequest = window.GM.xmlHttpRequest;
        window.GM_addStyle = window.GM.addStyle;
        window.GM_addElement = window.GM.addElement;
        window.GM_openInTab = window.GM.openInTab;
        window.GM_notification = window.GM.notification;
        window.GM_setClipboard = window.GM.setClipboard;
        window.GM_registerMenuCommand = window.GM.registerMenuCommand;
        window.GM_unregisterMenuCommand = window.GM.unregisterMenuCommand;
        window.GM_download = window.GM.download;
    }
})();
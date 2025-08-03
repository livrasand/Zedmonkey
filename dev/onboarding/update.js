        // Obtener y mostrar la versión actual de la extensión
        document.addEventListener('DOMContentLoaded', function() {
            const manifest = chrome.runtime.getManifest();
            const versionTag = document.querySelector('.version-tag');
            if (versionTag) {
                versionTag.textContent = 'v' + manifest.version;
            }
        });